import { and, count, desc, eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { writeAuditLog } from "@/core/lib/audit";
import { buildMeta, parsePagination } from "@/core/lib/pagination";
import {
  contractPauses,
  contracts,
  groups,
  invoices,
  invoiceItems,
  membershipTypes,
  tarifPricing,
  tarifs,
  users,
} from "@/core/db/schema";

async function nextContractNumber(db: ReturnType<typeof drizzle>, orgId: string) {
  const rows = await db.select({ count: count() }).from(contracts).where(eq(contracts.orgId, orgId));
  return `V-${String((rows[0]?.count || 0) + 1).padStart(5, "0")}`;
}

async function nextInvoiceNumber(db: ReturnType<typeof drizzle>, orgId: string) {
  const year = new Date().getFullYear();
  const rows = await db.select({ count: count() }).from(invoices).where(eq(invoices.orgId, orgId));
  return `RE-${year}-${String((rows[0]?.count || 0) + 1).padStart(5, "0")}`;
}

async function getTypeName(db: ReturnType<typeof drizzle>, row: typeof contracts.$inferSelect) {
  if (row.membershipTypeId) {
    const typeRows = await db
      .select({ name: membershipTypes.name })
      .from(membershipTypes)
      .where(eq(membershipTypes.id, row.membershipTypeId));
    return typeRows[0]?.name || "";
  }
  if (row.tarifId) {
    const tarifRows = await db.select({ name: tarifs.name }).from(tarifs).where(eq(tarifs.id, row.tarifId));
    return tarifRows[0]?.name || "";
  }
  return "";
}

async function getGroupName(db: ReturnType<typeof drizzle>, groupId: string | null) {
  if (!groupId) return "";
  const rows = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, groupId));
  return rows[0]?.name || "";
}

export async function listContractsUseCase(env: RouteEnv, orgId: string, query: Record<string, string | undefined>) {
  const db = drizzle(env.DB);
  const { page, perPage, offset } = parsePagination(query);
  const conditions = [eq(contracts.orgId, orgId)];

  if (query.status) conditions.push(eq(contracts.status, query.status));
  if (query.contract_kind) conditions.push(eq(contracts.contractKind, query.contract_kind));
  if (query.member_id) conditions.push(eq(contracts.memberId, query.member_id));
  if (query.group_id) conditions.push(eq(contracts.groupId, query.group_id));
  if (query.search) conditions.push(like(contracts.contractNumber, `%${query.search}%`));

  const whereClause = and(...conditions);
  const totalRows = await db.select({ count: count() }).from(contracts).where(whereClause);
  const rows = await db
    .select()
    .from(contracts)
    .where(whereClause)
    .orderBy(desc(contracts.createdAt))
    .limit(perPage)
    .offset(offset);

  const data = await Promise.all(rows.map(async (row) => {
    const [memberRows, typeName, groupName] = await Promise.all([
      db
        .select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
        .from(users)
        .where(eq(users.id, row.memberId)),
      getTypeName(db, row),
      getGroupName(db, row.groupId),
    ]);

    const member = memberRows[0];
    return {
      id: row.id,
      contractNumber: row.contractNumber,
      memberId: row.memberId,
      memberName: member ? `${member.firstName} ${member.lastName}` : "",
      memberEmail: member?.email || "",
      memberInitials: member ? `${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`.toUpperCase() : "",
      contractKind: row.contractKind,
      typeName,
      groupId: row.groupId,
      groupName,
      status: row.status,
      startDate: row.startDate,
      endDate: row.endDate,
      currentPrice: row.currentPrice,
      billingPeriod: row.billingPeriod,
      autoRenew: row.autoRenew,
      cancellationDate: row.cancellationDate,
      cancellationEffectiveDate: row.cancellationEffectiveDate,
      createdAt: row.createdAt || "",
    };
  }));

  return { data, meta: buildMeta(totalRows[0]?.count || 0, page, perPage) };
}

