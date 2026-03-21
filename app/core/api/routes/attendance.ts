import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, count, inArray } from 'drizzle-orm';
import type { Env, AuthUser } from '../../types/env';
import { attendance, eventOccurrences, eventRegistrations, events, users } from '../../db/schema';
import { NotFoundError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const attendanceRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── GET /today — Today's occurrences ───────────────────────────────────────
attendanceRoutes.get('/today', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const today = new Date().toISOString().slice(0, 10);

  const occs = await db
    .select({
      id: eventOccurrences.id,
      eventId: eventOccurrences.eventId,
      startDate: eventOccurrences.startDate,
      endDate: eventOccurrences.endDate,
      eventTitle: events.title,
      location: events.location,
    })
    .from(eventOccurrences)
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(and(eq(events.orgId, user.orgId), eq(eventOccurrences.startDate, today)));

  const enriched = await Promise.all(occs.map(async (occ) => {
    const regCount = await db.select({ count: count() }).from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, occ.eventId), eq(eventRegistrations.status, 'registered')));
    const checkinCount = await db.select({ count: count() }).from(attendance)
      .where(and(eq(attendance.occurrenceId, occ.id), eq(attendance.status, 'present')));
    return {
      ...occ,
      registeredCount: regCount[0]?.count || 0,
      checkedInCount: checkinCount[0]?.count || 0,
    };
  }));

  return c.json(enriched);
});

// ─── GET /:occurrenceId/participants — Participants for occurrence ──────────
attendanceRoutes.get('/:occurrenceId/participants', async (c) => {
  const db = drizzle(c.env.DB);
  const occurrenceId = c.req.param('occurrenceId');

  const occRows = await db.select().from(eventOccurrences).where(eq(eventOccurrences.id, occurrenceId));
  if (occRows.length === 0) throw new NotFoundError('Termin', occurrenceId);

  const eventId = occRows[0].eventId;

  const regs = await db
    .select({
      userId: eventRegistrations.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(eventRegistrations)
    .innerJoin(users, eq(eventRegistrations.userId, users.id))
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, 'registered')));

  const attRecords = await db.select().from(attendance)
    .where(eq(attendance.occurrenceId, occurrenceId));
  const attMap = new Map(attRecords.map((a) => [a.userId, a]));

  const participants = regs.map((r) => {
    const record = attMap.get(r.userId);
    return {
      userId: r.userId,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      status: record?.status || 'unknown',
      checkedInAt: record?.checkedInAt || null,
    };
  });

  return c.json(participants);
});

// ─── POST /:occurrenceId/checkin — Check in participant ─────────────────────
attendanceRoutes.post('/:occurrenceId/checkin', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const occurrenceId = c.req.param('occurrenceId');
  const { user_id } = await c.req.json();

  const existing = await db.select().from(attendance)
    .where(and(eq(attendance.occurrenceId, occurrenceId), eq(attendance.userId, user_id)));

  if (existing.length > 0) {
    await db.update(attendance).set({
      status: 'present',
      checkedInAt: new Date().toISOString(),
    }).where(eq(attendance.id, existing[0].id));
  } else {
    await db.insert(attendance).values({
      occurrenceId,
      userId: user_id,
      status: 'present',
      checkedInAt: new Date().toISOString(),
      checkedInBy: user.id,
    });
  }

  return c.json({ success: true });
});

// ─── POST /:occurrenceId/checkin-qr — QR code check-in ─────────────────────
attendanceRoutes.post('/:occurrenceId/checkin-qr', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const occurrenceId = c.req.param('occurrenceId');
  const { qr_code } = await c.req.json();

  const userRows = await db.select().from(users).where(eq(users.qrCode, qr_code));
  if (userRows.length === 0) return c.json({ error: 'QR-Code nicht gefunden' }, 404);

  const userId = userRows[0].id;

  const existing = await db.select().from(attendance)
    .where(and(eq(attendance.occurrenceId, occurrenceId), eq(attendance.userId, userId)));

  if (existing.length > 0) {
    await db.update(attendance).set({
      status: 'present',
      checkedInAt: new Date().toISOString(),
    }).where(eq(attendance.id, existing[0].id));
  } else {
    await db.insert(attendance).values({
      occurrenceId,
      userId,
      status: 'present',
      checkedInAt: new Date().toISOString(),
      checkedInBy: user.id,
    });
  }

  return c.json({ success: true, user: { id: userId, firstName: userRows[0].firstName, lastName: userRows[0].lastName } });
});

// ─── POST /:occurrenceId/bulk — Bulk update attendance ──────────────────────
attendanceRoutes.post('/:occurrenceId/bulk', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const occurrenceId = c.req.param('occurrenceId');
  const { records } = await c.req.json();

  for (const record of records) {
    const existing = await db.select().from(attendance)
      .where(and(eq(attendance.occurrenceId, occurrenceId), eq(attendance.userId, record.user_id)));

    if (existing.length > 0) {
      await db.update(attendance).set({
        status: record.status,
        checkedInAt: record.status === 'present' ? new Date().toISOString() : null,
        notes: record.notes || null,
      }).where(eq(attendance.id, existing[0].id));
    } else {
      await db.insert(attendance).values({
        occurrenceId,
        userId: record.user_id,
        status: record.status,
        checkedInAt: record.status === 'present' ? new Date().toISOString() : null,
        notes: record.notes || null,
        checkedInBy: user.id,
      });
    }
  }

  return c.json({ success: true, updated: records.length });
});

// ─── GET /stats/user/:userId — User attendance stats ────────────────────────
attendanceRoutes.get('/stats/user/:userId', async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.req.param('userId');

  const totalRecords = await db.select({ count: count() }).from(attendance)
    .where(eq(attendance.userId, userId));
  const presentRecords = await db.select({ count: count() }).from(attendance)
    .where(and(eq(attendance.userId, userId), eq(attendance.status, 'present')));

  const total = totalRecords[0]?.count || 0;
  const present = presentRecords[0]?.count || 0;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return c.json({ userId, total, present, rate });
});

// ─── GET /stats/org — Organization-wide stats ──────────────────────────────
attendanceRoutes.get('/stats/org', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const recentOccs = await db
    .select({ id: eventOccurrences.id })
    .from(eventOccurrences)
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(and(eq(events.orgId, user.orgId), gte(eventOccurrences.startDate, thirtyDaysAgo), lte(eventOccurrences.startDate, today)));

  const occIds = recentOccs.map((o) => o.id);
  if (occIds.length === 0) return c.json({ totalSessions: 0, avgAttendanceRate: 0 });

  const totalAtt = await db.select({ count: count() }).from(attendance)
    .where(inArray(attendance.occurrenceId, occIds));
  const presentAtt = await db.select({ count: count() }).from(attendance)
    .where(and(inArray(attendance.occurrenceId, occIds), eq(attendance.status, 'present')));

  const total = totalAtt[0]?.count || 0;
  const present = presentAtt[0]?.count || 0;
  const avgRate = total > 0 ? Math.round((present / total) * 100) : 0;

  return c.json({ totalSessions: occIds.length, avgAttendanceRate: avgRate });
});
