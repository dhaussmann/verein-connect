import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like, or, desc, asc, count, gte, lte, sum, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { invoices, invoiceItems, accountingEntries, users } from '../db/schema';
import { parsePagination, buildMeta } from '../lib/pagination';
import { NotFoundError, ValidationError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const financeRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const createInvoiceSchema = z.object({
  user_id: z.string(),
  description: z.string().optional(),
  due_date: z.string().optional(),
  positions: z.array(z.object({
    description: z.string(),
    quantity: z.number().default(1),
    unit_price: z.number(),
  })),
  notes: z.string().optional(),
});

const createAccountingSchema = z.object({
  entry_date: z.string(),
  type: z.enum(['income', 'expense']),
  category: z.string().optional(),
  description: z.string(),
  amount: z.number(),
  payment_method: z.string().optional(),
});

// ─── GET /v1/invoices ────────────────────────────────────────────────────────
financeRoutes.get('/invoices', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const conditions: any[] = [eq(invoices.orgId, user.orgId)];
  if (query.status) {
    const statusReverseMap: Record<string, string> = {
      'Entwurf': 'draft', 'Gesendet': 'sent', 'Bezahlt': 'paid', 'Überfällig': 'overdue', 'Storniert': 'cancelled',
    };
    conditions.push(eq(invoices.status, statusReverseMap[query.status] || query.status));
  }
  if (query.search) {
    const s = `%${query.search}%`;
    conditions.push(or(like(invoices.invoiceNumber, s))!);
  }
  if (query.date_from) conditions.push(gte(invoices.createdAt, query.date_from));
  if (query.date_to) conditions.push(lte(invoices.createdAt, query.date_to));

  const whereClause = and(...conditions);

  const totalResult = await db.select({ count: count() }).from(invoices).where(whereClause);
  const total = totalResult[0]?.count || 0;

  const rows = await db.select().from(invoices).where(whereClause)
    .orderBy(desc(invoices.createdAt)).limit(perPage).offset(offset);

  // Enrich with user info + items
  const enriched = await Promise.all(rows.map(async (inv) => {
    const userRow = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, inv.userId));
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id));

    const memberName = userRow[0] ? `${userRow[0].firstName} ${userRow[0].lastName}` : '';
    const initials = userRow[0]
      ? `${(userRow[0].firstName || '')[0] || ''}${(userRow[0].lastName || '')[0] || ''}`.toUpperCase()
      : '';

    const statusMap: Record<string, string> = {
      draft: 'Entwurf', sent: 'Gesendet', paid: 'Bezahlt', overdue: 'Überfällig', cancelled: 'Storniert',
    };

    return {
      id: inv.id,
      number: inv.invoiceNumber,
      memberId: inv.userId,
      memberName,
      memberInitials: initials,
      date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('de-DE') : '',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('de-DE') : '',
      amount: `€${(inv.total || 0).toFixed(2).replace('.', ',')}`,
      amountRaw: inv.total || 0,
      status: statusMap[inv.status || 'draft'] || inv.status,
      description: inv.notes || items.map((i) => i.description).join(', '),
      positions: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
    };
  }));

  // Summary
  const allInvoices = await db.select({ status: invoices.status, total: invoices.total }).from(invoices).where(eq(invoices.orgId, user.orgId));
  const summary = {
    total_open: allInvoices.filter((i) => i.status === 'sent').reduce((s, i) => s + (i.total || 0), 0),
    total_paid: allInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0),
    total_overdue: allInvoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + (i.total || 0), 0),
  };

  return c.json({ data: enriched, meta: buildMeta(total, page, perPage), summary });
});

// ─── GET /v1/invoices/:id ────────────────────────────────────────────────────
financeRoutes.get('/invoices/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const invId = c.req.param('id');

  const rows = await db.select().from(invoices).where(and(eq(invoices.id, invId), eq(invoices.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Rechnung', invId);

  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invId));
  const userRow = await db.select().from(users).where(eq(users.id, rows[0].userId));

  return c.json({ ...rows[0], items, user: userRow[0] || null });
});

