import { and, asc, count, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { writeAuditLog } from "@/core/lib/audit";
import {
  contractSettings,
  contracts,
  discountGroups,
  groups,
  membershipTypes,
  tarifDiscounts,
  tarifPricing,
  tarifs,
} from "@/core/db/schema";

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapPricingByParentId(rows: Array<typeof tarifPricing.$inferSelect>) {
  const result = new Map<string, typeof tarifPricing.$inferSelect[]>();
  for (const row of rows) {
    const list = result.get(row.parentId) || [];
    list.push(row);
    result.set(row.parentId, list);
  }
  return result;
}

export async function getContractSettingsUseCase(env: RouteEnv, orgId: string) {
  const db = drizzle(env.DB);
  const rows = await db.select().from(contractSettings).where(eq(contractSettings.orgId, orgId));
  return rows[0] || null;
}

export async function saveContractSettingsUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    actorUserId: string;
    invoice_publish_mode?: string;
    days_in_advance?: number;
    price_update_trigger?: string;
    sepa_required?: boolean;
    member_cancellation_allowed?: boolean;
    self_registration_enabled?: boolean;
    self_registration_access?: string;
    welcome_page_text?: string;
    confirmation_page_text?: string;
  },
) {
  const db = drizzle(env.DB);
  const rows = await db.select().from(contractSettings).where(eq(contractSettings.orgId, input.orgId));
  const values = {
    invoicePublishMode: input.invoice_publish_mode || "DRAFT",
    daysInAdvance: input.days_in_advance ?? 14,
    priceUpdateTrigger: input.price_update_trigger || "ON_RENEWAL",
    sepaRequired: input.sepa_required ? 1 : 0,
    memberCancellationAllowed: input.member_cancellation_allowed === false ? 0 : 1,
    selfRegistrationEnabled: input.self_registration_enabled ? 1 : 0,
    selfRegistrationAccess: input.self_registration_access || "LINK_AND_FORM",
    welcomePageText: input.welcome_page_text || null,
    confirmationPageText: input.confirmation_page_text || null,
  };

  if (rows[0]) {
    await db.update(contractSettings).set(values).where(eq(contractSettings.orgId, input.orgId));
  } else {
    await db.insert(contractSettings).values({ orgId: input.orgId, ...values });
  }

  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Vertragseinstellungen aktualisiert", "contract_settings");
}

export async function listMembershipTypesUseCase(env: RouteEnv, orgId: string) {
  const db = drizzle(env.DB);
  const rows = await db.select().from(membershipTypes).where(eq(membershipTypes.orgId, orgId)).orderBy(asc(membershipTypes.sortOrder));
  const pricingRows = rows.length > 0
    ? await db.select().from(tarifPricing).where(and(inArray(tarifPricing.parentId, rows.map((item) => item.id)), eq(tarifPricing.parentType, "MEMBERSHIP_TYPE")))
    : [];
  
  const pricingByParentId = mapPricingByParentId(pricingRows);

  const data = rows.map((item) => ({
    ...item,
    applicationRequirements: parseJsonArray<string>(item.applicationRequirements),
    pricing: pricingByParentId.get(item.id) || [],
  }));

  return { data };
}

