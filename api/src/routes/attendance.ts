import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, count, gte, lte, sql } from 'drizzle-orm';
import type { Env, AuthUser } from '../types/bindings';
import { attendance, eventOccurrences, eventRegistrations, events, users } from '../db/schema';
import { NotFoundError } from '../lib/errors';

type Variables = { user: AuthUser };

export const attendanceRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── GET /v1/attendance/today ────────────────────────────────────────────────
attendanceRoutes.get('/today', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const today = new Date().toISOString().slice(0, 10);

  const todayOccurrences = await db
    .select({
      id: eventOccurrences.id,
      eventId: eventOccurrences.eventId,
      startDate: eventOccurrences.startDate,
      isCancelled: eventOccurrences.isCancelled,
      overrideLocation: eventOccurrences.overrideLocation,
      title: events.title,
      location: events.location,
      maxParticipants: events.maxParticipants,
      timeStart: events.timeStart,
      timeEnd: events.timeEnd,
    })
    .from(eventOccurrences)
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(and(eq(events.orgId, user.orgId), eq(eventOccurrences.startDate, today)));

  const result = await Promise.all(todayOccurrences.map(async (occ) => {
    const regCount = await db.select({ count: count() }).from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, occ.eventId), eq(eventRegistrations.status, 'registered')));
    const checkedInCount = await db.select({ count: count() }).from(attendance)
      .where(and(eq(attendance.occurrenceId, occ.id), eq(attendance.status, 'present')));

    const totalParticipants = regCount[0]?.count || 0;
    const checkedIn = checkedInCount[0]?.count || 0;

    return {
      id: occ.id,
      title: occ.title,
      time: `${occ.timeStart || ''}–${occ.timeEnd || ''}`,
      location: occ.overrideLocation || occ.location || '',
      totalParticipants,
      checkedIn,
      isActive: checkedIn > 0 && checkedIn < totalParticipants,
    };
  }));

  return c.json(result);
});

// ─── GET /v1/attendance/:occurrence_id ───────────────────────────────────────
attendanceRoutes.get('/:occurrence_id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const occurrenceId = c.req.param('occurrence_id');

  // Get occurrence -> event to verify org ownership
  const occRows = await db
    .select({ eventId: eventOccurrences.eventId })
    .from(eventOccurrences)
    .where(eq(eventOccurrences.id, occurrenceId));
  if (occRows.length === 0) throw new NotFoundError('Termin', occurrenceId);

  // Get registered participants
  const registered = await db
    .select({
      userId: eventRegistrations.userId,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(eventRegistrations)
    .innerJoin(users, eq(eventRegistrations.userId, users.id))
    .where(and(eq(eventRegistrations.eventId, occRows[0].eventId), eq(eventRegistrations.status, 'registered')));

  // Get attendance records
  const attendanceRecords = await db.select().from(attendance)
    .where(eq(attendance.occurrenceId, occurrenceId));

  const attendanceMap = new Map(attendanceRecords.map((a) => [a.userId, a]));

  const participants = registered.map((r) => {
    const att = attendanceMap.get(r.userId);
    const initials = `${(r.firstName || '')[0] || ''}${(r.lastName || '')[0] || ''}`.toUpperCase();
    return {
      id: att?.id || '',
      memberId: r.userId,
      name: `${r.firstName} ${r.lastName}`,
      initials,
      status: att?.status || 'offen',
      checkedInAt: att?.checkedInAt || undefined,
    };
  });

  return c.json(participants);
});

// ─── POST /v1/attendance/:occurrence_id/check-in ─────────────────────────────
attendanceRoutes.post('/:occurrence_id/check-in', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const occurrenceId = c.req.param('occurrence_id');
  const body = await c.req.json();
  const { user_id, status, method } = body;

  // Upsert attendance
  const existing = await db.select().from(attendance)
    .where(and(eq(attendance.occurrenceId, occurrenceId), eq(attendance.userId, user_id)));

  if (existing.length > 0) {
    await db.update(attendance).set({
      status: status || 'present',
      checkedInAt: status === 'present' ? new Date().toISOString() : null,
      checkedInBy: authUser.id,
      checkInMethod: method || 'manual',
    }).where(eq(attendance.id, existing[0].id));
  } else {
    await db.insert(attendance).values({
      occurrenceId,
      userId: user_id,
      status: status || 'present',
      checkedInAt: status === 'present' ? new Date().toISOString() : null,
      checkedInBy: authUser.id,
      checkInMethod: method || 'manual',
    });
  }

  return c.json({ success: true });
});

