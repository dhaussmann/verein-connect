import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import type { Env, AuthUser } from '../../types/env';
import { roles, userRoles, users } from '../../db/schema';
import { NotFoundError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const roleRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

roleRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(roles).where(eq(roles.orgId, user.orgId)).orderBy(roles.sortOrder);

  const enriched = await Promise.all(rows.map(async (r) => {
    const members = await db
      .select({ userId: userRoles.userId, firstName: users.firstName, lastName: users.lastName, isLeader: userRoles.isLeader })
      .from(userRoles)
      .innerJoin(users, eq(userRoles.userId, users.id))
      .where(and(eq(userRoles.roleId, r.id), eq(userRoles.status, 'active')));
    return { ...r, members, memberCount: members.length };
  }));

  return c.json(enriched);
});

roleRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(roles).where(and(eq(roles.id, id), eq(roles.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Rolle', id);

  const members = await db
    .select({ userId: userRoles.userId, firstName: users.firstName, lastName: users.lastName, isLeader: userRoles.isLeader, startDate: userRoles.startDate, endDate: userRoles.endDate })
    .from(userRoles)
    .innerJoin(users, eq(userRoles.userId, users.id))
    .where(eq(userRoles.roleId, id));

  return c.json({ ...rows[0], members });
});

roleRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const r = await db.insert(roles).values({
    orgId: user.orgId,
    name: body.name,
    description: body.description || null,
    category: body.category || 'general',
    permissions: body.permissions ? JSON.stringify(body.permissions) : '[]',
    parentRoleId: body.parent_role_id || null,
    sortOrder: body.sort_order ?? 0,
  }).returning();

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rolle erstellt', 'role', r[0].id, body.name);
  return c.json({ id: r[0].id }, 201);
});

roleRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(roles).where(and(eq(roles.id, id), eq(roles.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Rolle', id);

  const u: Record<string, any> = {};
  if (body.name !== undefined) u.name = body.name;
  if (body.description !== undefined) u.description = body.description;
  if (body.category !== undefined) u.category = body.category;
  if (body.permissions !== undefined) u.permissions = JSON.stringify(body.permissions);
  if (body.parent_role_id !== undefined) u.parentRoleId = body.parent_role_id;
  if (body.sort_order !== undefined) u.sortOrder = body.sort_order;

  await db.update(roles).set(u).where(eq(roles.id, id));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rolle bearbeitet', 'role', id);
  return c.json({ success: true });
});

roleRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  await db.delete(userRoles).where(eq(userRoles.roleId, id));
  await db.delete(roles).where(and(eq(roles.id, id), eq(roles.orgId, user.orgId)));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rolle gelöscht', 'role', id);
  return c.json({ success: true });
});
