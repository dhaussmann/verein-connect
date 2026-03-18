import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, count } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { roles, userRoles, users } from '../db/schema';
import { NotFoundError, ValidationError, AppError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const roleRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['general', 'team', 'department', 'system']).optional(),
  max_members: z.number().optional(),
  permissions: z.record(z.string(), z.array(z.string())).optional(),
  parent_role_id: z.string().optional(),
});

// ─── GET /v1/roles ───────────────────────────────────────────────────────────
roleRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const roleRows = await db.select().from(roles).where(eq(roles.orgId, user.orgId));

  const enriched = await Promise.all(roleRows.map(async (role) => {
    const memberCount = await db.select({ count: count() }).from(userRoles)
      .where(and(eq(userRoles.roleId, role.id), eq(userRoles.status, 'active')));

    return {
      id: role.id,
      name: role.name,
      category: role.category === 'system' ? 'System' : role.category === 'team' ? 'Sport' : 'Verein',
      memberCount: memberCount[0]?.count || 0,
      isSystem: role.isSystem === 1,
      description: role.description || '',
      parentRole: role.parentRoleId || undefined,
      maxMembers: role.maxMembers || undefined,
      permissions: JSON.parse(role.permissions || '{}'),
    };
  }));

  return c.json(enriched);
});

// ─── POST /v1/roles ──────────────────────────────────────────────────────────
roleRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const db = drizzle(c.env.DB);
  const roleId = crypto.randomUUID();

  await db.insert(roles).values({
    id: roleId,
    orgId: user.orgId,
    name: parsed.data.name,
    description: parsed.data.description,
    category: parsed.data.category || 'general',
    maxMembers: parsed.data.max_members,
    permissions: JSON.stringify(parsed.data.permissions || {}),
    parentRoleId: parsed.data.parent_role_id,
  });

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rolle erstellt', 'role', roleId, parsed.data.name);

  return c.json({ id: roleId, name: parsed.data.name }, 201);
});

// ─── PATCH /v1/roles/:id ─────────────────────────────────────────────────────
roleRoutes.patch('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const roleId = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(roles).where(and(eq(roles.id, roleId), eq(roles.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Rolle', roleId);

  const updateData: Record<string, any> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.max_members !== undefined) updateData.maxMembers = body.max_members;
  if (body.permissions !== undefined) updateData.permissions = JSON.stringify(body.permissions);
  if (body.parent_role_id !== undefined) updateData.parentRoleId = body.parent_role_id;

  await db.update(roles).set(updateData).where(eq(roles.id, roleId));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rolle bearbeitet', 'role', roleId, JSON.stringify(body));

  return c.json({ success: true });
});

// ─── DELETE /v1/roles/:id ────────────────────────────────────────────────────
roleRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const roleId = c.req.param('id');

  const existing = await db.select().from(roles).where(and(eq(roles.id, roleId), eq(roles.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Rolle', roleId);
  if (existing[0].isSystem === 1) throw new AppError(400, 'System-Rollen können nicht gelöscht werden');

  await db.delete(userRoles).where(eq(userRoles.roleId, roleId));
  await db.delete(roles).where(eq(roles.id, roleId));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rolle gelöscht', 'role', roleId, existing[0].name);

  return c.json({ success: true });
});

// ─── GET /v1/roles/:id/members ───────────────────────────────────────────────
roleRoutes.get('/:id/members', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const roleId = c.req.param('id');

  const members = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      status: users.status,
      isLeader: userRoles.isLeader,
      startDate: userRoles.startDate,
    })
    .from(userRoles)
    .innerJoin(users, eq(userRoles.userId, users.id))
    .where(and(eq(userRoles.roleId, roleId), eq(userRoles.status, 'active'), eq(users.orgId, user.orgId)));

  return c.json(members);
});

// ─── POST /v1/roles/:id/members ──────────────────────────────────────────────
roleRoutes.post('/:id/members', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const roleId = c.req.param('id');
  const { user_id, is_leader } = await c.req.json();

  await db.insert(userRoles).values({
    userId: user_id,
    roleId,
    isLeader: is_leader ? 1 : 0,
    status: 'active',
  });

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rolle zugewiesen', 'user_role', '', `User ${user_id} → Rolle ${roleId}`);

  return c.json({ success: true }, 201);
});

// ─── DELETE /v1/roles/:id/members/:uid ───────────────────────────────────────
roleRoutes.delete('/:id/members/:uid', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const roleId = c.req.param('id');
  const uid = c.req.param('uid');

  await db.delete(userRoles).where(and(eq(userRoles.roleId, roleId), eq(userRoles.userId, uid)));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Rolle entfernt', 'user_role', '', `User ${uid} aus Rolle ${roleId}`);

  return c.json({ success: true });
});
