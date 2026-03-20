import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, count, desc } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { membershipTypes, tarifPricing, tarifDiscounts, contracts, groups } from '../db/schema';
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const membershipTypeRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const membershipTypeSchema = z.object({
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
  is_family_tarif: z.boolean().optional(),
  min_family_members: z.number().optional(),
  sort_order: z.number().optional(),
  pricing: z.array(z.object({
    billing_period: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']),
    price: z.number(),
  })).optional(),
});

// ─── GET / — List membership types ──────────────────────────────────────────
membershipTypeRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(membershipTypes)
    .where(eq(membershipTypes.orgId, user.orgId))
    .orderBy(membershipTypes.sortOrder);

  // Enrich with pricing
  const enriched = await Promise.all(rows.map(async (mt) => {
    const pricing = await db.select().from(tarifPricing)
      .where(and(eq(tarifPricing.parentId, mt.id), eq(tarifPricing.parentType, 'MEMBERSHIP_TYPE')));

    let groupName = '';
    if (mt.defaultGroupId) {
      const g = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, mt.defaultGroupId));
      groupName = g[0]?.name || '';
    }

    return { ...mt, pricing, groupName };
  }));

  return c.json({ data: enriched });
});

// ─── POST / — Create membership type ───────────────────────────────────────
membershipTypeRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const parsed = membershipTypeSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;

  const result = await db.insert(membershipTypes).values({
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
    isFamilyTarif: data.is_family_tarif ? 1 : 0,
    minFamilyMembers: data.min_family_members ?? 3,
    sortOrder: data.sort_order ?? 0,
  }).returning();

  // Create pricing entries
  if (data.pricing?.length) {
    for (const p of data.pricing) {
      await db.insert(tarifPricing).values({
        orgId: user.orgId,
        parentId: result[0].id,
        parentType: 'MEMBERSHIP_TYPE',
        billingPeriod: p.billing_period,
        price: p.price,
      });
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Mitgliedsart '${data.name}' erstellt`, 'membership_type', result[0].id);
  return c.json(result[0], 201);
});

// ─── PUT /:id — Update membership type ──────────────────────────────────────
membershipTypeRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = membershipTypeSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const existing = await db.select().from(membershipTypes)
    .where(and(eq(membershipTypes.id, id), eq(membershipTypes.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Mitgliedsart', id);

  const data = parsed.data;
  await db.update(membershipTypes).set({
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
    isFamilyTarif: data.is_family_tarif ? 1 : 0,
    minFamilyMembers: data.min_family_members ?? 3,
    sortOrder: data.sort_order ?? 0,
    updatedAt: new Date().toISOString(),
  }).where(eq(membershipTypes.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Mitgliedsart '${data.name}' bearbeitet`, 'membership_type', id);
  return c.json({ success: true });
});

// ─── DELETE /:id — Delete membership type ───────────────────────────────────
membershipTypeRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(membershipTypes)
    .where(and(eq(membershipTypes.id, id), eq(membershipTypes.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Mitgliedsart', id);

  // Check for active contracts
  const activeContracts = await db.select({ count: count() }).from(contracts)
    .where(and(eq(contracts.membershipTypeId, id), eq(contracts.status, 'ACTIVE')));
  if ((activeContracts[0]?.count || 0) > 0) {
    throw new ConflictError('Mitgliedsart kann nicht gelöscht werden, da aktive Verträge existieren');
  }

  // Delete pricing
  await db.delete(tarifPricing).where(and(eq(tarifPricing.parentId, id), eq(tarifPricing.parentType, 'MEMBERSHIP_TYPE')));
  // Delete discounts
  await db.delete(tarifDiscounts).where(and(eq(tarifDiscounts.parentId, id), eq(tarifDiscounts.parentType, 'MEMBERSHIP_TYPE')));
  // Delete type
  await db.delete(membershipTypes).where(eq(membershipTypes.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Mitgliedsart '${existing[0].name}' gelöscht`, 'membership_type', id);
  return c.json({ success: true });
});

// ─── POST /:id/pricing — Set pricing ───────────────────────────────────────
membershipTypeRoutes.post('/:id/pricing', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const schema = z.object({
    pricing: z.array(z.object({
      billing_period: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']),
      price: z.number(),
    })),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  // Delete existing pricing for this type
  await db.delete(tarifPricing).where(and(eq(tarifPricing.parentId, id), eq(tarifPricing.parentType, 'MEMBERSHIP_TYPE')));

  // Insert new pricing
  for (const p of parsed.data.pricing) {
    await db.insert(tarifPricing).values({
      orgId: user.orgId,
      parentId: id,
      parentType: 'MEMBERSHIP_TYPE',
      billingPeriod: p.billing_period,
      price: p.price,
    });
  }

  return c.json({ success: true });
});

// ─── POST /:id/discounts — Set discounts ───────────────────────────────────
membershipTypeRoutes.post('/:id/discounts', async (c) => {
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

  // Delete existing discounts
  await db.delete(tarifDiscounts).where(and(eq(tarifDiscounts.parentId, id), eq(tarifDiscounts.parentType, 'MEMBERSHIP_TYPE')));

  // Insert new discounts
  for (const d of parsed.data.discounts) {
    await db.insert(tarifDiscounts).values({
      orgId: user.orgId,
      parentId: id,
      parentType: 'MEMBERSHIP_TYPE',
      billingPeriod: d.billing_period,
      discountGroupId: d.discount_group_id,
      discountType: d.discount_type,
      discountValue: d.discount_value,
    });
  }

  return c.json({ success: true });
});
