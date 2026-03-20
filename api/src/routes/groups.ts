import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, count, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { groups, groupMembers, users } from '../db/schema';
import { NotFoundError, ValidationError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const groupRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const groupSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.enum(['standard', 'team']).optional(),
  parent_group_id: z.string().nullable().optional(),
});

// ─── GET / — List groups ────────────────────────────────────────────────────
groupRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(groups).where(eq(groups.orgId, user.orgId));

  // Enrich with member count and children count
  const enriched = await Promise.all(rows.map(async (g) => {
    const mc = await db.select({ count: count() }).from(groupMembers).where(eq(groupMembers.groupId, g.id));
    const cc = await db.select({ count: count() }).from(groups).where(eq(groups.parentGroupId, g.id));
    return { ...g, memberCount: mc[0]?.count || 0, childrenCount: cc[0]?.count || 0 };
  }));

  return c.json({ data: enriched });
});

// ─── POST / — Create group ─────────────────────────────────────────────────
groupRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const parsed = groupSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const result = await db.insert(groups).values({
    orgId: user.orgId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    parentGroupId: parsed.data.parent_group_id || null,
    category: parsed.data.category || 'standard',
  }).returning();

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Gruppe '${parsed.data.name}' erstellt`, 'group', result[0].id);
  return c.json(result[0], 201);
});

// ─── PUT /:id — Update group ───────────────────────────────────────────────
groupRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = groupSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const existing = await db.select().from(groups).where(and(eq(groups.id, id), eq(groups.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Gruppe', id);

  const updateData: Record<string, any> = {
    name: parsed.data.name,
    description: parsed.data.description || null,
  };
  if (parsed.data.category) updateData.category = parsed.data.category;
  if (parsed.data.parent_group_id !== undefined) updateData.parentGroupId = parsed.data.parent_group_id || null;
  await db.update(groups).set(updateData).where(eq(groups.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Gruppe '${parsed.data.name}' bearbeitet`, 'group', id);
  return c.json({ success: true });
});

// ─── DELETE /:id — Delete group ─────────────────────────────────────────────
groupRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(groups).where(and(eq(groups.id, id), eq(groups.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Gruppe', id);

  await db.delete(groupMembers).where(eq(groupMembers.groupId, id));
  await db.delete(groups).where(eq(groups.id, id));
  await writeAuditLog(c.env.DB, user.orgId, user.id, `Gruppe '${existing[0].name}' gelöscht`, 'group', id);
  return c.json({ success: true });
});

// ─── GET /:id/members — List group members ──────────────────────────────────
groupRoutes.get('/:id/members', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(groups).where(and(eq(groups.id, id), eq(groups.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Gruppe', id);

  const rows = await db.select({
    id: groupMembers.id,
    userId: groupMembers.userId,
    role: groupMembers.role,
    joinedAt: groupMembers.joinedAt,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
  }).from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, id));

  return c.json({ data: rows });
});

// ─── POST /:id/members — Add member to group ───────────────────────────────
groupRoutes.post('/:id/members', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const schema = z.object({ user_id: z.string(), role: z.string().optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const existing = await db.select().from(groups).where(and(eq(groups.id, id), eq(groups.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Gruppe', id);

  const result = await db.insert(groupMembers).values({
    groupId: id,
    userId: parsed.data.user_id,
    role: parsed.data.role || 'Mitglied',
  }).returning();

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Mitglied zu Gruppe '${existing[0].name}' hinzugefügt`, 'group', id);
  return c.json(result[0], 201);
});

// ─── DELETE /:id/members/:userId — Remove member from group ─────────────────
groupRoutes.delete('/:id/members/:userId', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const userId = c.req.param('userId');

  const existing = await db.select().from(groups).where(and(eq(groups.id, id), eq(groups.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Gruppe', id);

  await db.delete(groupMembers).where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, userId)));
  await writeAuditLog(c.env.DB, user.orgId, user.id, `Mitglied aus Gruppe '${existing[0].name}' entfernt`, 'group', id);
  return c.json({ success: true });
});
