import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import type { Env, AuthUser } from '../../types/env';
import { contractApplications, contracts, users, membershipTypes, tarifs, tarifPricing } from '../../db/schema';
import { parsePagination, buildMeta } from '../../lib/pagination';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const applicationRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── GET / — List applications ──────────────────────────────────────────────
applicationRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const conditions: any[] = [eq(contractApplications.orgId, user.orgId)];
  if (query.status) conditions.push(eq(contractApplications.status, query.status));

  const whereClause = and(...conditions);
  const totalResult = await db.select({ count: count() }).from(contractApplications).where(whereClause);
  const total = totalResult[0]?.count || 0;

  const rows = await db.select().from(contractApplications).where(whereClause)
    .orderBy(desc(contractApplications.submittedAt)).limit(perPage).offset(offset);

  return c.json({ data: rows, meta: buildMeta(total, page, perPage) });
});

// ─── POST /:id/accept — Accept application ─────────────────────────────────
applicationRoutes.post('/:id/accept', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const appRows = await db.select().from(contractApplications)
    .where(and(eq(contractApplications.id, id), eq(contractApplications.orgId, user.orgId)));
  if (appRows.length === 0) throw new NotFoundError('Antrag', id);

  const app = appRows[0];
  if (app.status !== 'PENDING') throw new ValidationError('Antrag ist nicht mehr offen');

  // Create user
  const tempPassword = `Willkommen${Math.random().toString(36).slice(2, 8)}!`;
  const passwordHash = await hash(tempPassword, 12);
  const memberCount = await db.select({ count: count() }).from(users).where(eq(users.orgId, user.orgId));
  const memberNumber = `M-${String((memberCount[0]?.count || 0) + 1).padStart(5, '0')}`;

  const newUser = await db.insert(users).values({
    orgId: user.orgId,
    email: app.email,
    passwordHash,
    firstName: app.firstName,
    lastName: app.lastName,
    phone: app.phone || null,
    status: 'active',
    memberNumber,
    joinDate: new Date().toISOString().slice(0, 10),
  }).returning();

  // Create contract
  const contractCount = await db.select({ count: count() }).from(contracts).where(eq(contracts.orgId, user.orgId));
  const contractNumber = `V-${new Date().getFullYear()}-${String((contractCount[0]?.count || 0) + 1).padStart(5, '0')}`;

  let price: number | null = null;
  if (app.billingPeriod) {
    const parentId = app.tarifId || app.membershipTypeId;
    const parentType = app.tarifId ? 'tarif' : 'membership_type';
    if (parentId) {
      const pricing = await db.select().from(tarifPricing)
        .where(and(eq(tarifPricing.parentId, parentId), eq(tarifPricing.parentType, parentType), eq(tarifPricing.billingPeriod, app.billingPeriod)));
      if (pricing.length > 0) price = pricing[0].price;
    }
  }

  const newContract = await db.insert(contracts).values({
    orgId: user.orgId,
    contractNumber,
    memberId: newUser[0].id,
    contractKind: 'membership',
    membershipTypeId: app.membershipTypeId || null,
    tarifId: app.tarifId || null,
    startDate: new Date().toISOString().slice(0, 10),
    billingPeriod: app.billingPeriod || null,
    currentPrice: price,
    status: 'ACTIVE',
    createdBy: user.id,
  }).returning();

  // Update application
  await db.update(contractApplications).set({
    status: 'ACCEPTED',
    memberId: newUser[0].id,
    reviewedBy: user.id,
    reviewedAt: new Date().toISOString(),
  }).where(eq(contractApplications.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Antrag angenommen', 'contract_application', id);

  return c.json({ userId: newUser[0].id, contractId: newContract[0].id, tempPassword });
});

// ─── POST /:id/reject — Reject application ─────────────────────────────────
applicationRoutes.post('/:id/reject', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const appRows = await db.select().from(contractApplications)
    .where(and(eq(contractApplications.id, id), eq(contractApplications.orgId, user.orgId)));
  if (appRows.length === 0) throw new NotFoundError('Antrag', id);

  await db.update(contractApplications).set({
    status: 'REJECTED',
    reviewedBy: user.id,
    reviewedAt: new Date().toISOString(),
    reviewNotes: body.notes || null,
  }).where(eq(contractApplications.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Antrag abgelehnt', 'contract_application', id);

  return c.json({ success: true });
});