export async function saveMembershipTypeUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; id?: string; payload: Record<string, unknown> }) {
  const db = drizzle(env.DB);
  const values = {
    orgId: input.orgId,
    name: String(input.payload.name || ""),
    isActive: input.payload.is_active === false ? 0 : 1,
    selfRegistrationEnabled: input.payload.self_registration_enabled ? 1 : 0,
    shortDescription: input.payload.short_description ? String(input.payload.short_description) : null,
    description: input.payload.description ? String(input.payload.description) : null,
    bankAccountId: input.payload.bank_account_id ? String(input.payload.bank_account_id) : null,
    invoiceCategory: input.payload.invoice_category ? String(input.payload.invoice_category) : null,
    vatPercent: Number(input.payload.vat_percent ?? 0),
    defaultInvoiceDay: Number(input.payload.default_invoice_day ?? 1),
    activationFee: Number(input.payload.activation_fee ?? 0),
    contractType: String(input.payload.contract_type || "AUTO_RENEW"),
    contractDurationMonths: input.payload.contract_duration_months ? Number(input.payload.contract_duration_months) : null,
    renewalDurationMonths: input.payload.renewal_duration_months ? Number(input.payload.renewal_duration_months) : null,
    cancellationNoticeDays: Number(input.payload.cancellation_notice_days ?? 30),
    cancellationNoticeBasis: String(input.payload.cancellation_notice_basis || "FROM_CANCELLATION"),
    renewalCancellationDays: input.payload.renewal_cancellation_days ? Number(input.payload.renewal_cancellation_days) : null,
    applicationRequirements: JSON.stringify(Array.isArray(input.payload.application_requirements) ? input.payload.application_requirements : []),
    sortOrder: Number(input.payload.sort_order ?? 0),
    updatedAt: new Date().toISOString(),
  };

  const pricing = Array.isArray(input.payload.pricing) ? input.payload.pricing as Array<Record<string, unknown>> : [];

  let targetId = input.id;
  if (targetId) {
    await db.update(membershipTypes).set(values).where(and(eq(membershipTypes.id, targetId), eq(membershipTypes.orgId, input.orgId)));
    await db.delete(tarifPricing).where(and(eq(tarifPricing.parentId, targetId), eq(tarifPricing.parentType, "MEMBERSHIP_TYPE")));
    await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Mitgliedsart '${values.name}' bearbeitet`, "membership_type", targetId);
  } else {
    const created = await db.insert(membershipTypes).values(values).returning();
    targetId = created[0].id;
    await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Mitgliedsart '${values.name}' erstellt`, "membership_type", targetId);
  }

  for (const price of pricing) {
    await db.insert(tarifPricing).values({
      orgId: input.orgId,
      parentId: targetId,
      parentType: "MEMBERSHIP_TYPE",
      billingPeriod: String(price.billing_period),
      price: Number(price.price),
      membershipTypeId: null,
    });
  }
}

export async function deleteMembershipTypeUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; id: string }) {
  const db = drizzle(env.DB);
  const rows = await db.select().from(membershipTypes).where(and(eq(membershipTypes.id, input.id), eq(membershipTypes.orgId, input.orgId)));
  const item = rows[0];
  if (!item) throw new Error("Mitgliedsart nicht gefunden");

  const activeContracts = await db.select({ count: count() }).from(contracts).where(and(eq(contracts.membershipTypeId, input.id), eq(contracts.status, "ACTIVE")));
  if ((activeContracts[0]?.count || 0) > 0) {
    throw new Error("Mitgliedsart kann nicht gelöscht werden, da aktive Verträge existieren");
  }

  await db.delete(tarifPricing).where(and(eq(tarifPricing.parentId, input.id), eq(tarifPricing.parentType, "MEMBERSHIP_TYPE")));
  await db.delete(membershipTypes).where(eq(membershipTypes.id, input.id));
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Mitgliedsart '${item.name}' gelöscht`, "membership_type", input.id);
}

export async function listTarifsUseCase(env: RouteEnv, orgId: string) {
  const db = drizzle(env.DB);
  const rows = await db.select().from(tarifs).where(eq(tarifs.orgId, orgId)).orderBy(asc(tarifs.sortOrder));
  const pricingRows = rows.length > 0
    ? await db.select().from(tarifPricing).where(and(inArray(tarifPricing.parentId, rows.map((item) => item.id)), eq(tarifPricing.parentType, "TARIF")))
    : [];
  
  const pricingByParentId = mapPricingByParentId(pricingRows);

  const data = rows.map((item) => ({
    ...item,
    applicationRequirements: parseJsonArray<string>(item.applicationRequirements),
    allowedMembershipTypeIds: parseJsonArray<string>(item.allowedMembershipTypeIds),
    pricing: pricingByParentId.get(item.id) || [],
  }));

  return { data };
}

export async function saveTarifUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; id?: string; payload: Record<string, unknown> }) {
  const db = drizzle(env.DB);
  const values = {
    orgId: input.orgId,
    name: String(input.payload.name || ""),
    isActive: input.payload.is_active === false ? 0 : 1,
    selfRegistrationEnabled: input.payload.self_registration_enabled ? 1 : 0,
    shortDescription: input.payload.short_description ? String(input.payload.short_description) : null,
    description: input.payload.description ? String(input.payload.description) : null,
    bankAccountId: input.payload.bank_account_id ? String(input.payload.bank_account_id) : null,
    invoiceCategory: input.payload.invoice_category ? String(input.payload.invoice_category) : null,
    vatPercent: Number(input.payload.vat_percent ?? 0),
    defaultInvoiceDay: Number(input.payload.default_invoice_day ?? 1),
    activationFee: Number(input.payload.activation_fee ?? 0),
    contractType: String(input.payload.contract_type || "AUTO_RENEW"),
    contractDurationMonths: input.payload.contract_duration_months ? Number(input.payload.contract_duration_months) : null,
    renewalDurationMonths: input.payload.renewal_duration_months ? Number(input.payload.renewal_duration_months) : null,
    cancellationNoticeDays: Number(input.payload.cancellation_notice_days ?? 30),
    cancellationNoticeBasis: String(input.payload.cancellation_notice_basis || "FROM_CANCELLATION"),
    renewalCancellationDays: input.payload.renewal_cancellation_days ? Number(input.payload.renewal_cancellation_days) : null,
    applicationRequirements: JSON.stringify(Array.isArray(input.payload.application_requirements) ? input.payload.application_requirements : []),
    allowedMembershipTypeIds: JSON.stringify(Array.isArray(input.payload.allowed_membership_type_ids) ? input.payload.allowed_membership_type_ids : []),
    sortOrder: Number(input.payload.sort_order ?? 0),
    updatedAt: new Date().toISOString(),
  };

  const pricing = Array.isArray(input.payload.pricing) ? input.payload.pricing as Array<Record<string, unknown>> : [];

  let targetId = input.id;
  if (targetId) {
    await db.update(tarifs).set(values).where(and(eq(tarifs.id, targetId), eq(tarifs.orgId, input.orgId)));
    await db.delete(tarifPricing).where(and(eq(tarifPricing.parentId, targetId), eq(tarifPricing.parentType, "TARIF")));
    await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Tarif '${values.name}' bearbeitet`, "tarif", targetId);
  } else {
    const created = await db.insert(tarifs).values(values).returning();
    targetId = created[0].id;
    await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Tarif '${values.name}' erstellt`, "tarif", targetId);
  }

  for (const price of pricing) {
    await db.insert(tarifPricing).values({
      orgId: input.orgId,
      parentId: targetId,
      parentType: "TARIF",
      billingPeriod: String(price.billing_period),
      price: Number(price.price),
      membershipTypeId: price.membership_type_id ? String(price.membership_type_id) : null,
    });
  }
}

export async function deleteTarifUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; id: string }) {
  const db = drizzle(env.DB);
  const rows = await db.select().from(tarifs).where(and(eq(tarifs.id, input.id), eq(tarifs.orgId, input.orgId)));
  const item = rows[0];
  if (!item) throw new Error("Tarif nicht gefunden");

  const activeContracts = await db.select({ count: count() }).from(contracts).where(and(eq(contracts.tarifId, input.id), eq(contracts.status, "ACTIVE")));
  if ((activeContracts[0]?.count || 0) > 0) {
    throw new Error("Tarif kann nicht gelöscht werden, da aktive Verträge existieren");
  }

  await db.delete(tarifPricing).where(and(eq(tarifPricing.parentId, input.id), eq(tarifPricing.parentType, "TARIF")));
  await db.delete(tarifDiscounts).where(and(eq(tarifDiscounts.parentId, input.id), eq(tarifDiscounts.parentType, "TARIF")));
  await db.delete(tarifs).where(eq(tarifs.id, input.id));
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Tarif '${item.name}' gelöscht`, "tarif", input.id);
}

