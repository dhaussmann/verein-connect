import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, count, like, or } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../../types/env';
import { contracts, contractPauses, users, membershipTypes, tarifs, tarifPricing, families, groups, invoices, invoiceItems } from '../../db/schema';
import { parsePagination, buildMeta } from '../../lib/pagination';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const contractRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Helper: generate contract number
async function generateContractNumber(db: ReturnType<typeof drizzle>, orgId: string): Promise<string> {
  const result = await db.select({ count: count() }).from(contracts).where(eq(contracts.orgId, orgId));
  return `V-${new Date().getFullYear()}-${String((result[0]?.count || 0) + 1).padStart(5, '0')}`;
}

// Helper: generate invoice number
async function generateInvoiceNumber(db: ReturnType<typeof drizzle>, orgId: string): Promise<string> {
  const result = await db.select({ count: count() }).from(invoices).where(eq(invoices.orgId, orgId));
  return `RE-${new Date().getFullYear()}-${String((result[0]?.count || 0) + 1).padStart(5, '0')}`;
}

// ─── GET / — List contracts ─────────────────────────────────────────────────
contractRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const conditions: any[] = [eq(contracts.orgId, user.orgId)];
  if (query.status) conditions.push(eq(contracts.status, query.status));
  if (query.member_id) conditions.push(eq(contracts.memberId, query.member_id));
  if (query.search) {
    const s = `%${query.search}%`;
    conditions.push(like(contracts.contractNumber, s));
  }

  const whereClause = and(...conditions);
  const totalResult = await db.select({ count: count() }).from(contracts).where(whereClause);
  const total = totalResult[0]?.count || 0;

  const rows = await db.select().from(contracts).where(whereClause)
    .orderBy(desc(contracts.createdAt)).limit(perPage).offset(offset);

  // Enrich with member name, membership type, tarif, family
  const enriched = await Promise.all(rows.map(async (contract) => {
    const member = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, contract.memberId));
    let mtName = null;
    if (contract.membershipTypeId) {
      const mt = await db.select({ name: membershipTypes.name }).from(membershipTypes).where(eq(membershipTypes.id, contract.membershipTypeId));
      mtName = mt[0]?.name || null;
    }
    let tName = null;
    if (contract.tarifId) {
      const t = await db.select({ name: tarifs.name }).from(tarifs).where(eq(tarifs.id, contract.tarifId));
      tName = t[0]?.name || null;
    }
    let familyName = null;
    if (contract.familyId) {
      const f = await db.select({ name: families.name }).from(families).where(eq(families.id, contract.familyId));
      familyName = f[0]?.name || null;
    }
    return {
      ...contract,
      memberName: member[0] ? `${member[0].firstName} ${member[0].lastName}` : null,
      membershipTypeName: mtName,
      tarifName: tName,
      familyName,
    };
  }));

  return c.json({ data: enriched, meta: buildMeta(total, page, perPage) });
});

// ─── GET /:id — Contract detail ─────────────────────────────────────────────
contractRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Vertrag', id);

  const contract = rows[0];
  const member = await db.select().from(users).where(eq(users.id, contract.memberId));
  const pauses = await db.select().from(contractPauses).where(eq(contractPauses.contractId, id));
  const contractInvoices = await db.select().from(invoices).where(eq(invoices.contractId, id));

  let mt = null;
  if (contract.membershipTypeId) {
    const mtRows = await db.select().from(membershipTypes).where(eq(membershipTypes.id, contract.membershipTypeId));
    mt = mtRows[0] || null;
  }
  let tarif = null;
  if (contract.tarifId) {
    const tRows = await db.select().from(tarifs).where(eq(tarifs.id, contract.tarifId));
    tarif = tRows[0] || null;
  }

  return c.json({
    ...contract,
    member: member[0] || null,
    membershipType: mt,
    tarif,
    pauses,
    invoices: contractInvoices,
  });
});

