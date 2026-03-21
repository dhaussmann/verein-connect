import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import type { Env, AuthUser } from '../../types/env';
import { groups, groupMembers, users } from '../../db/schema';
import { NotFoundError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const groupRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

groupRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(groups).where(eq(groups.orgId, user.orgId));

  const enriched = await Promise.all(rows.map(async (g) => {
    const members = await db
      .select({ userId: groupMembers.userId, firstName: users.firstName, lastName: users.lastName, role: groupMembers.role })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, g.id));
    return { ...g, members, memberCount: members.length };
  }));

  return c.json(enriched);
});

groupRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(groups).where(and(eq(groups.id, id), eq(groups.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Gruppe', id);

  const members = await db
    .select({ userId: groupMembers.userId, firstName: users.firstName, lastName: users.lastName, email: users.email, role: groupMembers.role, joinedAt: groupMembers.joinedAt })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, id));

  return c.json({ ...rows[0], members });
});

groupRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const g = await db.insert(groups).values({
    orgId: user.orgId,
    name: body.name,
    description: body.description || null,
    parentGroupId: body.parent_group_id || null,
    category: body.category || 'standard',
  }).returning();

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Gruppe erstellt', 'group', g[0].id, body.name);
  return c.json({ id: g[0].id }, 201);
});

groupRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(groups).where(and(eq(groups.id, id), eq(groups.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Gruppe', id);

  const u: Record<string, any> = {};
  if (body.name !== undefined) u.name = body.name;
  if (body.description !== undefined) u.description = body.description;
  if (body.parent_group_id !== undefined) u.parentGroupId = body.parent_group_id;
  if (body.category !== undefined) u.category = body.category;

  await db.update(groups).set(u).where(eq(groups.id, id));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Gruppe bearbeitet', 'group', id);
  return c.json({ success: true });
});

groupRoutes.post('/:id/members', async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const { user_id, role } = await c.req.json();

  await db.insert(groupMembers).values({ groupId: id, userId: user_id, role: role || 'Mitglied' });
  return c.json({ success: true }, 201);
});

groupRoutes.delete('/:id/members/:userId', async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const userId = c.req.param('userId');

  await db.delete(groupMembers).where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, userId)));
  return c.json({ success: true });
});

groupRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  await db.delete(groupMembers).where(eq(groupMembers.groupId, id));
  await db.delete(groups).where(and(eq(groups.id, id), eq(groups.orgId, user.orgId)));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Gruppe gelöscht', 'group', id);
  return c.json({ success: true });
});
