import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { discountGroups, groups } from '../db/schema';
import { NotFoundError, ValidationError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const discountGroupRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const discountGroupSchema = z.object({
  name: z.string().min(1),
  rules: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.string(),
  })).optional(),
  group_id: z.string().nullable().optional(),
});

// ─── GET / — List discount groups ───────────────────────────────────────────
discountGroupRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(discountGroups).where(eq(discountGroups.orgId, user.orgId));

  const enriched = await Promise.all(rows.map(async (dg) => {
    let groupName = '';
    if (dg.groupId) {
      const g = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, dg.groupId));
      groupName = g[0]?.name || '';
    }
    return { ...dg, rules: JSON.parse(dg.rules || '[]'), groupName };
  }));

  return c.json({ data: enriched });
});

// ─── POST / — Create discount group ────────────────────────────────────────
discountGroupRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const parsed = discountGroupSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;
  const result = await db.insert(discountGroups).values({
    orgId: user.orgId,
    name: data.name,
    rules: JSON.stringify(data.rules || []),
    groupId: data.group_id || null,
  }).returning();

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Rabattgruppe '${data.name}' erstellt`, 'discount_group', result[0].id);
  return c.json(result[0], 201);
});

// ─── PUT /:id — Update discount group ──────────────────────────────────────
discountGroupRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = discountGroupSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const existing = await db.select().from(discountGroups).where(and(eq(discountGroups.id, id), eq(discountGroups.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Rabattgruppe', id);

  const data = parsed.data;
  await db.update(discountGroups).set({
    name: data.name,
    rules: JSON.stringify(data.rules || []),
    groupId: data.group_id || null,
  }).where(eq(discountGroups.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Rabattgruppe '${data.name}' bearbeitet`, 'discount_group', id);
  return c.json({ success: true });
});

// ─── DELETE /:id — Delete discount group ────────────────────────────────────
discountGroupRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select().from(discountGroups).where(and(eq(discountGroups.id, id), eq(discountGroups.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Rabattgruppe', id);

  await db.delete(discountGroups).where(eq(discountGroups.id, id));
  await writeAuditLog(c.env.DB, user.orgId, user.id, `Rabattgruppe '${existing[0].name}' gelöscht`, 'discount_group', id);
  return c.json({ success: true });
});
