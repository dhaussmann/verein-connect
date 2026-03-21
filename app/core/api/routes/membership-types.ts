import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, count } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../../types/env';
import { membershipTypes, tarifPricing, tarifDiscounts, contracts } from '../../db/schema';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const membershipTypeRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── GET / — List membership types ──────────────────────────────────────────
membershipTypeRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(membershipTypes).where(eq(membershipTypes.orgId, user.orgId)).orderBy(membershipTypes.sortOrder);

  const enriched = await Promise.all(rows.map(async (mt) => {
    const pricing = await db.select().from(tarifPricing)
      .where(and(eq(tarifPricing.parentId, mt.id), eq(tarifPricing.parentType, 'membership_type')));
    const discounts = await db.select().from(tarifDiscounts)
      .where(and(eq(tarifDiscounts.parentId, mt.id), eq(tarifDiscounts.parentType, 'membership_type')));
    const activeContracts = await db.select({ count: count() }).from(contracts)
      .where(and(eq(contracts.membershipTypeId, mt.id), eq(contracts.status, 'ACTIVE')));
    return { ...mt, pricing, discounts, activeContractCount: activeContracts[0]?.count || 0 };
  }));

  return c.json(enriched);
});

// ─── GET /:id — Detail ─────────────────────────────────────────────────────
membershipTypeRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(membershipTypes).where(and(eq(membershipTypes.id, id), eq(membershipTypes.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Mitgliedsart', id);

  const pricing = await db.select().from(tarifPricing)
    .where(and(eq(tarifPricing.parentId, id), eq(tarifPricing.parentType, 'membership_type')));
  const discounts = await db.select().from(tarifDiscounts)
    .where(and(eq(tarifDiscounts.parentId, id), eq(tarifDiscounts.parentType, 'membership_type')));

  return c.json({ ...rows[0], pricing, discounts });
});

// ─── POST / — Create ────────────────────────────────────────────────────────
membershipTypeRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const mt = await db.insert(membershipTypes).values({
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
    isFamilyTarif: body.is_family_tarif ? 1 : 0,
    minFamilyMembers: body.min_family_members ?? 3,
    sortOrder: body.sort_order ?? 0,
  }).returning();

  // Add pricing
  if (body.pricing && Array.isArray(body.pricing)) {
    for (const p of body.pricing) {
      await db.insert(tarifPricing).values({
        orgId: user.orgId,
        parentId: mt[0].id,
        parentType: 'membership_type',
        billingPeriod: p.billing_period,
        price: p.price,
      });
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Mitgliedsart erstellt', 'membership_type', mt[0].id, body.name);

  return c.json({ id: mt[0].id }, 201);
});

// ─── PUT /:id — Update ──────────────────────────────────────────────────────
membershipTypeRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(membershipTypes).where(and(eq(membershipTypes.id, id), eq(membershipTypes.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Mitgliedsart', id);

  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.is_active !== undefined) updateData.isActive = body.is_active ? 1 : 0;
  if (body.self_registration_enabled !== undefined) updateData.selfRegistrationEnabled = body.self_registration_enabled ? 1 : 0;
  if (body.short_description !== undefined) updateData.shortDescription = body.short_description;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.vat_percent !== undefined) updateData.vatPercent = body.vat_percent;
  if (body.activation_fee !== undefined) updateData.activationFee = body.activation_fee;
  if (body.contract_type !== undefined) updateData.contractType = body.contract_type;
  if (body.contract_duration_months !== undefined) updateData.contractDurationMonths = body.contract_duration_months;
  if (body.renewal_duration_months !== undefined) updateData.renewalDurationMonths = body.renewal_duration_months;
  if (body.cancellation_notice_days !== undefined) updateData.cancellationNoticeDays = body.cancellation_notice_days;
  if (body.cancellation_notice_basis !== undefined) updateData.cancellationNoticeBasis = body.cancellation_notice_basis;
  if (body.is_family_tarif !== undefined) updateData.isFamilyTarif = body.is_family_tarif ? 1 : 0;
  if (body.min_family_members !== undefined) updateData.minFamilyMembers = body.min_family_members;

  await db.update(membershipTypes).set(updateData).where(eq(membershipTypes.id, id));

  // Update pricing
  if (body.pricing && Array.isArray(body.pricing)) {
    await db.delete(tarifPricing).where(and(eq(tarifPricing.parentId, id), eq(tarifPricing.parentType, 'membership_type')));
    for (const p of body.pricing) {
      await db.insert(tarifPricing).values({
        orgId: user.orgId,
        parentId: id,
        parentType: 'membership_type',
        billingPeriod: p.billing_period,
        price: p.price,
      });
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Mitgliedsart bearbeitet', 'membership_type', id);

  return c.json({ success: true });
});

// ─── DELETE /:id ─────────────────────────────────────────────────────────────
membershipTypeRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const activeContracts = await db.select({ count: count() }).from(contracts)
    .where(and(eq(contracts.membershipTypeId, id), eq(contracts.status, 'ACTIVE')));
  if ((activeContracts[0]?.count || 0) > 0) throw new ConflictError('Mitgliedsart hat aktive Verträge');

  await db.delete(tarifPricing).where(and(eq(tarifPricing.parentId, id), eq(tarifPricing.parentType, 'membership_type')));
  await db.delete(tarifDiscounts).where(and(eq(tarifDiscounts.parentId, id), eq(tarifDiscounts.parentType, 'membership_type')));
  await db.delete(membershipTypes).where(and(eq(membershipTypes.id, id), eq(membershipTypes.orgId, user.orgId)));

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Mitgliedsart gelöscht', 'membership_type', id);

  return c.json({ success: true });
});
