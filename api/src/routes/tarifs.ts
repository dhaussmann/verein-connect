import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, count } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { tarifs, tarifPricing, tarifDiscounts, contracts, groups } from '../db/schema';
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const tarifRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const tarifSchema = z.object({
  name: z.string().min(1),
  is_active: z.boolean().optional(),
  self_registration_enabled: z.boolean().optional(),
  short_description: z.string().optional(),
  description: z.string().optional(),
  bank_account_id: z.string().optional(),
  invoice_category: z.string().optional(),
  vat_percent: z.number().optional(),
  default_invoice_day: z.number().optional(),
  activation_fee: z.number().optional(),
  contract_type: z.enum(['ONCE', 'AUTO_RENEW', 'FIXED', 'FIXED_RENEW']).optional(),
  contract_duration_months: z.number().optional(),
  renewal_duration_months: z.number().optional(),
  cancellation_notice_days: z.number().optional(),
  cancellation_notice_basis: z.enum(['FROM_CANCELLATION', 'BEFORE_END_OF_PERIOD']).optional(),
  renewal_cancellation_days: z.number().optional(),
  default_group_id: z.string().nullable().optional(),
  allowed_membership_type_ids: z.array(z.string()).optional(),
  sort_order: z.number().optional(),
  pricing: z.array(z.object({
    billing_period: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']),
    price: z.number(),
    membership_type_id: z.string().nullable().optional(),
  })).optional(),
});

// ─── GET / — List tarifs ────────────────────────────────────────────────────
tarifRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(tarifs)
    .where(eq(tarifs.orgId, user.orgId))
    .orderBy(tarifs.sortOrder);

  const enriched = await Promise.all(rows.map(async (t) => {
    const pricing = await db.select().from(tarifPricing)
      .where(and(eq(tarifPricing.parentId, t.id), eq(tarifPricing.parentType, 'TARIF')));

    let groupName = '';
    if (t.defaultGroupId) {
      const g = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, t.defaultGroupId));
      groupName = g[0]?.name || '';
    }

    return {
      ...t,
      allowedMembershipTypeIds: JSON.parse(t.allowedMembershipTypeIds || '[]'),
      pricing,
      groupName,
    };
  }));

  return c.json({ data: enriched });
});

// ─── POST / — Create tarif ─────────────────────────────────────────────────
tarifRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const parsed = tarifSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;
  const result = await db.insert(tarifs).values({
    orgId: user.orgId,
    name: data.name,
    isActive: data.is_active === false ? 0 : 1,
    selfRegistrationEnabled: data.self_registration_enabled ? 1 : 0,
    shortDescription: data.short_description || null,
    description: data.description || null,
    bankAccountId: data.bank_account_id || null,
    invoiceCategory: data.invoice_category || null,
    vatPercent: data.vat_percent ?? 0,
    defaultInvoiceDay: data.default_invoice_day ?? 1,
    activationFee: data.activation_fee ?? 0,
    contractType: data.contract_type || 'AUTO_RENEW',
    contractDurationMonths: data.contract_duration_months || null,
    renewalDurationMonths: data.renewal_duration_months || null,
    cancellationNoticeDays: data.cancellation_notice_days ?? 30,
    cancellationNoticeBasis: data.cancellation_notice_basis || 'FROM_CANCELLATION',
    renewalCancellationDays: data.renewal_cancellation_days || null,
    defaultGroupId: data.default_group_id || null,
    allowedMembershipTypeIds: JSON.stringify(data.allowed_membership_type_ids || []),
    sortOrder: data.sort_order ?? 0,
  }).returning();

  if (data.pricing?.length) {
    for (const p of data.pricing) {
      await db.insert(tarifPricing).values({
        orgId: user.orgId,
        parentId: result[0].id,
        parentType: 'TARIF',
        billingPeriod: p.billing_period,
        price: p.price,
        membershipTypeId: p.membership_type_id || null,
      });
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Tarif '${data.name}' erstellt`, 'tarif', result[0].id);
  return c.json(result[0], 201);
});

// ─── PUT /:id — Update tarif ────────────────────────────────────────────────
tarifRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = tarifSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const existing = await db.select().from(tarifs).where(and(eq(tarifs.id, id), eq(tarifs.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Tarif', id);

  const data = parsed.data;
  await db.update(tarifs).set({
    name: data.name,
    isActive: data.is_active === false ? 0 : 1,
    selfRegistrationEnabled: data.self_registration_enabled ? 1 : 0,
    shortDescription: data.short_description || null,
    description: data.description || null,
    bankAccountId: data.bank_account_id || null,
    invoiceCategory: data.invoice_category || null,
    vatPercent: data.vat_percent ?? 0,
    defaultInvoiceDay: data.default_invoice_day ?? 1,
    activationFee: data.activation_fee ?? 0,
    contractType: data.contract_type || 'AUTO_RENEW',
    contractDurationMonths: data.contract_duration_months || null,
    renewalDurationMonths: data.renewal_duration_months || null,
    cancellationNoticeDays: data.cancellation_notice_days ?? 30,
    cancellationNoticeBasis: data.cancellation_notice_basis || 'FROM_CANCELLATION',
    renewalCancellationDays: data.renewal_cancellation_days || null,
    defaultGroupId: data.default_group_id || null,
    allowedMembershipTypeIds: JSON.stringify(data.allowed_membership_type_ids || []),
    sortOrder: data.sort_order ?? 0,
    updatedAt: new Date().toISOString(),
  }).where(eq(tarifs.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Tarif '${data.name}' bearbeitet`, 'tarif', id);
  return c.json({ success: true });
});

