import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { writeAuditLog } from "@/core/lib/audit";
import { nextFormattedCounter } from "@/core/db/sequences";
import { contractPauses, contractSettings, contracts, invoiceItems, invoices, membershipTypes, tarifs } from "@/core/db/schema";

async function nextInvoiceNumber(db: D1Database, orgId: string) {
  const year = new Date().getFullYear();
  return nextFormattedCounter(db, orgId, `invoice_number_${year}`, `RE-${year}-`);
}

export async function getBillingScheduleUseCase(env: RouteEnv, orgId: string) {
  const db = drizzle(env.DB);
  const today = new Date().toISOString().slice(0, 10);

  const settingsRows = await db.select().from(contractSettings).where(eq(contractSettings.orgId, orgId));
  const settings = settingsRows[0] || { daysInAdvance: 14, invoicePublishMode: "DRAFT" };
  const activeContracts = await db.select().from(contracts).where(and(eq(contracts.orgId, orgId), eq(contracts.status, "ACTIVE")));

  const pending = activeContracts
    .filter((contract) => !(contract.paidUntil && contract.paidUntil > today) && (contract.currentPrice || 0) > 0)
    .map((contract) => ({
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      memberId: contract.memberId,
      currentPrice: contract.currentPrice,
      billingPeriod: contract.billingPeriod,
      paidUntil: contract.paidUntil,
    }));

  return {
    settings: {
      daysInAdvance: settings.daysInAdvance,
      invoicePublishMode: settings.invoicePublishMode,
    },
    pendingContracts: pending.length,
    contracts: pending,
  };
}

export async function runBillingUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string }) {
  const db = drizzle(env.DB);
  const today = new Date().toISOString().slice(0, 10);
  const activeContracts = await db.select().from(contracts).where(and(eq(contracts.orgId, input.orgId), eq(contracts.status, "ACTIVE")));
  const settingsRows = await db.select().from(contractSettings).where(eq(contractSettings.orgId, input.orgId));
  const publishMode = settingsRows[0]?.invoicePublishMode || "DRAFT";
  const contractIds = activeContracts.map((contract) => contract.id);
  const membershipTypeIds = [...new Set(activeContracts.map((contract) => contract.membershipTypeId).filter((id): id is string => Boolean(id)))];
  const tarifIds = [...new Set(activeContracts.map((contract) => contract.tarifId).filter((id): id is string => Boolean(id)))];
  const [pauseRows, membershipTypeRows, tarifRows] = await Promise.all([
    contractIds.length > 0
      ? db.select().from(contractPauses).where(inArray(contractPauses.contractId, contractIds))
      : Promise.resolve([]),
    membershipTypeIds.length > 0
      ? db.select({ id: membershipTypes.id, vatPercent: membershipTypes.vatPercent }).from(membershipTypes).where(inArray(membershipTypes.id, membershipTypeIds))
      : Promise.resolve([]),
    tarifIds.length > 0
      ? db.select({ id: tarifs.id, vatPercent: tarifs.vatPercent }).from(tarifs).where(inArray(tarifs.id, tarifIds))
      : Promise.resolve([]),
  ]);

  const pausesByContractId = new Map<string, typeof pauseRows>();
  for (const pause of pauseRows) {
    const list = pausesByContractId.get(pause.contractId) || [];
    list.push(pause);
    pausesByContractId.set(pause.contractId, list);
  }
  const vatByMembershipTypeId = new Map(membershipTypeRows.map((row) => [row.id, row.vatPercent || 0]));
  const vatByTarifId = new Map(tarifRows.map((row) => [row.id, row.vatPercent || 0]));

  let created = 0;
  const errors: string[] = [];

  for (const contract of activeContracts) {
    try {
      if (contract.paidUntil && contract.paidUntil > today) continue;
      const price = contract.currentPrice || 0;
      if (price <= 0) continue;

      const pauses = pausesByContractId.get(contract.id) || [];
      let totalCredit = 0;
      for (const pause of pauses) {
        if (pause.pauseFrom <= today && pause.pauseUntil >= today) {
          totalCredit += pause.creditAmount || 0;
        }
      }

      const adjustedPrice = Math.max(0, price - totalCredit);

      let vatPercent = 0;
      if (contract.membershipTypeId) {
        vatPercent = vatByMembershipTypeId.get(contract.membershipTypeId) || 0;
      } else if (contract.tarifId) {
        vatPercent = vatByTarifId.get(contract.tarifId) || 0;
      }

      const taxAmount = Math.round((adjustedPrice * vatPercent / 100) * 100) / 100;
      const total = Math.round((adjustedPrice + taxAmount) * 100) / 100;
      const invoiceNumber = await nextInvoiceNumber(env.DB, input.orgId);
      const invoiceId = crypto.randomUUID();

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const periodLabel = contract.billingPeriod === "YEARLY"
        ? "Jahresbeitrag"
        : contract.billingPeriod === "HALF_YEARLY"
          ? "Halbjahresbeitrag"
          : contract.billingPeriod === "QUARTERLY"
            ? "Quartalsbeitrag"
            : "Monatsbeitrag";

      let description = `${periodLabel} – Vertrag ${contract.contractNumber}`;
      if (totalCredit > 0) {
        description += ` (Gutschrift: -${totalCredit.toFixed(2)} €)`;
      }

      const periodMonths = contract.billingPeriod === "YEARLY"
        ? 12
        : contract.billingPeriod === "HALF_YEARLY"
          ? 6
          : contract.billingPeriod === "QUARTERLY"
            ? 3
            : 1;

      const paidFrom = contract.paidUntil ? new Date(contract.paidUntil) : new Date(contract.startDate);
      paidFrom.setMonth(paidFrom.getMonth() + periodMonths);

      const updatedAt = new Date().toISOString();

      await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO invoices (
            id, org_id, user_id, invoice_number, type, status, subtotal, tax_rate, tax_amount, total, due_date, contract_id
          ) VALUES (?1, ?2, ?3, ?4, 'invoice', ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        `).bind(
          invoiceId,
          input.orgId,
          contract.memberId,
          invoiceNumber,
          publishMode === "AUTO_PUBLISH" ? "sent" : "draft",
          adjustedPrice,
          vatPercent,
          taxAmount,
          total,
          dueDate.toISOString().slice(0, 10),
          contract.id,
        ),
        env.DB.prepare(`
          INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total, sort_order)
          VALUES (?1, ?2, ?3, 1, ?4, ?5, 0)
        `).bind(crypto.randomUUID(), invoiceId, description, adjustedPrice, adjustedPrice),
        env.DB.prepare(`
          UPDATE contracts
          SET paid_until = ?1, updated_at = ?2
          WHERE id = ?3
        `).bind(paidFrom.toISOString().slice(0, 10), updatedAt, contract.id),
      ]);

      created += 1;
    } catch (error) {
      errors.push(`Vertrag ${contract.contractNumber}: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`);
    }
  }

  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Abrechnungslauf: ${created} Rechnungen erstellt`, "billing");
  return { created, errors };
}
