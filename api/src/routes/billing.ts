import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, count, lte, isNull } from 'drizzle-orm';
import type { Env, AuthUser } from '../types/bindings';
import { contracts, contractSettings, invoices, invoiceItems, membershipTypes, tarifs, contractPauses } from '../db/schema';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const billingRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Helper: Generate invoice number ────────────────────────────────────────
async function nextInvoiceNumber(db: ReturnType<typeof drizzle>, orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db.select({ count: count() }).from(invoices).where(eq(invoices.orgId, orgId));
  const num = (result[0]?.count || 0) + 1;
  return `RE-${year}-${num.toString().padStart(5, '0')}`;
}

// ─── GET /schedule — Show billing schedule ──────────────────────────────────
billingRoutes.get('/schedule', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const today = new Date().toISOString().slice(0, 10);

  // Settings
  const settingsRows = await db.select().from(contractSettings).where(eq(contractSettings.orgId, user.orgId));
  const settings = settingsRows[0] || { daysInAdvance: 14, invoicePublishMode: 'DRAFT' };

  // Active contracts needing invoicing
  const activeContracts = await db.select().from(contracts)
    .where(and(eq(contracts.orgId, user.orgId), eq(contracts.status, 'ACTIVE')));

  const pending: any[] = [];
  for (const contract of activeContracts) {
    if (contract.paidUntil && contract.paidUntil > today) continue;
    if ((contract.currentPrice || 0) <= 0) continue;
    pending.push({
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      memberId: contract.memberId,
      currentPrice: contract.currentPrice,
      billingPeriod: contract.billingPeriod,
      paidUntil: contract.paidUntil,
    });
  }

  return c.json({
    settings: {
      daysInAdvance: settings.daysInAdvance,
      invoicePublishMode: settings.invoicePublishMode,
    },
    pendingContracts: pending.length,
    contracts: pending,
  });
});

// ─── POST /run — Execute billing run ────────────────────────────────────────
billingRoutes.post('/run', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const today = new Date().toISOString().slice(0, 10);

  const activeContracts = await db.select().from(contracts)
    .where(and(eq(contracts.orgId, user.orgId), eq(contracts.status, 'ACTIVE')));

  let created = 0;
  const errors: string[] = [];

  for (const contract of activeContracts) {
    try {
      if (contract.paidUntil && contract.paidUntil > today) continue;
      const price = contract.currentPrice || 0;
      if (price <= 0) continue;

      // Check for pause credits
      const pauses = await db.select().from(contractPauses).where(eq(contractPauses.contractId, contract.id));
      let totalCredit = 0;
      for (const p of pauses) {
        if (p.pauseFrom <= today && p.pauseUntil >= today) {
          totalCredit += p.creditAmount || 0;
        }
      }

      const adjustedPrice = Math.max(0, price - totalCredit);

      // Get VAT
      let vatPercent = 0;
      if (contract.membershipTypeId) {
        const mt = await db.select({ vatPercent: membershipTypes.vatPercent }).from(membershipTypes).where(eq(membershipTypes.id, contract.membershipTypeId));
        vatPercent = mt[0]?.vatPercent || 0;
      } else if (contract.tarifId) {
        const t = await db.select({ vatPercent: tarifs.vatPercent }).from(tarifs).where(eq(tarifs.id, contract.tarifId));
        vatPercent = t[0]?.vatPercent || 0;
      }

      const taxAmount = Math.round((adjustedPrice * vatPercent / 100) * 100) / 100;
      const total = Math.round((adjustedPrice + taxAmount) * 100) / 100;

      const invoiceNumber = await nextInvoiceNumber(db, user.orgId);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      // Get settings for publish mode
      const settingsRows = await db.select().from(contractSettings).where(eq(contractSettings.orgId, user.orgId));
      const publishMode = settingsRows[0]?.invoicePublishMode || 'DRAFT';

      const inv = await db.insert(invoices).values({
        orgId: user.orgId,
        userId: contract.memberId,
        invoiceNumber,
        type: 'invoice',
        status: publishMode === 'AUTO_PUBLISH' ? 'sent' : 'draft',
        subtotal: adjustedPrice,
        taxRate: vatPercent,
        taxAmount,
        total,
        dueDate: dueDate.toISOString().slice(0, 10),
        contractId: contract.id,
      }).returning();

      const periodLabel = contract.billingPeriod === 'YEARLY' ? 'Jahresbeitrag'
        : contract.billingPeriod === 'HALF_YEARLY' ? 'Halbjahresbeitrag'
        : contract.billingPeriod === 'QUARTERLY' ? 'Quartalsbeitrag'
        : 'Monatsbeitrag';

      let desc = `${periodLabel} – Vertrag ${contract.contractNumber}`;
      if (totalCredit > 0) desc += ` (Gutschrift: -${totalCredit.toFixed(2)} €)`;

      await db.insert(invoiceItems).values({
        invoiceId: inv[0].id,
        description: desc,
        quantity: 1,
        unitPrice: adjustedPrice,
        total: adjustedPrice,
      });

      // Update paid_until
      const periodMonths = contract.billingPeriod === 'YEARLY' ? 12
        : contract.billingPeriod === 'HALF_YEARLY' ? 6
        : contract.billingPeriod === 'QUARTERLY' ? 3
        : 1;
      const paidFrom = contract.paidUntil ? new Date(contract.paidUntil) : new Date(contract.startDate);
      paidFrom.setMonth(paidFrom.getMonth() + periodMonths);

      await db.update(contracts).set({
        paidUntil: paidFrom.toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
      }).where(eq(contracts.id, contract.id));

      created++;
    } catch (err: any) {
      errors.push(`Vertrag ${contract.contractNumber}: ${err.message}`);
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Abrechnungslauf: ${created} Rechnungen erstellt`, 'billing');

  return c.json({ created, errors });
});