// ─── DELETE /:id — Delete tarif ─────────────────────────────────────────────
tarifRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(tarifs).where(and(eq(tarifs.id, id), eq(tarifs.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Tarif', id);

  const activeContracts = await db.select({ count: count() }).from(contracts)
    .where(and(eq(contracts.tarifId, id), eq(contracts.status, 'ACTIVE')));
  if ((activeContracts[0]?.count || 0) > 0) {
    throw new ConflictError('Tarif kann nicht gelöscht werden, da aktive Verträge existieren');
  }

  await db.delete(tarifPricing).where(and(eq(tarifPricing.parentId, id), eq(tarifPricing.parentType, 'TARIF')));
  await db.delete(tarifDiscounts).where(and(eq(tarifDiscounts.parentId, id), eq(tarifDiscounts.parentType, 'TARIF')));
  await db.delete(tarifs).where(eq(tarifs.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Tarif '${existing[0].name}' gelöscht`, 'tarif', id);
  return c.json({ success: true });
});

// ─── POST /:id/pricing — Set pricing ───────────────────────────────────────
tarifRoutes.post('/:id/pricing', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const schema = z.object({
    pricing: z.array(z.object({
      billing_period: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']),
      price: z.number(),
      membership_type_id: z.string().nullable().optional(),
    })),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  await db.delete(tarifPricing).where(and(eq(tarifPricing.parentId, id), eq(tarifPricing.parentType, 'TARIF')));

  for (const p of parsed.data.pricing) {
    await db.insert(tarifPricing).values({
      orgId: user.orgId,
      parentId: id,
      parentType: 'TARIF',
      billingPeriod: p.billing_period,
      price: p.price,
      membershipTypeId: p.membership_type_id || null,
    });
  }

  return c.json({ success: true });
});

// ─── POST /:id/discounts — Set discounts ───────────────────────────────────
tarifRoutes.post('/:id/discounts', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const schema = z.object({
    discounts: z.array(z.object({
      billing_period: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']),
      discount_group_id: z.string(),
      discount_type: z.enum(['PERCENT', 'FIXED']),
      discount_value: z.number(),
    })),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  await db.delete(tarifDiscounts).where(and(eq(tarifDiscounts.parentId, id), eq(tarifDiscounts.parentType, 'TARIF')));

  for (const d of parsed.data.discounts) {
    await db.insert(tarifDiscounts).values({
      orgId: user.orgId,
      parentId: id,
      parentType: 'TARIF',
      billingPeriod: d.billing_period,
      discountGroupId: d.discount_group_id,
      discountType: d.discount_type,
      discountValue: d.discount_value,
    });
  }

  return c.json({ success: true });
});
