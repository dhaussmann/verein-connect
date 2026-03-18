import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like, or, desc, asc, count, sql, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import {
  contracts, contractPauses, users, groups, membershipTypes, tarifs, tarifPricing,
  invoices, invoiceItems,
} from '../db/schema';
import { parsePagination, buildMeta } from '../lib/pagination';
import { NotFoundError, ValidationError, ConflictError, AppError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const contractRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Helper: Generate contract number ───────────────────────────────────────
async function nextContractNumber(db: ReturnType<typeof drizzle>, orgId: string): Promise<string> {
  const result = await db.select({ count: count() }).from(contracts).where(eq(contracts.orgId, orgId));
  const num = (result[0]?.count || 0) + 1;
  return `V-${num.toString().padStart(5, '0')}`;
}

// ─── Helper: Generate invoice number ────────────────────────────────────────
async function nextInvoiceNumber(db: ReturnType<typeof drizzle>, orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db.select({ count: count() }).from(invoices).where(eq(invoices.orgId, orgId));
  const num = (result[0]?.count || 0) + 1;
  return `RE-${year}-${num.toString().padStart(5, '0')}`;
}

// ─── Schemas ────────────────────────────────────────────────────────────────
const createContractSchema = z.object({
  member_id: z.string(),
  contract_kind: z.enum(['MEMBERSHIP', 'TARIF']),
  membership_type_id: z.string().optional(),
  tarif_id: z.string().optional(),
  parent_contract_id: z.string().optional(),
  group_id: z.string().optional(),
  start_date: z.string(),
  end_date: z.string().optional(),
  billing_period: z.string().optional(),
  current_price: z.number().optional(),
  auto_renew: z.boolean().optional(),
  notes: z.string().optional(),
});

const updateContractSchema = z.object({
  group_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  has_notice: z.boolean().optional(),
});

// ─── GET / — List contracts ─────────────────────────────────────────────────
contractRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const conditions: any[] = [eq(contracts.orgId, user.orgId)];
  if (query.status) conditions.push(eq(contracts.status, query.status));
  if (query.contract_kind) conditions.push(eq(contracts.contractKind, query.contract_kind));
  if (query.member_id) conditions.push(eq(contracts.memberId, query.member_id));
  if (query.group_id) conditions.push(eq(contracts.groupId, query.group_id));
  if (query.search) {
    const s = `%${query.search}%`;
    conditions.push(like(contracts.contractNumber, s));
  }

  const whereClause = and(...conditions);
  const totalResult = await db.select({ count: count() }).from(contracts).where(whereClause);
  const total = totalResult[0]?.count || 0;

  const rows = await db.select().from(contracts).where(whereClause)
    .orderBy(desc(contracts.createdAt)).limit(perPage).offset(offset);

  const enriched = await Promise.all(rows.map(async (c_row) => {
    const memberRow = await db.select({
      firstName: users.firstName, lastName: users.lastName, email: users.email,
    }).from(users).where(eq(users.id, c_row.memberId));

    let typeName = '';
    if (c_row.membershipTypeId) {
      const mt = await db.select({ name: membershipTypes.name }).from(membershipTypes).where(eq(membershipTypes.id, c_row.membershipTypeId));
      typeName = mt[0]?.name || '';
    }
    if (c_row.tarifId) {
      const t = await db.select({ name: tarifs.name }).from(tarifs).where(eq(tarifs.id, c_row.tarifId));
      typeName = t[0]?.name || '';
    }

    let groupName = '';
    if (c_row.groupId) {
      const g = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, c_row.groupId));
      groupName = g[0]?.name || '';
    }

    const member = memberRow[0];
    return {
      id: c_row.id,
      contractNumber: c_row.contractNumber,
      memberId: c_row.memberId,
      memberName: member ? `${member.firstName} ${member.lastName}` : '',
      memberEmail: member?.email || '',
      memberInitials: member ? `${(member.firstName || '')[0]}${(member.lastName || '')[0]}`.toUpperCase() : '',
      contractKind: c_row.contractKind,
      typeName,
      groupId: c_row.groupId,
      groupName,
      status: c_row.status,
      startDate: c_row.startDate,
      endDate: c_row.endDate,
      currentPrice: c_row.currentPrice,
      billingPeriod: c_row.billingPeriod,
      autoRenew: c_row.autoRenew,
      cancellationDate: c_row.cancellationDate,
      cancellationEffectiveDate: c_row.cancellationEffectiveDate,
      createdAt: c_row.createdAt,
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

  // Member info
  const memberRow = await db.select().from(users).where(eq(users.id, contract.memberId));
  const member = memberRow[0];

  // Pauses
  const pauses = await db.select().from(contractPauses).where(eq(contractPauses.contractId, id));

  // Related invoices
  const contractInvoices = await db.select().from(invoices)
    .where(and(eq(invoices.contractId, id), eq(invoices.orgId, user.orgId)))
    .orderBy(desc(invoices.createdAt));

  // Child contracts (Serviceverträge)
  const children = await db.select().from(contracts)
    .where(and(eq(contracts.parentContractId, id), eq(contracts.orgId, user.orgId)));

  // Type/tarif name
  let typeName = '';
  if (contract.membershipTypeId) {
    const mt = await db.select({ name: membershipTypes.name }).from(membershipTypes).where(eq(membershipTypes.id, contract.membershipTypeId));
    typeName = mt[0]?.name || '';
  }
  if (contract.tarifId) {
    const t = await db.select({ name: tarifs.name }).from(tarifs).where(eq(tarifs.id, contract.tarifId));
    typeName = t[0]?.name || '';
  }

  // Group name
  let groupName = '';
  if (contract.groupId) {
    const g = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, contract.groupId));
    groupName = g[0]?.name || '';
  }

  // Created by
  let createdByName = '';
  if (contract.createdBy) {
    const cb = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, contract.createdBy));
    createdByName = cb[0] ? `${cb[0].firstName} ${cb[0].lastName}` : '';
  }

  return c.json({
    ...contract,
    typeName,
    groupName,
    createdByName,
    member: member ? {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      mobile: member.mobile,
      street: member.street,
      zip: member.zip,
      city: member.city,
    } : null,
    pauses,
    invoices: contractInvoices,
    children,
  });
});