// ─── POST / — Create contract ───────────────────────────────────────────────
const createContractSchema = z.object({
  member_id: z.string(),
  contract_kind: z.string(),
  membership_type_id: z.string().optional(),
  tarif_id: z.string().optional(),
  group_id: z.string().optional(),
  family_id: z.string().optional(),
  start_date: z.string(),
  end_date: z.string().optional(),
  billing_period: z.string().optional(),
  current_price: z.number().optional(),
  auto_renew: z.boolean().optional(),
  notes: z.string().optional(),
});

contractRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const parsed = createContractSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;
  const contractNumber = await generateContractNumber(db, user.orgId);

  // Derive settings from membership type or tarif
  let price = data.current_price;
  let endDate = data.end_date || null;
  let renewalDurationMonths: number | null = null;
  let cancellationNoticeDays: number | null = null;
  let cancellationNoticeBasis: string | null = null;
  let renewalCancellationDays: number | null = null;

  if (data.membership_type_id) {
    const mt = await db.select().from(membershipTypes).where(eq(membershipTypes.id, data.membership_type_id));
    if (mt.length > 0) {
      const m = mt[0];
      renewalDurationMonths = m.renewalDurationMonths;
      cancellationNoticeDays = m.cancellationNoticeDays;
      cancellationNoticeBasis = m.cancellationNoticeBasis;
      renewalCancellationDays = m.renewalCancellationDays;
      if (m.contractDurationMonths && !data.end_date) {
        const start = new Date(data.start_date);
        start.setMonth(start.getMonth() + m.contractDurationMonths);
        endDate = start.toISOString().slice(0, 10);
      }
      if (price === undefined && data.billing_period) {
        const pricing = await db.select().from(tarifPricing)
          .where(and(eq(tarifPricing.parentId, data.membership_type_id), eq(tarifPricing.parentType, 'membership_type'), eq(tarifPricing.billingPeriod, data.billing_period)));
        if (pricing.length > 0) price = pricing[0].price;
      }
    }
  }

  if (data.tarif_id) {
    const t = await db.select().from(tarifs).where(eq(tarifs.id, data.tarif_id));
    if (t.length > 0) {
      const tr = t[0];
      renewalDurationMonths = renewalDurationMonths || tr.renewalDurationMonths;
      cancellationNoticeDays = cancellationNoticeDays || tr.cancellationNoticeDays;
      cancellationNoticeBasis = cancellationNoticeBasis || tr.cancellationNoticeBasis;
      renewalCancellationDays = renewalCancellationDays || tr.renewalCancellationDays;
      if (tr.contractDurationMonths && !endDate) {
        const start = new Date(data.start_date);
        start.setMonth(start.getMonth() + tr.contractDurationMonths);
        endDate = start.toISOString().slice(0, 10);
      }
      if (price === undefined && data.billing_period) {
        const pricing = await db.select().from(tarifPricing)
          .where(and(eq(tarifPricing.parentId, data.tarif_id), eq(tarifPricing.parentType, 'tarif'), eq(tarifPricing.billingPeriod, data.billing_period)));
        if (pricing.length > 0) price = pricing[0].price;
      }
    }
  }

  const newContract = await db.insert(contracts).values({
    orgId: user.orgId,
    contractNumber,
    memberId: data.member_id,
    contractKind: data.contract_kind,
    membershipTypeId: data.membership_type_id || null,
    tarifId: data.tarif_id || null,
    groupId: data.group_id || null,
    familyId: data.family_id || null,
    startDate: data.start_date,
    endDate,
    billingPeriod: data.billing_period || null,
    currentPrice: price ?? null,
    autoRenew: data.auto_renew ? 1 : 0,
    renewalDurationMonths,
    cancellationNoticeDays,
    cancellationNoticeBasis,
    renewalCancellationDays,
    notes: data.notes || null,
    status: 'ACTIVE',
    createdBy: user.id,
  }).returning();

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Vertrag erstellt', 'contract', newContract[0].id, contractNumber);

  return c.json({ id: newContract[0].id, contractNumber }, 201);
});

