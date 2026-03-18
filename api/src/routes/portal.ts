import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, asc, count, gte } from 'drizzle-orm';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import type { Env, AuthUser } from '../types/bindings';
import {
  users, roles, userRoles, profileFieldDefinitions, profileFieldValues,
  events, eventRegistrations, eventOccurrences, eventCategories, eventLeaders,
  attendance,
} from '../db/schema';
import { NotFoundError, ValidationError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const portalRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── GET /v1/me/profile ─────────────────────────────────────────────────────
// Returns the authenticated user's own profile with roles and custom fields
portalRoutes.get('/profile', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);

  const userRows = await db.select().from(users).where(eq(users.id, authUser.id));
  if (userRows.length === 0) throw new NotFoundError('Benutzer');

  const user = userRows[0];

  // Roles
  const memberRoles = await db
    .select({ id: roles.id, name: roles.name, category: roles.category, description: roles.description })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, user.id), eq(userRoles.status, 'active')));

  // Profile fields
  const fields = await db
    .select({
      fieldName: profileFieldDefinitions.fieldName,
      fieldLabel: profileFieldDefinitions.fieldLabel,
      value: profileFieldValues.value,
    })
    .from(profileFieldValues)
    .innerJoin(profileFieldDefinitions, eq(profileFieldValues.fieldId, profileFieldDefinitions.id))
    .where(eq(profileFieldValues.userId, user.id));

  const customFields: Record<string, string> = {};
  for (const f of fields) {
    customFields[f.fieldLabel || f.fieldName] = f.value || '';
  }

  const statusMap: Record<string, string> = { active: 'Aktiv', inactive: 'Inaktiv', pending: 'Ausstehend' };

  return c.json({
    id: user.id,
    memberNumber: user.memberNumber || '',
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    mobile: user.mobile || '',
    birthDate: user.birthDate || '',
    gender: user.gender || '',
    street: user.street || '',
    zip: user.zip || '',
    city: user.city || '',
    status: statusMap[user.status || 'active'] || user.status,
    avatarUrl: user.avatarUrl,
    avatarInitials: `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`,
    roles: memberRoles.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description || '',
    })),
    customFields,
    joinDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('de-DE') : '',
  });
});

// ─── PATCH /v1/me/profile ───────────────────────────────────────────────────
// Update own profile (limited fields)
const updateProfileSchema = z.object({
  phone: z.string().optional(),
  mobile: z.string().optional(),
  street: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  current_password: z.string().optional(),
  new_password: z.string().min(8).optional(),
});

portalRoutes.patch('/profile', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;
  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };

  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.mobile !== undefined) updateData.mobile = data.mobile;
  if (data.street !== undefined) updateData.street = data.street;
  if (data.zip !== undefined) updateData.zip = data.zip;
  if (data.city !== undefined) updateData.city = data.city;

  // Password change
  if (data.new_password) {
    if (!data.current_password) {
      throw new ValidationError('Aktuelles Passwort erforderlich');
    }
    const userRows = await db.select().from(users).where(eq(users.id, authUser.id));
    if (userRows.length === 0) throw new NotFoundError('Benutzer');

    // Verify current password
    const { compare } = await import('bcryptjs');
    const valid = await compare(data.current_password, userRows[0].passwordHash || '');
    if (!valid) {
      throw new ValidationError('Aktuelles Passwort ist falsch');
    }
    updateData.passwordHash = await hash(data.new_password, 12);
  }

  await db.update(users).set(updateData).where(eq(users.id, authUser.id));
  await writeAuditLog(c.env.DB, authUser.orgId, authUser.id, 'Eigenes Profil bearbeitet', 'user', authUser.id);

  return c.json({ success: true });
});

