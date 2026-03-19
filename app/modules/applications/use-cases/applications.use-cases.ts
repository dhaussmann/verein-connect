import bcrypt from "bcryptjs";
import { and, count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { writeAuditLog } from "@/core/lib/audit";
import { contractApplications, contracts, membershipTypes, tarifs, users } from "@/core/db/schema";

async function nextContractNumber(db: ReturnType<typeof drizzle>, orgId: string) {
  const rows = await db.select({ count: count() }).from(contracts).where(eq(contracts.orgId, orgId));
  return `V-${String((rows[0]?.count || 0) + 1).padStart(5, "0")}`;
}

export async function listApplicationsUseCase(env: RouteEnv, input: { orgId: string; page?: number; perPage?: number; status?: string }) {
  const db = drizzle(env.DB);
  const page = Math.max(1, input.page || 1);
  const perPage = Math.max(1, input.perPage || 25);
  const offset = (page - 1) * perPage;
  const conditions = [eq(contractApplications.orgId, input.orgId)];
  if (input.status) conditions.push(eq(contractApplications.status, input.status));
  const whereClause = and(...conditions);

  const [totalRows, rows] = await Promise.all([
    db.select({ count: count() }).from(contractApplications).where(whereClause),
    db.select().from(contractApplications).where(whereClause).orderBy(desc(contractApplications.submittedAt)).limit(perPage).offset(offset),
  ]);

  const data = await Promise.all(rows.map(async (application) => {
    let typeName = "";
    if (application.membershipTypeId) {
      const types = await db.select({ name: membershipTypes.name }).from(membershipTypes).where(eq(membershipTypes.id, application.membershipTypeId));
      typeName = types[0]?.name || "";
    }
    if (application.tarifId) {
      const tarifRows = await db.select({ name: tarifs.name }).from(tarifs).where(eq(tarifs.id, application.tarifId));
      typeName = tarifRows[0]?.name || "";
    }

    let reviewerName = "";
    if (application.reviewedBy) {
      const reviewer = await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, application.reviewedBy));
      reviewerName = reviewer[0] ? `${reviewer[0].firstName} ${reviewer[0].lastName}` : "";
    }

    return {
      ...application,
      additionalData: JSON.parse(application.additionalData || "{}"),
      typeName,
      reviewerName,
    };
  }));

  return {
    data,
    meta: {
      total: totalRows[0]?.count || 0,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil((totalRows[0]?.count || 0) / perPage)),
    },
  };
}

export async function acceptApplicationUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; applicationId: string }) {
  const db = drizzle(env.DB);
  const rows = await db
    .select()
    .from(contractApplications)
    .where(and(eq(contractApplications.id, input.applicationId), eq(contractApplications.orgId, input.orgId)));
  const application = rows[0];
  if (!application) throw new Error("Antrag nicht gefunden");
  if (application.status !== "PENDING") throw new Error("Antrag wurde bereits bearbeitet");

  const tempPassword = await bcrypt.hash("Welcome1!", 12);
  const memberNumber = `M-${Date.now().toString(36).toUpperCase()}`;
  const createdUser = await db.insert(users).values({
    orgId: input.orgId,
    email: application.email,
    passwordHash: tempPassword,
    firstName: application.firstName,
    lastName: application.lastName,
    phone: application.phone || null,
    street: application.address || null,
    birthDate: application.dateOfBirth || null,
    status: "active",
    memberNumber,
  }).returning();

  let defaults: Record<string, unknown> = {};
  const contractKind = application.membershipTypeId ? "MEMBERSHIP" : "TARIF";
  if (application.membershipTypeId) {
    const types = await db.select().from(membershipTypes).where(eq(membershipTypes.id, application.membershipTypeId));
    defaults = types[0] || {};
  } else if (application.tarifId) {
    const tarifRows = await db.select().from(tarifs).where(eq(tarifs.id, application.tarifId));
    defaults = tarifRows[0] || {};
  }

  const contractNumber = await nextContractNumber(db, input.orgId);
  const startDate = new Date().toISOString().slice(0, 10);
  let endDate: string | null = null;
  if (typeof defaults["contractDurationMonths"] === "number") {
    const end = new Date();
    end.setMonth(end.getMonth() + Number(defaults["contractDurationMonths"]));
    endDate = end.toISOString().slice(0, 10);
  }

  await db.insert(contracts).values({
    orgId: input.orgId,
    contractNumber,
    memberId: createdUser[0].id,
    contractKind,
    membershipTypeId: application.membershipTypeId || null,
    tarifId: application.tarifId || null,
    groupId: typeof defaults["defaultGroupId"] === "string" ? String(defaults["defaultGroupId"]) : null,
    status: "ACTIVE",
    startDate,
    endDate,
    billingPeriod: application.billingPeriod || "MONTHLY",
    currentPrice: 0,
    autoRenew: defaults["contractType"] === "AUTO_RENEW" || defaults["contractType"] === "FIXED_RENEW" ? 1 : 0,
    renewalDurationMonths: typeof defaults["renewalDurationMonths"] === "number" ? Number(defaults["renewalDurationMonths"]) : null,
    cancellationNoticeDays: typeof defaults["cancellationNoticeDays"] === "number" ? Number(defaults["cancellationNoticeDays"]) : 30,
    cancellationNoticeBasis: typeof defaults["cancellationNoticeBasis"] === "string" ? String(defaults["cancellationNoticeBasis"]) : "FROM_CANCELLATION",
    renewalCancellationDays: typeof defaults["renewalCancellationDays"] === "number" ? Number(defaults["renewalCancellationDays"]) : null,
    createdBy: input.actorUserId,
  });

  await db.update(contractApplications).set({
    status: "ACCEPTED",
    memberId: createdUser[0].id,
    reviewedBy: input.actorUserId,
    reviewedAt: new Date().toISOString(),
  }).where(eq(contractApplications.id, input.applicationId));

  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Antrag von ${application.firstName} ${application.lastName} angenommen – Vertrag ${contractNumber} erstellt`, "contract_application", input.applicationId);
}

export async function rejectApplicationUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; applicationId: string; reviewNotes?: string }) {
  const db = drizzle(env.DB);
  const rows = await db
    .select()
    .from(contractApplications)
    .where(and(eq(contractApplications.id, input.applicationId), eq(contractApplications.orgId, input.orgId)));
  const application = rows[0];
  if (!application) throw new Error("Antrag nicht gefunden");
  if (application.status !== "PENDING") throw new Error("Antrag wurde bereits bearbeitet");

  await db.update(contractApplications).set({
    status: "REJECTED",
    reviewedBy: input.actorUserId,
    reviewedAt: new Date().toISOString(),
    reviewNotes: input.reviewNotes || null,
  }).where(eq(contractApplications.id, input.applicationId));

  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Antrag von ${application.firstName} ${application.lastName} abgelehnt`, "contract_application", input.applicationId);
}