export async function getContractDetailUseCase(env: RouteEnv, input: { orgId: string; contractId: string }) {
  const db = drizzle(env.DB);
  const rows = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, input.contractId), eq(contracts.orgId, input.orgId)));
  const contract = rows[0];
  if (!contract) return null;

  const [memberRows, pauses, contractInvoices, children, typeName, groupName, createdByRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, contract.memberId)),
    db.select().from(contractPauses).where(eq(contractPauses.contractId, input.contractId)).orderBy(desc(contractPauses.pauseFrom)),
    db
      .select()
      .from(invoices)
      .where(and(eq(invoices.contractId, input.contractId), eq(invoices.orgId, input.orgId)))
      .orderBy(desc(invoices.createdAt)),
    db
      .select()
      .from(contracts)
      .where(and(eq(contracts.parentContractId, input.contractId), eq(contracts.orgId, input.orgId))),
    getTypeName(db, contract),
    getGroupName(db, contract.groupId),
    contract.createdBy
      ? db
          .select({ firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, contract.createdBy))
      : Promise.resolve([]),
  ]);

  return {
    ...contract,
    typeName,
    groupName,
    createdByName: createdByRows[0] ? `${createdByRows[0].firstName} ${createdByRows[0].lastName}` : "",
    member: memberRows[0]
      ? {
          id: memberRows[0].id,
          firstName: memberRows[0].firstName,
          lastName: memberRows[0].lastName,
          email: memberRows[0].email,
          phone: memberRows[0].phone,
          mobile: memberRows[0].mobile,
          street: memberRows[0].street,
          zip: memberRows[0].zip,
          city: memberRows[0].city,
        }
      : null,
    pauses,
    invoices: contractInvoices,
    children,
  };
}

