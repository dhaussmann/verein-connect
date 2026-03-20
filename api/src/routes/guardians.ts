import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { guardians } from '../db/schema';
import { NotFoundError, ValidationError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const guardianRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const guardianSchema = z.object({
  first_name: z.string().min(1, 'Vorname ist erforderlich'),
  last_name: z.string().min(1, 'Nachname ist erforderlich'),
  street: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional().nullable().or(z.literal('')),
});

// ─── GET /v1/members/:memberId/guardians ────────────────────────────────────
guardianRoutes.get('/:memberId/guardians', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const memberId = c.req.param('memberId');

  const rows = await db.select().from(guardians)
    .where(and(eq(guardians.userId, memberId), eq(guardians.orgId, user.orgId)));

  return c.json(rows.map((g) => ({
    id: g.id,
    userId: g.userId,
    firstName: g.firstName,
    lastName: g.lastName,
    street: g.street,
    zip: g.zip,
    city: g.city,
    phone: g.phone,
    email: g.email,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  })));
});

// ─── POST /v1/members/:memberId/guardians ───────────────────────────────────
guardianRoutes.post('/:memberId/guardians', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const memberId = c.req.param('memberId');
  const body = await c.req.json();
  const parsed = guardianSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;
  const id = crypto.randomUUID();

  await db.insert(guardians).values({
    id,
    orgId: user.orgId,
    userId: memberId,
    firstName: data.first_name,
    lastName: data.last_name,
    street: data.street || null,
    zip: data.zip || null,
    city: data.city || null,
    phone: data.phone || null,
    email: data.email || null,
  });

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Erziehungsberechtigter angelegt', 'guardian', id, `${data.first_name} ${data.last_name}`);

  return c.json({ id, created: true }, 201);
});

// ─── PUT /v1/members/:memberId/guardians/:guardianId ────────────────────────
guardianRoutes.put('/:memberId/guardians/:guardianId', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const guardianId = c.req.param('guardianId');
  const body = await c.req.json();
  const parsed = guardianSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;

  const existing = await db.select({ id: guardians.id }).from(guardians)
    .where(and(eq(guardians.id, guardianId), eq(guardians.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Erziehungsberechtigter nicht gefunden');

  await db.update(guardians).set({
    firstName: data.first_name,
    lastName: data.last_name,
    street: data.street || null,
    zip: data.zip || null,
    city: data.city || null,
    phone: data.phone || null,
    email: data.email || null,
    updatedAt: new Date().toISOString(),
  }).where(eq(guardians.id, guardianId));

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Erziehungsberechtigter aktualisiert', 'guardian', guardianId);

  return c.json({ id: guardianId, updated: true });
});

// ─── DELETE /v1/members/:memberId/guardians/:guardianId ─────────────────────
guardianRoutes.delete('/:memberId/guardians/:guardianId', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const guardianId = c.req.param('guardianId');

  await db.delete(guardians)
    .where(and(eq(guardians.id, guardianId), eq(guardians.orgId, user.orgId)));

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Erziehungsberechtigter gelöscht', 'guardian', guardianId);

  return c.json({ success: true });
});
