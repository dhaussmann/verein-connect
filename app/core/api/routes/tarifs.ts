import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, count } from 'drizzle-orm';
import type { Env, AuthUser } from '../../types/env';
import { tarifs, tarifPricing, tarifDiscounts, contracts } from '../../db/schema';
import { NotFoundError, ConflictError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const tarifRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

tarifRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(tarifs).where(eq(tarifs.orgId, user.orgId)).orderBy(tarifs.sortOrder);

  const enriched = await Promise.all(rows.map(async (t) => {
    const pricing = await db.select().from(tarifPricing)
      .where(and(eq(tarifPricing.parentId, t.id), eq(tarifPricing.parentType, 'tarif')));
    const discounts = await db.select().from(tarifDiscounts)
      .where(and(eq(tarifDiscounts.parentId, t.id), eq(tarifDiscounts.parentType, 'tarif')));
    const activeContracts = await db.select({ count: count() }).from(contracts)
      .where(and(eq(contracts.tarifId, t.id), eq(contracts.status, 'ACTIVE')));
    return { ...t, pricing, discounts, activeContractCount: activeContracts[0]?.count || 0 };
  }));

  return c.json(enriched);
});

tarifRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const rows = await db.select().from(tarifs).where(and(eq(tarifs.id, id), eq(tarifs.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Tarif', id);

  const pricing = await db.select().from(tarifPricing).where(and(eq(tarifPricing.parentId, id), eq(tarifPricing.parentType, 'tarif')));
  const discounts = await db.select().from(tarifDiscounts).where(and(eq(tarifDiscounts.parentId, id), eq(tarifDiscounts.parentType, 'tarif')));
  return c.json({ ...rows[0], pricing, discounts });
});

tarifRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const t = await db.insert(tarifs).values({
    orgId: user.orgId,
    name: body.name,
    isActive: body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1,
    selfRegistrationEnabled: body.self_registration_enabled ? 1 : 0,
    shortDescription: body.short_description || null,
    description: body.description || null,
    vatPercent: body.vat_percent ?? 0,
    activationFee: body.activation_fee ?? 0,
    contractType: body.contract_type || 'AUTO_RENEW',
    contractDurationMonths: body.contract_duration_months || null,
    renewalDurationMonths: body.renewal_duration_months || null,
    cancellationNoticeDays: body.cancellation_notice_days ?? 30,
    cancellationNoticeBasis: body.cancellation_notice_basis || 'FROM_CANCELLATION',
    renewalCancellationDays: body.renewal_cancellation_days || null,
    defaultGroupId: body.default_group_id || null,
    allowedMembershipTypeIds: body.allowed_membership_type_ids ? JSON.stringify(body.allowed_membership_type_ids) : '[]',
    sortOrder: body.sort_order ?? 0,
  }).returning();

  if (body.pricing && Array.isArray(body.pricing)) {
    for (const p of body.pricing) {
      await db.insert(tarifPricing).values({
        orgId: user.orgId, parentId: t[0].id, parentType: 'tarif',
        billingPeriod: p.billing_period, price: p.price,
      });
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Tarif erstellt', 'tarif', t[0].id, body.name);
  return c.json({ id: t[0].id }, 201);
});

tarifRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(tarifs).where(and(eq(tarifs.id, id), eq(tarifs.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Tarif', id);

  const u: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) u.name = body.name;
  if (body.is_active !== undefined) u.isActive = body.is_active ? 1 : 0;
  if (body.self_registration_enabled !== undefined) u.selfRegistrationEnabled = body.self_registration_enabled ? 1 : 0;
  if (body.short_description !== undefined) u.shortDescription = body.short_description;
  if (body.description !== undefined) u.description = body.description;
  if (body.vat_percent !== undefined) u.vatPercent = body.vat_percent;
  if (body.activation_fee !== undefined) u.activationFee = body.activation_fee;
  if (body.contract_type !== undefined) u.contractType = body.contract_type;
  if (body.contract_duration_months !== undefined) u.contractDurationMonths = body.contract_duration_months;
  if (body.allowed_membership_type_ids !== undefined) u.allowedMembershipTypeIds = JSON.stringify(body.allowed_membership_type_ids);

  await db.update(tarifs).set(u).where(eq(tarifs.id, id));

  if (body.pricing && Array.isArray(body.pricing)) {
    await db.delete(tarifPricing).where(and(eq(tarifPricing.parentId, id), eq(tarifPricing.parentType, 'tarif')));
    for (const p of body.pricing) {
      await db.insert(tarifPricing).values({
        orgId: user.orgId, parentId: id, parentType: 'tarif',
        billingPeriod: p.billing_period, price: p.price,
      });
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Tarif bearbeitet', 'tarif', id);
  return c.json({ success: true });
});

tarifRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const active = await db.select({ count: count() }).from(contracts)
    .where(and(eq(contracts.tarifId, id), eq(contracts.status, 'ACTIVE')));
  if ((active[0]?.count || 0) > 0) throw new ConflictError('Tarif hat aktive Verträge');

  await db.delete(tarifPricing).where(and(eq(tarifPricing.parentId, id), eq(tarifPricing.parentType, 'tarif')));
  await db.delete(tarifDiscounts).where(and(eq(tarifDiscounts.parentId, id), eq(tarifDiscounts.parentType, 'tarif')));
  await db.delete(tarifs).where(and(eq(tarifs.id, id), eq(tarifs.orgId, user.orgId)));

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Tarif gelöscht', 'tarif', id);
  return c.json({ success: true });
});
