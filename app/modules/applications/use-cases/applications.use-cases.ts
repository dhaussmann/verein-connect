import bcrypt from "bcryptjs";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { writeAuditLog } from "@/core/lib/audit";
import {
  contractApplications,
  contractSettings,
  contracts,
  guardians,
  groups,
  membershipTypes,
  organizations,
  profileFieldDefinitions,
  roles,
  tarifs,
  users,
} from "@/core/db/schema";
import { nextFormattedCounter } from "@/core/db/sequences";
import { getHockeyAgeBand, getSuggestedGroupIdsForAgeBand } from "@/modules/hockey/age-band";
import { createMemberUseCase } from "@/modules/members/use-cases/create-member.use-case";

async function nextContractNumber(db: D1Database, orgId: string) {
  return nextFormattedCounter(db, orgId, "contract_number", "V-");
}

export async function getPublicApplicationFormUseCase(env: RouteEnv, input: { orgSlug: string }) {
  const db = drizzle(env.DB);
  const orgRows = await db.select().from(organizations).where(eq(organizations.slug, input.orgSlug));
  const org = orgRows[0];
  if (!org) throw new Error("Verein nicht gefunden");

  const settingsRows = await db.select().from(contractSettings).where(eq(contractSettings.orgId, org.id));
  const settings = settingsRows[0] || null;

  const [membershipTypeRows, tarifRows, groupRows, profileFieldRows] = await Promise.all([
    db.select().from(membershipTypes).where(and(eq(membershipTypes.orgId, org.id), eq(membershipTypes.isActive, 1), eq(membershipTypes.selfRegistrationEnabled, 1))).orderBy(asc(membershipTypes.sortOrder)),
    db.select().from(tarifs).where(and(eq(tarifs.orgId, org.id), eq(tarifs.isActive, 1), eq(tarifs.selfRegistrationEnabled, 1))).orderBy(asc(tarifs.sortOrder)),
    db.select().from(groups).where(and(eq(groups.orgId, org.id), inArray(groups.visibility, ["portal", "public"]), eq(groups.admissionOpen, 1))).orderBy(asc(groups.name)),
    db.select().from(profileFieldDefinitions).where(eq(profileFieldDefinitions.orgId, org.id)).orderBy(asc(profileFieldDefinitions.sortOrder)),
  ]);

  const registrationFields = profileFieldRows
    .filter((field) => field.onRegistrationForm === 1 || field.isVisibleRegistration === 1)
    .map((field) => ({
      id: field.id,
      category: field.category,
      name: field.fieldName,
      label: field.fieldLabel,
      type: field.fieldType,
      options: field.options ? JSON.parse(field.options) : [],
      required: field.isRequired === 1,
    }));

  return {
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      settings: JSON.parse(org.settings || "{}"),
    },
    settings,
    membershipTypes: membershipTypeRows,
    tarifs: tarifRows,
    groups: groupRows,
    profileFields: registrationFields,
  };
}