// ─── PUT /:id — Update contract ─────────────────────────────────────────────
contractRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Vertrag', id);

  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.status !== undefined) updateData.status = body.status;
  if (body.current_price !== undefined) updateData.currentPrice = body.current_price;
  if (body.billing_period !== undefined) updateData.billingPeriod = body.billing_period;
  if (body.end_date !== undefined) updateData.endDate = body.end_date;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.auto_renew !== undefined) updateData.autoRenew = body.auto_renew ? 1 : 0;

  await db.update(contracts).set(updateData).where(eq(contracts.id, id));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Vertrag bearbeitet', 'contract', id);

  return c.json({ success: true });
});

// ─── POST /:id/cancel — Cancel contract ────────────────────────────────────
contractRoutes.post('/:id/cancel', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Vertrag', id);
  if (existing[0].status === 'CANCELLED') throw new ConflictError('Vertrag ist bereits gekündigt');

  const noticeDays = existing[0].cancellationNoticeDays || 30;
  const cancellationDate = new Date().toISOString().slice(0, 10);
  const effectiveDate = body.effective_date || (() => {
    const d = new Date();
    d.setDate(d.getDate() + noticeDays);
    return d.toISOString().slice(0, 10);
  })();

  await db.update(contracts).set({
    status: 'CANCELLED',
    hasNotice: 1,
    cancellationDate,
    cancellationEffectiveDate: effectiveDate,
    notes: body.reason ? `${existing[0].notes || ''}\nKündigung: ${body.reason}`.trim() : existing[0].notes,
    updatedAt: new Date().toISOString(),
  }).where(eq(contracts.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Vertrag gekündigt', 'contract', id);

  return c.json({ success: true, effectiveDate });
});

// ─── POST /:id/pause — Pause contract ──────────────────────────────────────
contractRoutes.post('/:id/pause', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  if (!body.pause_from || !body.pause_until) throw new ValidationError('pause_from und pause_until sind erforderlich');

  const existing = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Vertrag', id);

  await db.insert(contractPauses).values({
    contractId: id,
    pauseFrom: body.pause_from,
    pauseUntil: body.pause_until,
    reason: body.reason || null,
    creditAmount: body.credit_amount || 0,
  });

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Vertragspause angelegt', 'contract', id);

  return c.json({ success: true });
});

// ─── POST /:id/invoice — Generate invoice for contract ──────────────────────
contractRoutes.post('/:id/invoice', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Vertrag', id);

  const contract = existing[0];
  if (!contract.currentPrice) throw new ValidationError('Kein Preis am Vertrag hinterlegt');

  const invoiceNumber = await generateInvoiceNumber(db, user.orgId);

  const inv = await db.insert(invoices).values({
    orgId: user.orgId,
    userId: contract.memberId,
    invoiceNumber,
    status: 'draft',
    subtotal: contract.currentPrice,
    total: contract.currentPrice,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    contractId: id,
    notes: `Vertrag: ${contract.contractNumber}`,
  }).returning();

  await db.insert(invoiceItems).values({
    invoiceId: inv[0].id,
    description: `Mitgliedsbeitrag (${contract.billingPeriod || 'monatlich'})`,
    quantity: 1,
    unitPrice: contract.currentPrice,
    total: contract.currentPrice,
  });

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rechnung erstellt', 'invoice', inv[0].id);

  return c.json({ invoiceId: inv[0].id, invoiceNumber }, 201);
});

// ─── DELETE /:id — Delete contract ──────────────────────────────────────────
contractRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  await db.delete(contractPauses).where(eq(contractPauses.contractId, id));
  await db.delete(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Vertrag gelöscht', 'contract', id);

  return c.json({ success: true });
});