// ─── POST /v1/invoices ───────────────────────────────────────────────────────
financeRoutes.post('/invoices', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;
  const db = drizzle(c.env.DB);

  // Generate invoice number
  const year = new Date().getFullYear();
  const countResult = await db.select({ count: count() }).from(invoices).where(eq(invoices.orgId, user.orgId));
  const invNum = `RE-${year}-${String((countResult[0]?.count || 0) + 1).padStart(5, '0')}`;

  const subtotal = data.positions.reduce((sum, p) => sum + p.quantity * p.unit_price, 0);
  const invoiceId = crypto.randomUUID();

  await db.insert(invoices).values({
    id: invoiceId,
    orgId: user.orgId,
    userId: data.user_id,
    invoiceNumber: invNum,
    status: 'draft',
    subtotal,
    total: subtotal,
    dueDate: data.due_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    notes: data.notes,
  });

  for (let i = 0; i < data.positions.length; i++) {
    const pos = data.positions[i];
    await db.insert(invoiceItems).values({
      invoiceId,
      description: pos.description,
      quantity: pos.quantity,
      unitPrice: pos.unit_price,
      total: pos.quantity * pos.unit_price,
      sortOrder: i,
    });
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rechnung erstellt', 'invoice', invoiceId, invNum);

  return c.json({ id: invoiceId, number: invNum }, 201);
});

// ─── PATCH /v1/invoices/:id ──────────────────────────────────────────────────
financeRoutes.patch('/invoices/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const invId = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(invoices).where(and(eq(invoices.id, invId), eq(invoices.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Rechnung', invId);

  const updateData: Record<string, any> = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.due_date !== undefined) updateData.dueDate = body.due_date;
  if (body.notes !== undefined) updateData.notes = body.notes;

  await db.update(invoices).set(updateData).where(eq(invoices.id, invId));
  return c.json({ success: true });
});

// ─── DELETE /v1/invoices/:id ─────────────────────────────────────────────────
financeRoutes.delete('/invoices/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const invId = c.req.param('id');

  // Clear FK references, delete line items, then delete the invoice
  await db.update(accountingEntries).set({ invoiceId: null }).where(eq(accountingEntries.invoiceId, invId));
  await db.run(sql`UPDATE shop_orders SET invoice_id = NULL WHERE invoice_id = ${invId}`);
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invId));
  await db.delete(invoices).where(and(eq(invoices.id, invId), eq(invoices.orgId, user.orgId)));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rechnung gelöscht', 'invoice', invId);
  return c.json({ success: true });
});

// ─── POST /v1/invoices/:id/send ──────────────────────────────────────────────
financeRoutes.post('/invoices/:id/send', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const invId = c.req.param('id');

  const invRows = await db.select().from(invoices).where(and(eq(invoices.id, invId), eq(invoices.orgId, user.orgId)));
  if (invRows.length === 0) throw new NotFoundError('Rechnung', invId);

  // Get recipient email
  const recipientUser = await db.select({ email: users.email }).from(users).where(eq(users.id, invRows[0].userId));

  if (recipientUser.length > 0 && c.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'rechnungen@verein-connect.de',
          to: [recipientUser[0].email],
          subject: `Rechnung ${invRows[0].invoiceNumber}`,
          html: `<p>Sehr geehrtes Mitglied,</p><p>anbei Ihre Rechnung ${invRows[0].invoiceNumber} über €${(invRows[0].total || 0).toFixed(2).replace('.', ',')}.</p>`,
        }),
      });
    } catch (e) {
      console.error('Invoice email failed:', e);
    }
  }

  await db.update(invoices).set({ status: 'sent', sentAt: new Date().toISOString() } as any).where(eq(invoices.id, invId));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rechnung gesendet', 'invoice', invId, invRows[0].invoiceNumber);

  return c.json({ success: true });
});

