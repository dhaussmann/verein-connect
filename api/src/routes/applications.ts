import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { contractApplications, contracts, users, membershipTypes, tarifs } from '../db/schema';
import { parsePagination, buildMeta } from '../lib/pagination';
import { NotFoundError, ValidationError, AppError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';
import { hash } from 'bcryptjs';

type Variables = { user: AuthUser };

export const applicationRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Helper: Generate contract number ───────────────────────────────────────
async function nextContractNumber(db: ReturnType<typeof drizzle>, orgId: string): Promise<string> {
  const result = await db.select({ count: count() }).from(contracts).where(eq(contracts.orgId, orgId));
  const num = (result[0]?.count || 0) + 1;
  return `V-${num.toString().padStart(5, '0')}`;
}

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

  const enriched = await Promise.all(rows.map(async (app) => {
    let typeName = '';
    if (app.membershipTypeId) {
      const mt = await db.select({ name: membershipTypes.name }).from(membershipTypes).where(eq(membershipTypes.id, app.membershipTypeId));
      typeName = mt[0]?.name || '';
    }
    if (app.tarifId) {
      const t = await db.select({ name: tarifs.name }).from(tarifs).where(eq(tarifs.id, app.tarifId));
      typeName = t[0]?.name || '';
    }

    let reviewerName = '';
    if (app.reviewedBy) {
      const r = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, app.reviewedBy));
      reviewerName = r[0] ? `${r[0].firstName} ${r[0].lastName}` : '';
    }

    return { ...app, typeName, reviewerName, additionalData: JSON.parse(app.additionalData || '{}') };
  }));

  return c.json({ data: enriched, meta: buildMeta(total, page, perPage) });
});

// ─── PUT /:id/accept — Accept application ──────────────────────────────────
applicationRoutes.put('/:id/accept', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(contractApplications)
    .where(and(eq(contractApplications.id, id), eq(contractApplications.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Antrag', id);
  const app = rows[0];

  if (app.status !== 'PENDING') throw new AppError(400, 'Antrag wurde bereits bearbeitet');

  // Create member (user)
  const tempPassword = await hash('Welcome1!', 12);
  const memberNumber = `M-${Date.now().toString(36).toUpperCase()}`;

  const newUser = await db.insert(users).values({
    orgId: user.orgId,
    email: app.email,
    passwordHash: tempPassword,
    firstName: app.firstName,
    lastName: app.lastName,
    phone: app.phone || null,
    street: app.address || null,
    birthDate: app.dateOfBirth || null,
    status: 'active',
    memberNumber,
  }).returning();

  // Get defaults from membership type or tarif
  let defaults: any = {};
  const contractKind = app.membershipTypeId ? 'MEMBERSHIP' : 'TARIF';
  if (app.membershipTypeId) {
    const mt = await db.select().from(membershipTypes).where(eq(membershipTypes.id, app.membershipTypeId));
    if (mt[0]) defaults = mt[0];
  } else if (app.tarifId) {
    const t = await db.select().from(tarifs).where(eq(tarifs.id, app.tarifId));
    if (t[0]) defaults = t[0];
  }

  const contractNumber = await nextContractNumber(db, user.orgId);
  const startDate = new Date().toISOString().slice(0, 10);
  let endDate: string | null = null;
  if (defaults.contractDurationMonths) {
    const end = new Date();
    end.setMonth(end.getMonth() + defaults.contractDurationMonths);
    endDate = end.toISOString().slice(0, 10);
  }

  // Create contract
  await db.insert(contracts).values({
    orgId: user.orgId,
    contractNumber,
    memberId: newUser[0].id,
    contractKind,
    membershipTypeId: app.membershipTypeId || null,
    tarifId: app.tarifId || null,
    groupId: defaults.defaultGroupId || null,
    status: 'ACTIVE',
    startDate,
    endDate,
    billingPeriod: app.billingPeriod || 'MONTHLY',
    currentPrice: 0, // Will be set from pricing
    autoRenew: (defaults.contractType === 'AUTO_RENEW' || defaults.contractType === 'FIXED_RENEW') ? 1 : 0,
    renewalDurationMonths: defaults.renewalDurationMonths || null,
    cancellationNoticeDays: defaults.cancellationNoticeDays || 30,
    cancellationNoticeBasis: defaults.cancellationNoticeBasis || 'FROM_CANCELLATION',
    renewalCancellationDays: defaults.renewalCancellationDays || null,
    createdBy: user.id,
  });

  // Update application
  await db.update(contractApplications).set({
    status: 'ACCEPTED',
    memberId: newUser[0].id,
    reviewedBy: user.id,
    reviewedAt: new Date().toISOString(),
  }).where(eq(contractApplications.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id,
    `Antrag von ${app.firstName} ${app.lastName} angenommen – Vertrag ${contractNumber} erstellt`,
    'contract_application', id);

  return c.json({ success: true, memberId: newUser[0].id, contractNumber });
});

// ─── PUT /:id/reject — Reject application ──────────────────────────────────
applicationRoutes.put('/:id/reject', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const schema = z.object({ review_notes: z.string().optional() });
  const parsed = schema.safeParse(body);

  const rows = await db.select().from(contractApplications)
    .where(and(eq(contractApplications.id, id), eq(contractApplications.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Antrag', id);
  const app = rows[0];

  if (app.status !== 'PENDING') throw new AppError(400, 'Antrag wurde bereits bearbeitet');

  await db.update(contractApplications).set({
    status: 'REJECTED',
    reviewedBy: user.id,
    reviewedAt: new Date().toISOString(),
    reviewNotes: parsed.success ? parsed.data.review_notes || null : null,
  }).where(eq(contractApplications.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id,
    `Antrag von ${app.firstName} ${app.lastName} abgelehnt`,
    'contract_application', id);

  return c.json({ success: true });
});