// ─── POST / — Create contract ───────────────────────────────────────────────
contractRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const parsed = createContractSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;
  const contractNumber = await nextContractNumber(db, user.orgId);

  // Get defaults from membership type or tarif
  let defaults: any = {};
  if (data.contract_kind === 'MEMBERSHIP' && data.membership_type_id) {
    const mt = await db.select().from(membershipTypes).where(eq(membershipTypes.id, data.membership_type_id));
    if (mt[0]) defaults = mt[0];
  } else if (data.contract_kind === 'TARIF' && data.tarif_id) {
    const t = await db.select().from(tarifs).where(eq(tarifs.id, data.tarif_id));
    if (t[0]) defaults = t[0];
  }

  // Get price from tarif_pricing if not explicitly set
  let price = data.current_price;
  if (price === undefined && defaults.id) {
    const parentType = data.contract_kind === 'MEMBERSHIP' ? 'MEMBERSHIP_TYPE' : 'TARIF';
    const period = data.billing_period || 'MONTHLY';
    const pricing = await db.select().from(tarifPricing)
      .where(and(
        eq(tarifPricing.parentId, defaults.id),
        eq(tarifPricing.parentType, parentType),
        eq(tarifPricing.billingPeriod, period),
      ));
    price = pricing[0]?.price || 0;
  }

  // Calculate end_date
  let endDate = data.end_date || null;
  if (!endDate && defaults.contractDurationMonths) {
    const start = new Date(data.start_date);
    start.setMonth(start.getMonth() + defaults.contractDurationMonths);
    endDate = start.toISOString().slice(0, 10);
  }

  const newContract = {
    orgId: user.orgId,
    contractNumber,
    memberId: data.member_id,
    contractKind: data.contract_kind,
    membershipTypeId: data.membership_type_id || null,
    tarifId: data.tarif_id || null,
    parentContractId: data.parent_contract_id || null,
    groupId: data.group_id || defaults.defaultGroupId || null,
    status: 'ACTIVE' as const,
    startDate: data.start_date,
    endDate,
    billingPeriod: data.billing_period || 'MONTHLY',
    currentPrice: price || 0,
    autoRenew: (data.auto_renew ?? (defaults.contractType === 'AUTO_RENEW' || defaults.contractType === 'FIXED_RENEW')) ? 1 : 0,
    renewalDurationMonths: defaults.renewalDurationMonths || null,
    cancellationNoticeDays: defaults.cancellationNoticeDays || 30,
    cancellationNoticeBasis: defaults.cancellationNoticeBasis || 'FROM_CANCELLATION',
    renewalCancellationDays: defaults.renewalCancellationDays || null,
    notes: data.notes || null,
    createdBy: user.id,
  };

  const result = await db.insert(contracts).values(newContract).returning();
  await writeAuditLog(c.env.DB, user.orgId, user.id, `Vertrag ${contractNumber} erstellt`, 'contract', result[0].id);

  return c.json(result[0], 201);
});