// ─── POST /v1/attendance/:occurrence_id/check-in/qr ──────────────────────────
attendanceRoutes.post('/:occurrence_id/check-in/qr', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const occurrenceId = c.req.param('occurrence_id');
  const { qr_code } = await c.req.json();

  // Find user by QR code
  const userRows = await db.select().from(users)
    .where(and(eq(users.qrCode, qr_code), eq(users.orgId, authUser.orgId)));
  if (userRows.length === 0) throw new NotFoundError('Mitglied (QR-Code)');

  const userId = userRows[0].id;

  // Insert attendance
  const existing = await db.select().from(attendance)
    .where(and(eq(attendance.occurrenceId, occurrenceId), eq(attendance.userId, userId)));

  if (existing.length > 0) {
    await db.update(attendance).set({
      status: 'present',
      checkedInAt: new Date().toISOString(),
      checkedInBy: authUser.id,
      checkInMethod: 'qr_scan',
    }).where(eq(attendance.id, existing[0].id));
  } else {
    await db.insert(attendance).values({
      occurrenceId,
      userId,
      status: 'present',
      checkedInAt: new Date().toISOString(),
      checkedInBy: authUser.id,
      checkInMethod: 'qr_scan',
    });
  }

  return c.json({
    success: true,
    user: { id: userId, name: `${userRows[0].firstName} ${userRows[0].lastName}` },
  });
});

// ─── POST /v1/attendance/:occurrence_id/bulk ─────────────────────────────────
attendanceRoutes.post('/:occurrence_id/bulk', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const occurrenceId = c.req.param('occurrence_id');
  const { entries } = await c.req.json();

  for (const entry of entries as { user_id: string; status: string }[]) {
    const existing = await db.select().from(attendance)
      .where(and(eq(attendance.occurrenceId, occurrenceId), eq(attendance.userId, entry.user_id)));

    if (existing.length > 0) {
      await db.update(attendance).set({
        status: entry.status,
        checkedInAt: entry.status === 'present' ? new Date().toISOString() : null,
        checkedInBy: authUser.id,
      }).where(eq(attendance.id, existing[0].id));
    } else {
      await db.insert(attendance).values({
        occurrenceId,
        userId: entry.user_id,
        status: entry.status,
        checkedInAt: entry.status === 'present' ? new Date().toISOString() : null,
        checkedInBy: authUser.id,
        checkInMethod: 'manual',
      });
    }
  }

  return c.json({ success: true, count: entries.length });
});

// ─── GET /v1/attendance/stats ────────────────────────────────────────────────
attendanceRoutes.get('/stats', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();

  const conditions: any[] = [];
  if (query.user_id) conditions.push(eq(attendance.userId, query.user_id));
  if (query.date_from) conditions.push(gte(eventOccurrences.startDate, query.date_from));
  if (query.date_to) conditions.push(lte(eventOccurrences.startDate, query.date_to));

  // Total attendance records for the org
  const allRecords = await db
    .select({ status: attendance.status, cnt: count() })
    .from(attendance)
    .innerJoin(eventOccurrences, eq(attendance.occurrenceId, eventOccurrences.id))
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(and(eq(events.orgId, user.orgId), ...conditions))
    .groupBy(attendance.status);

  const stats: Record<string, number> = {};
  let total = 0;
  for (const row of allRecords) {
    stats[row.status] = row.cnt;
    total += row.cnt;
  }

  return c.json({
    total_sessions: total,
    present: stats['present'] || 0,
    absent: stats['absent'] || 0,
    excused: stats['excused'] || 0,
    late: stats['late'] || 0,
    attendance_rate: total > 0 ? Math.round(((stats['present'] || 0) + (stats['late'] || 0)) / total * 100) : 0,
  });
});
