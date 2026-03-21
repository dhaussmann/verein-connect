import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc } from 'drizzle-orm';
import type { Env, AuthUser } from '../../types/env';
import { families, familyMembers, users, contracts } from '../../db/schema';
import { NotFoundError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const familyRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

familyRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();

  const rows = await db.select().from(families).where(eq(families.orgId, user.orgId)).orderBy(desc(families.createdAt));

  const enriched = await Promise.all(rows.map(async (f) => {
    const members = await db
      .select({ userId: familyMembers.userId, firstName: users.firstName, lastName: users.lastName, relationship: familyMembers.relationship })
      .from(familyMembers)
      .innerJoin(users, eq(familyMembers.userId, users.id))
      .where(eq(familyMembers.familyId, f.id));
    return { ...f, members, memberCount: members.length };
  }));

  if (query.search) {
    const s = query.search.toLowerCase();
    return c.json(enriched.filter(f => f.name.toLowerCase().includes(s)));
  }

  return c.json(enriched);
});

familyRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(families).where(and(eq(families.id, id), eq(families.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Familie', id);

  const members = await db
    .select({ userId: familyMembers.userId, firstName: users.firstName, lastName: users.lastName, email: users.email, relationship: familyMembers.relationship })
    .from(familyMembers)
    .innerJoin(users, eq(familyMembers.userId, users.id))
    .where(eq(familyMembers.familyId, id));

  const familyContracts = await db.select().from(contracts).where(eq(contracts.familyId, id));

  return c.json({ ...rows[0], members, contracts: familyContracts });
});

familyRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const f = await db.insert(families).values({
    orgId: user.orgId,
    name: body.name,
    primaryContactId: body.primary_contact_id || null,
    discountPercent: body.discount_percent ?? 0,
    contractPartnerFirstName: body.contract_partner_first_name || null,
    contractPartnerLastName: body.contract_partner_last_name || null,
    contractPartnerEmail: body.contract_partner_email || null,
    contractPartnerPhone: body.contract_partner_phone || null,
    contractPartnerStreet: body.contract_partner_street || null,
    contractPartnerZip: body.contract_partner_zip || null,
    contractPartnerCity: body.contract_partner_city || null,
    contractPartnerBirthDate: body.contract_partner_birth_date || null,
    contractPartnerMemberId: body.contract_partner_member_id || null,
  }).returning();

  if (body.member_ids && Array.isArray(body.member_ids)) {
    for (const mid of body.member_ids) {
      await db.insert(familyMembers).values({ familyId: f[0].id, userId: mid });
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Familie erstellt', 'family', f[0].id, body.name);
  return c.json({ id: f[0].id }, 201);
});

familyRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(families).where(and(eq(families.id, id), eq(families.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Familie', id);

  const u: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) u.name = body.name;
  if (body.primary_contact_id !== undefined) u.primaryContactId = body.primary_contact_id;
  if (body.discount_percent !== undefined) u.discountPercent = body.discount_percent;
  if (body.contract_partner_first_name !== undefined) u.contractPartnerFirstName = body.contract_partner_first_name;
  if (body.contract_partner_last_name !== undefined) u.contractPartnerLastName = body.contract_partner_last_name;
  if (body.contract_partner_email !== undefined) u.contractPartnerEmail = body.contract_partner_email;
  if (body.contract_partner_phone !== undefined) u.contractPartnerPhone = body.contract_partner_phone;
  if (body.contract_partner_street !== undefined) u.contractPartnerStreet = body.contract_partner_street;
  if (body.contract_partner_zip !== undefined) u.contractPartnerZip = body.contract_partner_zip;
  if (body.contract_partner_city !== undefined) u.contractPartnerCity = body.contract_partner_city;
  if (body.contract_partner_birth_date !== undefined) u.contractPartnerBirthDate = body.contract_partner_birth_date;
  if (body.contract_partner_member_id !== undefined) u.contractPartnerMemberId = body.contract_partner_member_id;

  await db.update(families).set(u).where(eq(families.id, id));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Familie bearbeitet', 'family', id);
  return c.json({ success: true });
});

familyRoutes.post('/:id/members', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const { user_id, relationship } = await c.req.json();

  await db.insert(familyMembers).values({ familyId: id, userId: user_id, relationship: relationship || 'member' });
  return c.json({ success: true }, 201);
});

familyRoutes.delete('/:id/members/:userId', async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const userId = c.req.param('userId');

  await db.delete(familyMembers).where(and(eq(familyMembers.familyId, id), eq(familyMembers.userId, userId)));
  return c.json({ success: true });
});

familyRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  await db.delete(familyMembers).where(eq(familyMembers.familyId, id));
  await db.delete(families).where(and(eq(families.id, id), eq(families.orgId, user.orgId)));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Familie gelöscht', 'family', id);
  return c.json({ success: true });
});
