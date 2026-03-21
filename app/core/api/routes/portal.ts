import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, count, desc } from 'drizzle-orm';
import type { Env, AuthUser } from '../../types/env';
import { users, eventRegistrations, events, attendance, eventOccurrences, contracts, profileFieldValues, profileFieldDefinitions } from '../../db/schema';
import { NotFoundError } from '../../lib/errors';

type Variables = { user: AuthUser };

export const portalRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── GET /profile — Own profile ─────────────────────────────────────────────
portalRoutes.get('/profile', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(users).where(eq(users.id, user.id));
  if (rows.length === 0) throw new NotFoundError('Profil', user.id);

  // Custom profile fields visible to member
  const fields = await db
    .select({
      fieldId: profileFieldValues.fieldId,
      value: profileFieldValues.value,
      fieldName: profileFieldDefinitions.fieldName,
      fieldLabel: profileFieldDefinitions.fieldLabel,
      fieldType: profileFieldDefinitions.fieldType,
    })
    .from(profileFieldValues)
    .innerJoin(profileFieldDefinitions, eq(profileFieldValues.fieldId, profileFieldDefinitions.id))
    .where(and(eq(profileFieldValues.userId, user.id), eq(profileFieldDefinitions.visibleToMember, 1)));

  const { passwordHash, ...profile } = rows[0];
  return c.json({ ...profile, customFields: fields });
});

// ─── PUT /profile — Update own profile ──────────────────────────────────────
portalRoutes.put('/profile', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const u: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.phone !== undefined) u.phone = body.phone;
  if (body.mobile !== undefined) u.mobile = body.mobile;
  if (body.street !== undefined) u.street = body.street;
  if (body.zip !== undefined) u.zip = body.zip;
  if (body.city !== undefined) u.city = body.city;

  await db.update(users).set(u).where(eq(users.id, user.id));

  // Update editable custom fields
  if (body.custom_fields && typeof body.custom_fields === 'object') {
    for (const [fieldId, value] of Object.entries(body.custom_fields)) {
      const def = await db.select().from(profileFieldDefinitions)
        .where(and(eq(profileFieldDefinitions.id, fieldId), eq(profileFieldDefinitions.editableByMember, 1)));
      if (def.length > 0) {
        const existing = await db.select().from(profileFieldValues)
          .where(and(eq(profileFieldValues.userId, user.id), eq(profileFieldValues.fieldId, fieldId)));
        if (existing.length > 0) {
          await db.update(profileFieldValues).set({ value: String(value), updatedAt: new Date().toISOString() })
            .where(eq(profileFieldValues.id, existing[0].id));
        } else {
          await db.insert(profileFieldValues).values({ userId: user.id, fieldId, value: String(value) });
        }
      }
    }
  }

  return c.json({ success: true });
});

// ─── GET /events — My registered events ─────────────────────────────────────
portalRoutes.get('/events', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const regs = await db
    .select({
      registrationId: eventRegistrations.id,
      eventId: eventRegistrations.eventId,
      status: eventRegistrations.status,
      registeredAt: eventRegistrations.registeredAt,
      eventTitle: events.title,
      eventType: events.eventType,
      startDate: events.startDate,
      endDate: events.endDate,
      location: events.location,
    })
    .from(eventRegistrations)
    .innerJoin(events, eq(eventRegistrations.eventId, events.id))
    .where(eq(eventRegistrations.userId, user.id))
    .orderBy(desc(events.startDate));

  return c.json(regs);
});

// ─── GET /attendance — My attendance history ────────────────────────────────
portalRoutes.get('/attendance', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const records = await db
    .select({
      id: attendance.id,
      status: attendance.status,
      checkedInAt: attendance.checkedInAt,
      occurrenceDate: eventOccurrences.startDate,
      eventId: eventOccurrences.eventId,
      eventTitle: events.title,
    })
    .from(attendance)
    .innerJoin(eventOccurrences, eq(attendance.occurrenceId, eventOccurrences.id))
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(eq(attendance.userId, user.id))
    .orderBy(desc(eventOccurrences.startDate));

  // Stats
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return c.json({ records, stats: { total, present, rate } });
});

// ─── GET /dashboard — Portal dashboard data ────────────────────────────────
portalRoutes.get('/dashboard', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const regCount = await db.select({ count: count() }).from(eventRegistrations)
    .where(and(eq(eventRegistrations.userId, user.id), eq(eventRegistrations.status, 'registered')));

  const attTotal = await db.select({ count: count() }).from(attendance)
    .where(eq(attendance.userId, user.id));
  const attPresent = await db.select({ count: count() }).from(attendance)
    .where(and(eq(attendance.userId, user.id), eq(attendance.status, 'present')));

  const total = attTotal[0]?.count || 0;
  const present = attPresent[0]?.count || 0;

  const activeContracts = await db.select({ count: count() }).from(contracts)
    .where(and(eq(contracts.memberId, user.id), eq(contracts.status, 'ACTIVE')));

  return c.json({
    registeredEvents: regCount[0]?.count || 0,
    attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
    activeContracts: activeContracts[0]?.count || 0,
  });
});