export async function submitPublicApplicationUseCase(
  env: RouteEnv,
  input: {
    orgSlug: string;
    membershipTypeId?: string | null;
    tarifId?: string | null;
    billingPeriod?: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    dateOfBirth?: string | null;
    additionalData?: Record<string, unknown>;
  },
) {
  const db = drizzle(env.DB);
  const orgRows = await db.select().from(organizations).where(eq(organizations.slug, input.orgSlug));
  const org = orgRows[0];
  if (!org) throw new Error("Verein nicht gefunden");

  const settingsRows = await db.select().from(contractSettings).where(eq(contractSettings.orgId, org.id));
  const settings = settingsRows[0];
  if (!settings || settings.selfRegistrationEnabled !== 1) {
    throw new Error("Selbstregistrierung ist derzeit nicht aktiviert");
  }
  if (!input.membershipTypeId && !input.tarifId) {
    throw new Error("Bitte ein Beitrittsmodell wählen");
  }
  if (input.membershipTypeId) {
    const rows = await db
      .select({ id: membershipTypes.id })
      .from(membershipTypes)
      .where(and(
        eq(membershipTypes.orgId, org.id),
        eq(membershipTypes.id, input.membershipTypeId),
        eq(membershipTypes.isActive, 1),
        eq(membershipTypes.selfRegistrationEnabled, 1),
      ));
    if (!rows[0]) throw new Error("Die gewählte Mitgliedschaft ist nicht verfügbar");
  }
  if (input.tarifId) {
    const rows = await db
      .select({ id: tarifs.id })
      .from(tarifs)
      .where(and(
        eq(tarifs.orgId, org.id),
        eq(tarifs.id, input.tarifId),
        eq(tarifs.isActive, 1),
        eq(tarifs.selfRegistrationEnabled, 1),
      ));
    if (!rows[0]) throw new Error("Der gewählte Tarif ist nicht verfügbar");
  }

  const providedGroupIds = Array.isArray(input.additionalData?.groupIds)
    ? input.additionalData?.groupIds.map(String).filter(Boolean)
    : [];
  const ageBand = getHockeyAgeBand(input.dateOfBirth || null);
  const suggestedGroupRows = providedGroupIds.length === 0 && ageBand
    ? await db
        .select({ id: groups.id, ageBand: groups.ageBand, groupType: groups.groupType })
        .from(groups)
        .where(and(eq(groups.orgId, org.id), inArray(groups.visibility, ["portal", "public"]), eq(groups.admissionOpen, 1)))
    : [];
  const fallbackGroupIds = providedGroupIds.length === 0
    ? getSuggestedGroupIdsForAgeBand(suggestedGroupRows, ageBand)
    : [];
  const additionalData = {
    ...(input.additionalData || {}),
    ageBand,
    groupIds: providedGroupIds.length > 0 ? providedGroupIds : fallbackGroupIds,
    autoAssignedGroupIds: fallbackGroupIds,
  };

  const existingPending = await db
    .select({ id: contractApplications.id })
    .from(contractApplications)
    .where(and(eq(contractApplications.orgId, org.id), eq(contractApplications.email, input.email), eq(contractApplications.status, "PENDING")));
  if (existingPending[0]) {
    throw new Error("Für diese E-Mail-Adresse existiert bereits ein offener Antrag");
  }

  await db.insert(contractApplications).values({
    orgId: org.id,
    membershipTypeId: input.membershipTypeId || null,
    tarifId: input.tarifId || null,
    billingPeriod: input.billingPeriod || null,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone || null,
    address: input.address || null,
    dateOfBirth: input.dateOfBirth || null,
    additionalData: JSON.stringify(additionalData),
    status: "PENDING",
  });
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

  const membershipTypeIds = [...new Set(rows.map((application) => application.membershipTypeId).filter((id): id is string => Boolean(id)))];
  const tarifIds = [...new Set(rows.map((application) => application.tarifId).filter((id): id is string => Boolean(id)))];
  const reviewerIds = [...new Set(rows.map((application) => application.reviewedBy).filter((id): id is string => Boolean(id)))];

  const [types, tarifRows, reviewers] = await Promise.all([
    membershipTypeIds.length > 0
      ? db.select({ id: membershipTypes.id, name: membershipTypes.name }).from(membershipTypes).where(inArray(membershipTypes.id, membershipTypeIds))
      : Promise.resolve([]),
    tarifIds.length > 0
      ? db.select({ id: tarifs.id, name: tarifs.name }).from(tarifs).where(inArray(tarifs.id, tarifIds))
      : Promise.resolve([]),
    reviewerIds.length > 0
      ? db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(inArray(users.id, reviewerIds))
      : Promise.resolve([]),
  ]);

  const typeNames = new Map(types.map((type) => [type.id, type.name]));
  const tarifNames = new Map(tarifRows.map((tarif) => [tarif.id, tarif.name]));
  const reviewerNames = new Map(reviewers.map((reviewer) => [reviewer.id, `${reviewer.firstName} ${reviewer.lastName}`]));

  const data = rows.map((application) => ({
    ...application,
    additionalData: JSON.parse(application.additionalData || "{}"),
    status: application.status || "PENDING",
    typeName: application.tarifId
      ? tarifNames.get(application.tarifId) || ""
      : application.membershipTypeId
        ? typeNames.get(application.membershipTypeId) || ""
        : "",
    reviewerName: application.reviewedBy ? reviewerNames.get(application.reviewedBy) || "" : "",
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
  const additionalData = JSON.parse(application.additionalData || "{}") as Record<string, unknown>;
  const memberRoleRows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.orgId, input.orgId), eq(roles.name, "member")));
  const roleIds = Array.isArray(additionalData.roleIds) ? additionalData.roleIds.map(String) : [];
  if (memberRoleRows[0]?.id && !roleIds.includes(memberRoleRows[0].id)) {
    roleIds.unshift(memberRoleRows[0].id);
  }
  const groupIds = Array.isArray(additionalData.groupIds) ? additionalData.groupIds.map(String) : [];
  const groupMemberRole = typeof additionalData.groupMemberRole === "string" ? additionalData.groupMemberRole : "Mitglied";
  const guardiansData = Array.isArray(additionalData.guardians) ? additionalData.guardians as Array<Record<string, unknown>> : [];
  const rawProfileFields = additionalData.profileFields;
  const profileFields = rawProfileFields && typeof rawProfileFields === "object"
    ? Object.fromEntries(
        Object.entries(rawProfileFields as Record<string, unknown>)
          .filter(([, value]) => value !== null && value !== undefined && value !== "")
          .map(([key, value]) => [key, String(value)]),
      )
    : {};

  const memberId = await createMemberUseCase(env, {
    orgId: input.orgId,
    actorUserId: input.actorUserId,
    firstName: application.firstName,
    lastName: application.lastName,
    email: application.email,
    phone: application.phone || undefined,
    birthDate: application.dateOfBirth || undefined,
    street: application.address || undefined,
    status: "active",
    passwordHash: tempPassword,
    roleIds,
    groupAssignments: groupIds.map((groupId) => ({ groupId, role: groupMemberRole })),
    profileFields,
  });

  for (const guardian of guardiansData) {
    const firstName = String(guardian.firstName || "").trim();
    const lastName = String(guardian.lastName || "").trim();
    if (!firstName || !lastName) continue;
    await db.insert(guardians).values({
      orgId: input.orgId,
      userId: memberId,
      firstName,
      lastName,
      street: String(guardian.street || "") || null,
      zip: String(guardian.zip || "") || null,
      city: String(guardian.city || "") || null,
      phone: String(guardian.phone || "") || null,
      email: String(guardian.email || "") || null,
    });
  }

  let defaults: Record<string, unknown> = {};
  const contractKind = application.membershipTypeId ? "MEMBERSHIP" : "TARIF";
  if (application.membershipTypeId) {
    const types = await db.select().from(membershipTypes).where(eq(membershipTypes.id, application.membershipTypeId));
    defaults = types[0] || {};
  } else if (application.tarifId) {
    const tarifRows = await db.select().from(tarifs).where(eq(tarifs.id, application.tarifId));
    defaults = tarifRows[0] || {};
  }

  const contractNumber = await nextContractNumber(env.DB, input.orgId);
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
    memberId,
    contractKind,
    membershipTypeId: application.membershipTypeId || null,
    tarifId: application.tarifId || null,
    groupId: null,
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
    memberId,
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