// ─── GET /v1/me/events ──────────────────────────────────────────────────────
// Returns events the user is registered for
portalRoutes.get('/events', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);

  const registrations = await db
    .select({
      regId: eventRegistrations.id,
      regStatus: eventRegistrations.status,
      registeredAt: eventRegistrations.registeredAt,
      eventId: events.id,
      title: events.title,
      description: events.description,
      location: events.location,
      startDate: events.startDate,
      endDate: events.endDate,
      timeStart: events.timeStart,
      timeEnd: events.timeEnd,
      eventType: events.eventType,
      maxParticipants: events.maxParticipants,
      status: events.status,
    })
    .from(eventRegistrations)
    .innerJoin(events, eq(eventRegistrations.eventId, events.id))
    .where(and(
      eq(eventRegistrations.userId, authUser.id),
      eq(eventRegistrations.status, 'registered'),
    ))
    .orderBy(desc(events.startDate));

  // Enrich with category names
  const enriched = await Promise.all(registrations.map(async (reg) => {
    // Get participant count
    const participantCount = await db.select({ count: count() }).from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, reg.eventId), eq(eventRegistrations.status, 'registered')));

    const statusMap: Record<string, string> = {
      draft: 'Entwurf', published: 'Aktiv', completed: 'Abgeschlossen', cancelled: 'Abgesagt',
    };

    return {
      id: reg.eventId,
      title: reg.title,
      description: reg.description || '',
      location: reg.location || '',
      startDate: reg.startDate || '',
      endDate: reg.endDate || '',
      timeStart: reg.timeStart || '',
      timeEnd: reg.timeEnd || '',
      eventType: reg.eventType || 'single',
      status: statusMap[reg.status || 'published'] || reg.status,
      maxParticipants: reg.maxParticipants,
      participants: participantCount[0]?.count || 0,
      registeredAt: reg.registeredAt,
      registrationStatus: reg.regStatus,
    };
  }));

  return c.json(enriched);
});

// ─── GET /v1/me/attendance ──────────────────────────────────────────────────
// Returns the user's own attendance records
portalRoutes.get('/attendance', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);

  const records = await db
    .select({
      id: attendance.id,
      status: attendance.status,
      checkedInAt: attendance.checkedInAt,
      occurrenceId: attendance.occurrenceId,
      eventTitle: events.title,
      startDate: eventOccurrences.startDate,
    })
    .from(attendance)
    .innerJoin(eventOccurrences, eq(attendance.occurrenceId, eventOccurrences.id))
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(eq(attendance.userId, authUser.id))
    .orderBy(desc(eventOccurrences.startDate))
    .limit(50);

  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return c.json({
    records: records.map(r => ({
      id: r.id,
      eventTitle: r.eventTitle,
      date: r.startDate || '',
      status: r.status === 'present' ? 'Anwesend' : r.status === 'absent' ? 'Abwesend' : r.status === 'excused' ? 'Entschuldigt' : r.status,
      checkedInAt: r.checkedInAt,
    })),
    stats: { total, present, rate },
  });
});

// ─── GET /v1/me/dashboard ───────────────────────────────────────────────────
// Returns aggregated data for the member dashboard
portalRoutes.get('/dashboard', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);

  // My event registrations count
  const regCount = await db.select({ count: count() }).from(eventRegistrations)
    .where(and(eq(eventRegistrations.userId, authUser.id), eq(eventRegistrations.status, 'registered')));

  // My attendance stats
  const attendanceTotal = await db.select({ count: count() }).from(attendance)
    .where(eq(attendance.userId, authUser.id));
  const attendancePresent = await db.select({ count: count() }).from(attendance)
    .where(and(eq(attendance.userId, authUser.id), eq(attendance.status, 'present')));

  const total = attendanceTotal[0]?.count || 0;
  const present = attendancePresent[0]?.count || 0;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

  // My roles
  const memberRoles = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, authUser.id), eq(userRoles.status, 'active')));

  // Upcoming events I'm registered for
  const today = new Date().toISOString().slice(0, 10);
  const upcomingEvents = await db
    .select({
      eventId: events.id,
      title: events.title,
      startDate: events.startDate,
      timeStart: events.timeStart,
      timeEnd: events.timeEnd,
      location: events.location,
    })
    .from(eventRegistrations)
    .innerJoin(events, eq(eventRegistrations.eventId, events.id))
    .where(and(
      eq(eventRegistrations.userId, authUser.id),
      eq(eventRegistrations.status, 'registered'),
      gte(events.startDate, today),
    ))
    .orderBy(asc(events.startDate))
    .limit(5);

  return c.json({
    registeredEvents: regCount[0]?.count || 0,
    attendanceRate,
    roles: memberRoles.map(r => r.name),
    upcomingEvents: upcomingEvents.map(e => ({
      id: e.eventId,
      title: e.title,
      startDate: e.startDate || '',
      timeStart: e.timeStart || '',
      timeEnd: e.timeEnd || '',
      location: e.location || '',
    })),
  });
});
