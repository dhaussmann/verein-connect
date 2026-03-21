import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, count, gte, lte, sql } from 'drizzle-orm';
import type { Env, AuthUser } from '../../types/env';
import { invoices, invoiceItems, accountingEntries, users } from '../../db/schema';
import { parsePagination, buildMeta } from '../../lib/pagination';
import { NotFoundError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const financeRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Invoices ───────────────────────────────────────────────────────────────
financeRoutes.get('/invoices', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const conditions: any[] = [eq(invoices.orgId, user.orgId)];
  if (query.status) conditions.push(eq(invoices.status, query.status));
  if (query.user_id) conditions.push(eq(invoices.userId, query.user_id));

  const whereClause = and(...conditions);
  const totalResult = await db.select({ count: count() }).from(invoices).where(whereClause);
  const total = totalResult[0]?.count || 0;

  const rows = await db.select().from(invoices).where(whereClause)
    .orderBy(desc(invoices.createdAt)).limit(perPage).offset(offset);

  const enriched = await Promise.all(rows.map(async (inv) => {
    const member = await db.select({ firstName: users.firstName, lastName: users.lastName })
      .from(users).where(eq(users.id, inv.userId));
    return { ...inv, memberName: member[0] ? `${member[0].firstName} ${member[0].lastName}` : null };
  }));

  return c.json({ data: enriched, meta: buildMeta(total, page, perPage) });
});

financeRoutes.get('/invoices/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Rechnung', id);

  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  const member = await db.select().from(users).where(eq(users.id, rows[0].userId));

  return c.json({ ...rows[0], items, member: member[0] || null });
});

financeRoutes.put('/invoices/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Rechnung', id);

  const u: Record<string, any> = {};
  if (body.status !== undefined) u.status = body.status;
  if (body.paid_at !== undefined) u.paidAt = body.paid_at;
  if (body.payment_method !== undefined) u.paymentMethod = body.payment_method;
  if (body.notes !== undefined) u.notes = body.notes;

  await db.update(invoices).set(u).where(eq(invoices.id, id));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rechnung aktualisiert', 'invoice', id);
  return c.json({ success: true });
});

// ─── Accounting ─────────────────────────────────────────────────────────────
financeRoutes.get('/accounting', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const conditions: any[] = [eq(accountingEntries.orgId, user.orgId)];
  if (query.type) conditions.push(eq(accountingEntries.type, query.type));
  if (query.from) conditions.push(gte(accountingEntries.entryDate, query.from));
  if (query.to) conditions.push(lte(accountingEntries.entryDate, query.to));

  const whereClause = and(...conditions);
  const totalResult = await db.select({ count: count() }).from(accountingEntries).where(whereClause);
  const total = totalResult[0]?.count || 0;

  const rows = await db.select().from(accountingEntries).where(whereClause)
    .orderBy(desc(accountingEntries.entryDate)).limit(perPage).offset(offset);

  return c.json({ data: rows, meta: buildMeta(total, page, perPage) });
});

financeRoutes.post('/accounting', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const entry = await db.insert(accountingEntries).values({
    orgId: user.orgId,
    entryDate: body.entry_date || new Date().toISOString().slice(0, 10),
    type: body.type,
    category: body.category || null,
    description: body.description,
    amount: body.amount,
    paymentMethod: body.payment_method || null,
    invoiceId: body.invoice_id || null,
    createdBy: user.id,
  }).returning();

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Buchung erstellt', 'accounting', entry[0].id);
  return c.json({ id: entry[0].id }, 201);
});

// ─── Summary ────────────────────────────────────────────────────────────────
financeRoutes.get('/summary', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const from = query.from || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const to = query.to || new Date().toISOString().slice(0, 10);

  const income = await db.select({ total: sql<number>`COALESCE(SUM(${accountingEntries.amount}), 0)` })
    .from(accountingEntries)
    .where(and(eq(accountingEntries.orgId, user.orgId), eq(accountingEntries.type, 'income'), gte(accountingEntries.entryDate, from), lte(accountingEntries.entryDate, to)));

  const expense = await db.select({ total: sql<number>`COALESCE(SUM(${accountingEntries.amount}), 0)` })
    .from(accountingEntries)
    .where(and(eq(accountingEntries.orgId, user.orgId), eq(accountingEntries.type, 'expense'), gte(accountingEntries.entryDate, from), lte(accountingEntries.entryDate, to)));

  const openInvoices = await db.select({ count: count(), total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` })
    .from(invoices)
    .where(and(eq(invoices.orgId, user.orgId), eq(invoices.status, 'sent')));

  return c.json({
    income: income[0]?.total || 0,
    expense: expense[0]?.total || 0,
    balance: (income[0]?.total || 0) - (expense[0]?.total || 0),
    openInvoiceCount: openInvoices[0]?.count || 0,
    openInvoiceTotal: openInvoices[0]?.total || 0,
  });
});