export async function listDiscountGroupsUseCase(env: RouteEnv, orgId: string) {
  const db = drizzle(env.DB);
  const rows = await db.select().from(discountGroups).where(eq(discountGroups.orgId, orgId)).orderBy(asc(discountGroups.name));
  const groupIds = [...new Set(rows.map((item) => item.groupId).filter((id): id is string => Boolean(id)))];
  const groupRows = groupIds.length > 0
    ? await db.select({ id: groups.id, name: groups.name }).from(groups).where(inArray(groups.id, groupIds))
    : [];
  const groupNamesById = new Map(groupRows.map((row) => [row.id, row.name]));
  const data = rows.map((item) => ({
    ...item,
    rules: parseJsonArray<{ field: string; operator: string; value: string }>(item.rules),
    groupName: item.groupId ? groupNamesById.get(item.groupId) || "" : "",
  }));
  return { data };
}

export async function createDiscountGroupUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; name: string }) {
  const db = drizzle(env.DB);
  const created = await db.insert(discountGroups).values({ orgId: input.orgId, name: input.name, rules: "[]" }).returning();
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Rabattgruppe '${input.name}' erstellt`, "discount_group", created[0].id);
}

export async function deleteDiscountGroupUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; id: string }) {
  const db = drizzle(env.DB);
  const rows = await db.select().from(discountGroups).where(and(eq(discountGroups.id, input.id), eq(discountGroups.orgId, input.orgId)));
  const item = rows[0];
  if (!item) throw new Error("Rabattgruppe nicht gefunden");
  await db.delete(discountGroups).where(eq(discountGroups.id, input.id));
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Rabattgruppe '${item.name}' gelöscht`, "discount_group", input.id);
}
