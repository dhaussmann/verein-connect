import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import type { Env, AuthUser } from '../../types/env';
import { discountGroups } from '../../db/schema';
import { NotFoundError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const discountGroupRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

discountGroupRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(discountGroups).where(eq(discountGroups.orgId, user.orgId));
  return c.json(rows);
});

discountGroupRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const rows = await db.select().from(discountGroups).where(and(eq(discountGroups.id, id), eq(discountGroups.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Rabattgruppe', id);
  return c.json(rows[0]);
});

discountGroupRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const dg = await db.insert(discountGroups).values({
    orgId: user.orgId,
    name: body.name,
    rules: body.rules ? JSON.stringify(body.rules) : '[]',
    groupId: body.group_id || null,
  }).returning();

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rabattgruppe erstellt', 'discount_group', dg[0].id);
  return c.json({ id: dg[0].id }, 201);
});

discountGroupRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(discountGroups).where(and(eq(discountGroups.id, id), eq(discountGroups.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Rabattgruppe', id);

  const u: Record<string, any> = {};
  if (body.name !== undefined) u.name = body.name;
  if (body.rules !== undefined) u.rules = JSON.stringify(body.rules);
  if (body.group_id !== undefined) u.groupId = body.group_id;

  await db.update(discountGroups).set(u).where(eq(discountGroups.id, id));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rabattgruppe bearbeitet', 'discount_group', id);
  return c.json({ success: true });
});

discountGroupRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  await db.delete(discountGroups).where(and(eq(discountGroups.id, id), eq(discountGroups.orgId, user.orgId)));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rabattgruppe gelöscht', 'discount_group', id);
  return c.json({ success: true });
});
