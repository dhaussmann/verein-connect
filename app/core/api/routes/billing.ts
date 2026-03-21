import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, count, lte, or, isNull } from 'drizzle-orm';
import type { Env, AuthUser } from '../../types/env';
import { contracts, contractPauses, users, membershipTypes, tarifs, invoices, invoiceItems } from '../../db/schema';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const billingRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── GET /schedule — Billing schedule ───────────────────────────────────────
billingRoutes.get('/schedule', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const today = new Date().toISOString().slice(0, 10);

  // Get active contracts that need billing
  const activeContracts = await db
    .select()
    .from(contracts)
    .where(and(
      eq(contracts.orgId, user.orgId),
      eq(contracts.status, 'ACTIVE'),
      or(isNull(contracts.paidUntil), lte(contracts.paidUntil, today)),
    ));

  const enriched = await Promise.all(activeContracts.map(async (contract) => {
    const member = await db.select({ firstName: users.firstName, lastName: users.lastName })
      .from(users).where(eq(users.id, contract.memberId));
    return {
      ...contract,
      memberName: member[0] ? `${member[0].firstName} ${member[0].lastName}` : null,
    };
  }));

  return c.json({ contracts: enriched, count: enriched.length });
});

// ─── POST /run — Execute billing run ────────────────────────────────────────
billingRoutes.post('/run', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const today = new Date().toISOString().slice(0, 10);
  const results: { contractId: string; invoiceId: string; amount: number }[] = [];

  const activeContracts = await db
    .select()
    .from(contracts)
    .where(and(
      eq(contracts.orgId, user.orgId),
      eq(contracts.status, 'ACTIVE'),
      or(isNull(contracts.paidUntil), lte(contracts.paidUntil, today)),
    ));

  for (const contract of activeContracts) {
    if (!contract.currentPrice || contract.currentPrice <= 0) continue;

    // Check for active pauses
    const activePause = await db.select().from(contractPauses)
      .where(and(eq(contractPauses.contractId, contract.id), lte(contractPauses.pauseFrom, today)));
    const isPaused = activePause.some(p => p.pauseFrom <= today && p.pauseUntil >= today);
    if (isPaused) continue;

    // Generate invoice
    const invCount = await db.select({ count: count() }).from(invoices).where(eq(invoices.orgId, user.orgId));
    const invoiceNumber = `RE-${new Date().getFullYear()}-${String((invCount[0]?.count || 0) + 1).padStart(5, '0')}`;

    const inv = await db.insert(invoices).values({
      orgId: user.orgId,
      userId: contract.memberId,
      invoiceNumber,
      status: 'draft',
      subtotal: contract.currentPrice,
      total: contract.currentPrice,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      contractId: contract.id,
      notes: `Automatische Abrechnung: ${contract.contractNumber}`,
    }).returning();

    await db.insert(invoiceItems).values({
      invoiceId: inv[0].id,
      description: `Mitgliedsbeitrag (${contract.billingPeriod || 'monatlich'})`,
      quantity: 1,
      unitPrice: contract.currentPrice,
      total: contract.currentPrice,
    });

    // Update paidUntil
    const paidUntil = new Date();
    const period = contract.billingPeriod || 'monthly';
    if (period === 'monthly') paidUntil.setMonth(paidUntil.getMonth() + 1);
    else if (period === 'quarterly') paidUntil.setMonth(paidUntil.getMonth() + 3);
    else if (period === 'half_yearly') paidUntil.setMonth(paidUntil.getMonth() + 6);
    else if (period === 'yearly') paidUntil.setFullYear(paidUntil.getFullYear() + 1);

    await db.update(contracts).set({
      paidUntil: paidUntil.toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    }).where(eq(contracts.id, contract.id));

    results.push({ contractId: contract.id, invoiceId: inv[0].id, amount: contract.currentPrice });
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Abrechnungslauf: ${results.length} Rechnungen erstellt`, 'billing');

  return c.json({ generated: results.length, invoices: results });
});