export async function createContractUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    actorUserId: string;
    payload: Record<string, unknown>;
  },
) {
  const db = drizzle(env.DB);
  const contractKind = String(input.payload.contract_kind || "");
  const contractNumber = await nextContractNumber(db, input.orgId);

  let defaults: Record<string, unknown> = {};
  if (contractKind === "MEMBERSHIP" && input.payload.membership_type_id) {
    const rows = await db.select().from(membershipTypes).where(eq(membershipTypes.id, String(input.payload.membership_type_id)));
    defaults = rows[0] || {};
  } else if (contractKind === "TARIF" && input.payload.tarif_id) {
    const rows = await db.select().from(tarifs).where(eq(tarifs.id, String(input.payload.tarif_id)));
    defaults = rows[0] || {};
  }

  let price = Number(input.payload.current_price ?? 0);
  if (!price && defaults["id"]) {
    const pricingRows = await db
      .select()
      .from(tarifPricing)
      .where(and(
        eq(tarifPricing.parentId, String(defaults["id"])),
        eq(tarifPricing.parentType, contractKind === "MEMBERSHIP" ? "MEMBERSHIP_TYPE" : "TARIF"),
        eq(tarifPricing.billingPeriod, String(input.payload.billing_period || "MONTHLY")),
      ));
    price = pricingRows[0]?.price || 0;
  }

  let endDate = input.payload.end_date ? String(input.payload.end_date) : null;
  if (!endDate && defaults["contractDurationMonths"]) {
    const startDate = new Date(String(input.payload.start_date));
    startDate.setMonth(startDate.getMonth() + Number(defaults["contractDurationMonths"]));
    endDate = startDate.toISOString().slice(0, 10);
  }

  const created = await db.insert(contracts).values({
    orgId: input.orgId,
    contractNumber,
    memberId: String(input.payload.member_id || ""),
    contractKind: contractKind as "MEMBERSHIP" | "TARIF",
    membershipTypeId: input.payload.membership_type_id ? String(input.payload.membership_type_id) : null,
    tarifId: input.payload.tarif_id ? String(input.payload.tarif_id) : null,
    parentContractId: input.payload.parent_contract_id ? String(input.payload.parent_contract_id) : null,
    groupId: input.payload.group_id ? String(input.payload.group_id) : defaults["defaultGroupId"] ? String(defaults["defaultGroupId"]) : null,
    status: "ACTIVE",
    startDate: String(input.payload.start_date || ""),
    endDate,
    billingPeriod: String(input.payload.billing_period || "MONTHLY"),
    currentPrice: price,
    autoRenew:
      input.payload.auto_renew === true
      || defaults["contractType"] === "AUTO_RENEW"
      || defaults["contractType"] === "FIXED_RENEW"
        ? 1
        : 0,
    renewalDurationMonths: defaults["renewalDurationMonths"] ? Number(defaults["renewalDurationMonths"]) : null,
    cancellationNoticeDays: defaults["cancellationNoticeDays"] ? Number(defaults["cancellationNoticeDays"]) : 30,
    cancellationNoticeBasis: defaults["cancellationNoticeBasis"] ? String(defaults["cancellationNoticeBasis"]) : "FROM_CANCELLATION",
    renewalCancellationDays: defaults["renewalCancellationDays"] ? Number(defaults["renewalCancellationDays"]) : null,
    notes: input.payload.notes ? String(input.payload.notes) : null,
    createdBy: input.actorUserId,
  }).returning();

  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Vertrag ${contractNumber} erstellt`, "contract", created[0].id);
  return created[0];
}

export async function cancelContractUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; contractId: string; cancellationDate: string },
) {
  const db = drizzle(env.DB);
  const rows = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, input.contractId), eq(contracts.orgId, input.orgId)));
  const contract = rows[0];
  if (!contract) throw new Error("Vertrag nicht gefunden");
  if (contract.status !== "ACTIVE") throw new Error("Nur aktive Verträge können gekündigt werden");

  const cancellationDate = new Date(input.cancellationDate);
  let effectiveDate = new Date(cancellationDate);
  if (contract.cancellationNoticeBasis === "BEFORE_END_OF_PERIOD" && contract.endDate) {
    const endDate = new Date(contract.endDate);
    const noticeDeadline = new Date(endDate);
    noticeDeadline.setMonth(noticeDeadline.getMonth() - (contract.cancellationNoticeDays || 1));
    if (cancellationDate <= noticeDeadline) {
      effectiveDate = endDate;
    } else {
      const nextEnd = new Date(endDate);
      nextEnd.setMonth(nextEnd.getMonth() + (contract.renewalDurationMonths || 12));
      effectiveDate = nextEnd;
    }
  } else {
    effectiveDate.setMonth(effectiveDate.getMonth() + (contract.cancellationNoticeDays || 1));
  }

  await db.update(contracts).set({
    cancellationDate: input.cancellationDate,
    cancellationEffectiveDate: effectiveDate.toISOString().slice(0, 10),
    autoRenew: 0,
    updatedAt: new Date().toISOString(),
  }).where(eq(contracts.id, input.contractId));

  await writeAuditLog(
    env.DB,
    input.orgId,
    input.actorUserId,
    `Vertrag ${contract.contractNumber} gekündigt zum ${effectiveDate.toLocaleDateString("de-DE")}`,
    "contract",
    input.contractId,
  );
}

export async function pauseContractUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    actorUserId: string;
    contractId: string;
    pauseFrom: string;
    pauseUntil: string;
    reason?: string;
  },
) {
  const db = drizzle(env.DB);
  const rows = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, input.contractId), eq(contracts.orgId, input.orgId)));
  const contract = rows[0];
  if (!contract) throw new Error("Vertrag nicht gefunden");
  if (contract.status !== "ACTIVE") throw new Error("Nur aktive Verträge können pausiert werden");

  const existingPauses = await db.select().from(contractPauses).where(eq(contractPauses.contractId, input.contractId));
  const newFrom = new Date(input.pauseFrom);
  const newUntil = new Date(input.pauseUntil);
  for (const pause of existingPauses) {
    const currentFrom = new Date(pause.pauseFrom);
    const currentUntil = new Date(pause.pauseUntil);
    if (newFrom <= currentUntil && newUntil >= currentFrom) {
      throw new Error("Pausenzeitraum überschneidet sich mit einer bestehenden Pause");
    }
  }

  const pauseDays = Math.ceil((newUntil.getTime() - newFrom.getTime()) / (1000 * 60 * 60 * 24));
  const periodDays = contract.billingPeriod === "YEARLY" ? 365 : contract.billingPeriod === "HALF_YEARLY" ? 182 : contract.billingPeriod === "QUARTERLY" ? 91 : 30;
  const creditAmount = Math.round(((pauseDays / periodDays) * (contract.currentPrice || 0)) * 100) / 100;

  await db.insert(contractPauses).values({
    contractId: input.contractId,
    pauseFrom: input.pauseFrom,
    pauseUntil: input.pauseUntil,
    reason: input.reason || null,
    creditAmount,
  });

  await writeAuditLog(
    env.DB,
    input.orgId,
    input.actorUserId,
    `Vertrag ${contract.contractNumber} pausiert ${input.pauseFrom} – ${input.pauseUntil}`,
    "contract",
    input.contractId,
  );
}

export async function deleteContractUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; contractId: string }) {
  const db = drizzle(env.DB);
  const rows = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, input.contractId), eq(contracts.orgId, input.orgId)));
  const contract = rows[0];
  if (!contract) throw new Error("Vertrag nicht gefunden");

  await db.delete(contractPauses).where(eq(contractPauses.contractId, input.contractId));
  await db.delete(contracts).where(eq(contracts.id, input.contractId));
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Vertrag ${contract.contractNumber} gelöscht`, "contract", input.contractId);
}