// ─── POST /v1/invoices/:id/paid ──────────────────────────────────────────────
financeRoutes.post('/invoices/:id/paid', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const invId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  await db.update(invoices).set({
    status: 'paid',
    paidAt: new Date().toISOString(),
    paymentMethod: body.payment_method || 'manual',
  }).where(and(eq(invoices.id, invId), eq(invoices.orgId, user.orgId)));

  // Create accounting entry
  const invRows = await db.select().from(invoices).where(eq(invoices.id, invId));
  if (invRows.length > 0) {
    await db.insert(accountingEntries).values({
      orgId: user.orgId,
      invoiceId: invId,
      entryDate: new Date().toISOString().slice(0, 10),
      type: 'income',
      category: 'Mitgliedsbeiträge',
      description: `Zahlung ${invRows[0].invoiceNumber}`,
      amount: invRows[0].total || 0,
      paymentMethod: body.payment_method || 'manual',
      createdBy: user.id,
    });
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rechnung bezahlt', 'invoice', invId);

  return c.json({ success: true });
});

// ─── ACCOUNTING ──────────────────────────────────────────────────────────────
financeRoutes.get('/accounting', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();

  const conditions: any[] = [eq(accountingEntries.orgId, user.orgId)];
  if (query.date_from) conditions.push(gte(accountingEntries.entryDate, query.date_from));
  if (query.date_to) conditions.push(lte(accountingEntries.entryDate, query.date_to));
  if (query.type) conditions.push(eq(accountingEntries.type, query.type));
  if (query.category) conditions.push(eq(accountingEntries.category, query.category));

  const rows = await db.select().from(accountingEntries)
    .where(and(...conditions))
    .orderBy(desc(accountingEntries.entryDate));

  const typeMap: Record<string, string> = { income: 'Einnahme', expense: 'Ausgabe' };

  const entries = rows.map((e) => ({
    id: e.id,
    date: e.entryDate ? new Date(e.entryDate).toLocaleDateString('de-DE') : '',
    type: typeMap[e.type] || e.type,
    category: e.category || '',
    description: e.description,
    amount: `€${Math.abs(e.amount).toFixed(2).replace('.', ',')}`,
    amountRaw: e.amount,
    receipt: e.receiptUrl,
  }));

  const income = rows.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const expense = rows.filter((e) => e.type === 'expense').reduce((s, e) => s + Math.abs(e.amount), 0);

  return c.json({ entries, summary: { income, expense, balance: income - expense } });
});

financeRoutes.post('/accounting', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = createAccountingSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();
  const data = parsed.data;

  await db.insert(accountingEntries).values({
    id,
    orgId: user.orgId,
    entryDate: data.entry_date,
    type: data.type,
    category: data.category,
    description: data.description,
    amount: data.type === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount),
    paymentMethod: data.payment_method,
    createdBy: user.id,
  });

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Buchung erstellt', 'accounting', id, data.description);

  return c.json({ id }, 201);
});

financeRoutes.patch('/accounting/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const entryId = c.req.param('id');
  const body = await c.req.json();

  const updateData: Record<string, any> = {};
  if (body.entry_date !== undefined) updateData.entryDate = body.entry_date;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.amount !== undefined) updateData.amount = body.amount;

  await db.update(accountingEntries).set(updateData).where(and(eq(accountingEntries.id, entryId), eq(accountingEntries.orgId, user.orgId)));
  return c.json({ success: true });
});

financeRoutes.delete('/accounting/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const entryId = c.req.param('id');

  await db.delete(accountingEntries).where(and(eq(accountingEntries.id, entryId), eq(accountingEntries.orgId, user.orgId)));
  return c.json({ success: true });
});

financeRoutes.get('/accounting/report', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const year = query.year || new Date().getFullYear().toString();

  const rows = await db.select().from(accountingEntries)
    .where(and(eq(accountingEntries.orgId, user.orgId), gte(accountingEntries.entryDate, `${year}-01-01`), lte(accountingEntries.entryDate, `${year}-12-31`)));

  const months: Record<string, { income: number; expense: number }> = {};
  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, '0');
    months[key] = { income: 0, expense: 0 };
  }

  for (const entry of rows) {
    const month = entry.entryDate.slice(5, 7);
    if (months[month]) {
      if (entry.type === 'income') months[month].income += entry.amount;
      else months[month].expense += Math.abs(entry.amount);
    }
  }

  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const periods = Object.entries(months).map(([key, val]) => ({
    label: monthNames[parseInt(key) - 1],
    income: val.income,
    expense: val.expense,
    balance: val.income - val.expense,
  }));

  return c.json({ year, periods });
});