// ─── PUT /:id — Update contract ─────────────────────────────────────────────
contractRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateContractSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const existing = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Vertrag', id);

  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
  const data = parsed.data;
  if (data.group_id !== undefined) updateData.groupId = data.group_id;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.has_notice !== undefined) updateData.hasNotice = data.has_notice ? 1 : 0;

  await db.update(contracts).set(updateData).where(eq(contracts.id, id));
  await writeAuditLog(c.env.DB, user.orgId, user.id, `Vertrag ${existing[0].contractNumber} bearbeitet`, 'contract', id);

  return c.json({ success: true });
});

// ─── POST /:id/cancel — Cancel contract ─────────────────────────────────────
contractRoutes.post('/:id/cancel', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const schema = z.object({ cancellation_date: z.string() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError('cancellation_date ist erforderlich');

  const existing = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Vertrag', id);
  const contract = existing[0];

  if (contract.status !== 'ACTIVE') throw new AppError(400, 'Nur aktive Verträge können gekündigt werden');

  // Calculate effective date
  const cancellationDate = new Date(parsed.data.cancellation_date);
  let effectiveDate: Date;

  if (contract.cancellationNoticeBasis === 'BEFORE_END_OF_PERIOD' && contract.endDate) {
    // Check if notice is before end of period minus notice months
    const endDate = new Date(contract.endDate);
    const noticeDeadline = new Date(endDate);
    noticeDeadline.setMonth(noticeDeadline.getMonth() - (contract.cancellationNoticeDays || 1));

    if (cancellationDate <= noticeDeadline) {
      effectiveDate = endDate;
    } else {
      // Next period end
      const nextEnd = new Date(endDate);
      nextEnd.setMonth(nextEnd.getMonth() + (contract.renewalDurationMonths || 12));
      effectiveDate = nextEnd;
    }
  } else {
    // FROM_CANCELLATION: cancellation_date + notice months
    effectiveDate = new Date(cancellationDate);
    effectiveDate.setMonth(effectiveDate.getMonth() + (contract.cancellationNoticeDays || 1));
  }

  await db.update(contracts).set({
    cancellationDate: parsed.data.cancellation_date,
    cancellationEffectiveDate: effectiveDate.toISOString().slice(0, 10),
    autoRenew: 0,
    updatedAt: new Date().toISOString(),
  }).where(eq(contracts.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id,
    `Vertrag ${contract.contractNumber} gekündigt zum ${effectiveDate.toLocaleDateString('de-DE')}`,
    'contract', id);

  return c.json({ success: true, cancellation_effective_date: effectiveDate.toISOString().slice(0, 10) });
});

// ─── POST /:id/pause — Pause contract ──────────────────────────────────────
contractRoutes.post('/:id/pause', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const schema = z.object({
    pause_from: z.string(),
    pause_until: z.string(),
    reason: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const existing = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Vertrag', id);
  const contract = existing[0];

  if (contract.status !== 'ACTIVE') throw new AppError(400, 'Nur aktive Verträge können pausiert werden');

  // Check overlap
  const existingPauses = await db.select().from(contractPauses).where(eq(contractPauses.contractId, id));
  const newFrom = new Date(parsed.data.pause_from);
  const newUntil = new Date(parsed.data.pause_until);

  for (const p of existingPauses) {
    const pFrom = new Date(p.pauseFrom);
    const pUntil = new Date(p.pauseUntil);
    if (newFrom <= pUntil && newUntil >= pFrom) {
      throw new ConflictError('Pausenzeitraum überschneidet sich mit einer bestehenden Pause');
    }
  }

  // Calculate credit
  const pauseDays = Math.ceil((newUntil.getTime() - newFrom.getTime()) / (1000 * 60 * 60 * 24));
  const periodDays = contract.billingPeriod === 'YEARLY' ? 365
    : contract.billingPeriod === 'HALF_YEARLY' ? 182
    : contract.billingPeriod === 'QUARTERLY' ? 91
    : 30;
  const creditAmount = Math.round(((pauseDays / periodDays) * (contract.currentPrice || 0)) * 100) / 100;

  const result = await db.insert(contractPauses).values({
    contractId: id,
    pauseFrom: parsed.data.pause_from,
    pauseUntil: parsed.data.pause_until,
    reason: parsed.data.reason || null,
    creditAmount,
  }).returning();

  await writeAuditLog(c.env.DB, user.orgId, user.id,
    `Vertrag ${contract.contractNumber} pausiert ${parsed.data.pause_from} – ${parsed.data.pause_until}`,
    'contract', id);

  return c.json(result[0], 201);
});

// ─── DELETE /:id/pause/:pid — Remove pause ──────────────────────────────────
contractRoutes.delete('/:id/pause/:pid', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const pid = c.req.param('pid');

  const existing = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Vertrag', id);

  await db.delete(contractPauses).where(and(eq(contractPauses.id, pid), eq(contractPauses.contractId, id)));
  await writeAuditLog(c.env.DB, user.orgId, user.id, `Pause entfernt von Vertrag ${existing[0].contractNumber}`, 'contract', id);

  return c.json({ success: true });
});

// ─── DELETE /:id — Delete contract ───────────────────────────────────────────
contractRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Vertrag', id);

  // Delete related pauses
  await db.delete(contractPauses).where(eq(contractPauses.contractId, id));
  // Delete the contract
  await db.delete(contracts).where(eq(contracts.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Vertrag ${existing[0].contractNumber} gelöscht`, 'contract', id);

  return c.json({ success: true });
});

// ─── POST /:id/mark-paid — Mark as paid until date ──────────────────────────
contractRoutes.post('/:id/mark-paid', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const schema = z.object({ paid_until: z.string() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError('paid_until ist erforderlich');

  const existing = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Vertrag', id);

  await db.update(contracts).set({
    paidUntil: parsed.data.paid_until,
    updatedAt: new Date().toISOString(),
  }).where(eq(contracts.id, id));

  return c.json({ success: true });
});

// ─── POST /:id/invoice — Create manual invoice ─────────────────────────────
contractRoutes.post('/:id/invoice', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Vertrag', id);
  const contract = existing[0];

  const invoiceNumber = await nextInvoiceNumber(db, user.orgId);
  const price = contract.currentPrice || 0;

  // Get VAT from type/tarif
  let vatPercent = 0;
  if (contract.membershipTypeId) {
    const mt = await db.select({ vatPercent: membershipTypes.vatPercent }).from(membershipTypes).where(eq(membershipTypes.id, contract.membershipTypeId));
    vatPercent = mt[0]?.vatPercent || 0;
  } else if (contract.tarifId) {
    const t = await db.select({ vatPercent: tarifs.vatPercent }).from(tarifs).where(eq(tarifs.id, contract.tarifId));
    vatPercent = t[0]?.vatPercent || 0;
  }

  const taxAmount = Math.round((price * vatPercent / 100) * 100) / 100;
  const total = Math.round((price + taxAmount) * 100) / 100;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  const inv = await db.insert(invoices).values({
    orgId: user.orgId,
    userId: contract.memberId,
    invoiceNumber,
    type: 'invoice',
    status: 'draft',
    subtotal: price,
    taxRate: vatPercent,
    taxAmount,
    total,
    dueDate: dueDate.toISOString().slice(0, 10),
    contractId: id,
  }).returning();

  // Create invoice item
  const periodLabel = contract.billingPeriod === 'YEARLY' ? 'Jahresbeitrag'
    : contract.billingPeriod === 'HALF_YEARLY' ? 'Halbjahresbeitrag'
    : contract.billingPeriod === 'QUARTERLY' ? 'Quartalsbeitrag'
    : 'Monatsbeitrag';

  await db.insert(invoiceItems).values({
    invoiceId: inv[0].id,
    description: `${periodLabel} – Vertrag ${contract.contractNumber}`,
    quantity: 1,
    unitPrice: price,
    total: price,
  });

  await writeAuditLog(c.env.DB, user.orgId, user.id,
    `Rechnung ${invoiceNumber} für Vertrag ${contract.contractNumber} erstellt`,
    'invoice', inv[0].id);

  return c.json(inv[0], 201);
});

// ─── POST /bulk-invoice — Bulk invoice generation ───────────────────────────
contractRoutes.post('/bulk-invoice', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  // Find all active contracts that need invoicing
  const activeContracts = await db.select().from(contracts)
    .where(and(eq(contracts.orgId, user.orgId), eq(contracts.status, 'ACTIVE')));

  let created = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const contract of activeContracts) {
    // Skip if paid_until is in the future
    if (contract.paidUntil && contract.paidUntil > today) continue;

    const invoiceNumber = await nextInvoiceNumber(db, user.orgId);
    const price = contract.currentPrice || 0;
    if (price <= 0) continue;

    let vatPercent = 0;
    if (contract.membershipTypeId) {
      const mt = await db.select({ vatPercent: membershipTypes.vatPercent }).from(membershipTypes).where(eq(membershipTypes.id, contract.membershipTypeId));
      vatPercent = mt[0]?.vatPercent || 0;
    } else if (contract.tarifId) {
      const t = await db.select({ vatPercent: tarifs.vatPercent }).from(tarifs).where(eq(tarifs.id, contract.tarifId));
      vatPercent = t[0]?.vatPercent || 0;
    }

    const taxAmount = Math.round((price * vatPercent / 100) * 100) / 100;
    const total = Math.round((price + taxAmount) * 100) / 100;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const inv = await db.insert(invoices).values({
      orgId: user.orgId,
      userId: contract.memberId,
      invoiceNumber,
      type: 'invoice',
      status: 'draft',
      subtotal: price,
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

    await db.insert(invoiceItems).values({
      invoiceId: inv[0].id,
      description: `${periodLabel} – Vertrag ${contract.contractNumber}`,
      quantity: 1,
      unitPrice: price,
      total: price,
    });

    created++;
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Massenabrechnung: ${created} Rechnungen erstellt`, 'billing');

  return c.json({ created });
});