export async function createContractInvoiceUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; contractId: string },
) {
  const db = drizzle(env.DB);
  const rows = await db
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, input.contractId), eq(contracts.orgId, input.orgId)));
  const contract = rows[0];
  if (!contract) throw new Error("Vertrag nicht gefunden");

  let vatPercent = 0;
  if (contract.membershipTypeId) {
    const typeRows = await db
      .select({ vatPercent: membershipTypes.vatPercent })
      .from(membershipTypes)
      .where(eq(membershipTypes.id, contract.membershipTypeId));
    vatPercent = typeRows[0]?.vatPercent || 0;
  } else if (contract.tarifId) {
    const tarifRows = await db.select({ vatPercent: tarifs.vatPercent }).from(tarifs).where(eq(tarifs.id, contract.tarifId));
    vatPercent = tarifRows[0]?.vatPercent || 0;
  }

  const price = contract.currentPrice || 0;
  const taxAmount = Math.round((price * vatPercent / 100) * 100) / 100;
  const total = Math.round((price + taxAmount) * 100) / 100;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  const invoiceRows = await db.insert(invoices).values({
    orgId: input.orgId,
    userId: contract.memberId,
    invoiceNumber: await nextInvoiceNumber(db, input.orgId),
    type: "invoice",
    status: "draft",
    subtotal: price,
    taxRate: vatPercent,
    taxAmount,
    total,
    dueDate: dueDate.toISOString().slice(0, 10),
    contractId: input.contractId,
  }).returning();

  const periodLabel =
    contract.billingPeriod === "YEARLY" ? "Jahresbeitrag"
    : contract.billingPeriod === "HALF_YEARLY" ? "Halbjahresbeitrag"
    : contract.billingPeriod === "QUARTERLY" ? "Quartalsbeitrag"
    : "Monatsbeitrag";

  await db.insert(invoiceItems).values({
    invoiceId: invoiceRows[0].id,
    description: `${periodLabel} – Vertrag ${contract.contractNumber}`,
    quantity: 1,
    unitPrice: price,
    total: price,
  });

  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Rechnung für Vertrag ${contract.contractNumber} erstellt`, "invoice", invoiceRows[0].id);
  return invoiceRows[0];
}
