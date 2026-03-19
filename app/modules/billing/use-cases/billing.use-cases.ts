import { and, count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { writeAuditLog } from "@/core/lib/audit";
import { contractPauses, contractSettings, contracts, invoiceItems, invoices, membershipTypes, tarifs } from "@/core/db/schema";

async function nextInvoiceNumber(db: ReturnType<typeof drizzle>, orgId: string) {
  const year = new Date().getFullYear();
  const rows = await db.select({ count: count() }).from(invoices).where(eq(invoices.orgId, orgId));
  return `RE-${year}-${String((rows[0]?.count || 0) + 1).padStart(5, "0")}`;
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

  let created = 0;
  const errors: string[] = [];

  for (const contract of activeContracts) {
    try {
      if (contract.paidUntil && contract.paidUntil > today) continue;
      const price = contract.currentPrice || 0;
      if (price <= 0) continue;

      const pauses = await db.select().from(contractPauses).where(eq(contractPauses.contractId, contract.id));
      let totalCredit = 0;
      for (const pause of pauses) {
        if (pause.pauseFrom <= today && pause.pauseUntil >= today) {
          totalCredit += pause.creditAmount || 0;
        }
      }

      const adjustedPrice = Math.max(0, price - totalCredit);

      let vatPercent = 0;
      if (contract.membershipTypeId) {
        const rows = await db.select({ vatPercent: membershipTypes.vatPercent }).from(membershipTypes).where(eq(membershipTypes.id, contract.membershipTypeId));
        vatPercent = rows[0]?.vatPercent || 0;
      } else if (contract.tarifId) {
        const rows = await db.select({ vatPercent: tarifs.vatPercent }).from(tarifs).where(eq(tarifs.id, contract.tarifId));
        vatPercent = rows[0]?.vatPercent || 0;
      }

      const taxAmount = Math.round((adjustedPrice * vatPercent / 100) * 100) / 100;
      const total = Math.round((adjustedPrice + taxAmount) * 100) / 100;
      const invoiceNumber = await nextInvoiceNumber(db, input.orgId);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const settingsRows = await db.select().from(contractSettings).where(eq(contractSettings.orgId, input.orgId));
      const publishMode = settingsRows[0]?.invoicePublishMode || "DRAFT";

      const createdInvoice = await db.insert(invoices).values({
        orgId: input.orgId,
        userId: contract.memberId,
        invoiceNumber,
        type: "invoice",
        status: publishMode === "AUTO_PUBLISH" ? "sent" : "draft",
        subtotal: adjustedPrice,
        taxRate: vatPercent,
        taxAmount,
        total,
        dueDate: dueDate.toISOString().slice(0, 10),
        contractId: contract.id,
      }).returning();

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

      await db.insert(invoiceItems).values({
        invoiceId: createdInvoice[0].id,
        description,
        quantity: 1,
        unitPrice: adjustedPrice,
        total: adjustedPrice,
      });

      const periodMonths = contract.billingPeriod === "YEARLY"
        ? 12
        : contract.billingPeriod === "HALF_YEARLY"
          ? 6
          : contract.billingPeriod === "QUARTERLY"
            ? 3
            : 1;

      const paidFrom = contract.paidUntil ? new Date(contract.paidUntil) : new Date(contract.startDate);
      paidFrom.setMonth(paidFrom.getMonth() + periodMonths);

      await db.update(contracts).set({
        paidUntil: paidFrom.toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
      }).where(eq(contracts.id, contract.id));

      created += 1;
    } catch (error) {
      errors.push(`Vertrag ${contract.contractNumber}: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`);
    }
  }

  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Abrechnungslauf: ${created} Rechnungen erstellt`, "billing");
  return { created, errors };
}
