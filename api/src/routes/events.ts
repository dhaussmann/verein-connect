import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like, or, desc, asc, count, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { events, eventCategories, eventLeaders, eventRegistrations, eventOccurrences, eventTargetRoles, users, roles, invoices, invoiceItems, groups } from '../db/schema';
import { parsePagination, buildMeta } from '../lib/pagination';
import { NotFoundError, ValidationError, AppError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const eventRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const createEventSchema = z.object({
  title: z.string().min(1),
  category_id: z.string().optional(),
  event_type: z.enum(['single', 'recurring', 'course']),
  description: z.string().optional(),
  location: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  recurrence_rule: z.string().optional(),
  max_participants: z.number().optional(),
  registration_deadline: z.string().optional(),
  cancellation_deadline: z.string().optional(),
  fee_amount: z.number().nullable().optional(),
  auto_invoice: z.boolean().optional(),
  is_public: z.boolean().optional(),
  time_start: z.string().optional(),
  time_end: z.string().optional(),
  weekdays: z.array(z.string()).optional(),
  leader_ids: z.array(z.string()).optional(),
  target_role_ids: z.array(z.string()).optional(),
  status: z.string().optional(),
  category_name: z.string().optional(),
  group_ids: z.array(z.string()).optional(),
});

// ─── Helper: enrich event ────────────────────────────────────────────────────
async function enrichEvent(db: ReturnType<typeof drizzle>, event: any) {
  // Category
  let category = null;
  if (event.categoryId) {
    const catRows = await db.select().from(eventCategories).where(eq(eventCategories.id, event.categoryId));
    category = catRows[0] || null;
  }

  // Leaders
  const leaders = await db
    .select({ userId: eventLeaders.userId, roleLabel: eventLeaders.roleLabel, firstName: users.firstName, lastName: users.lastName })
    .from(eventLeaders)
    .innerJoin(users, eq(eventLeaders.userId, users.id))
    .where(eq(eventLeaders.eventId, event.id));

  // Resolve groups
  const groupIds: string[] = event.groupIds ? JSON.parse(event.groupIds) : [];
  const resolvedGroups: { id: string; name: string }[] = [];
  for (const gid of groupIds) {
    const rows = await db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.id, gid));
    if (rows[0]) resolvedGroups.push({ id: rows[0].id, name: rows[0].name });
  }

  // Registration counts
  const regCount = await db.select({ count: count() }).from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.status, 'registered')));
  const waitCount = await db.select({ count: count() }).from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.status, 'waitlist')));

  // Map category name to frontend format
  const categoryMap: Record<string, string> = {
    'Training': 'Training', 'Wettkampf': 'Wettkampf', 'Lager': 'Lager',
    'Workshop': 'Workshop', 'Freizeit': 'Freizeit',
  };

  const statusMap: Record<string, string> = {
    'active': 'Aktiv', 'draft': 'Entwurf', 'completed': 'Abgeschlossen', 'cancelled': 'Abgesagt',
  };

  const instructor = leaders[0];
  const initials = instructor
    ? `${(instructor.firstName || '')[0] || ''}${(instructor.lastName || '')[0] || ''}`.toUpperCase()
    : '';

  return {
    id: event.id,
    title: event.title,
    category: category?.name || 'Training',
    status: statusMap[event.status || 'active'] || 'Aktiv',
    description: event.description || '',
    instructorId: instructor?.userId || '',
    instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}` : '',
    instructorInitials: initials,
    schedule: '',
    location: event.location || '',
    participants: regCount[0]?.count || 0,
    maxParticipants: event.maxParticipants || 0,
    waitlist: waitCount[0]?.count || 0,
    price: event.feeAmount || null,
    startDate: event.startDate || '',
    endDate: event.endDate || '',
    weekdays: event.weekdays ? JSON.parse(event.weekdays) : [],
    timeStart: event.timeStart || '',
    timeEnd: event.timeEnd || '',
    isPublic: event.isPublic === 1,
    showOnHomepage: event.isPublic === 1,
    targetRoles: [],
    autoInvoice: event.autoInvoice === 1,
    eventType: event.eventType,
    groupIds,
    groups: resolvedGroups,
    leaders: leaders.map((l) => ({
      userId: l.userId,
      name: `${l.firstName} ${l.lastName}`,
      roleLabel: l.roleLabel,
    })),
  };
}

// ─── GET /v1/events ──────────────────────────────────────────────────────────
eventRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const conditions: any[] = [eq(events.orgId, user.orgId)];

  if (query.search) {
    conditions.push(like(events.title, `%${query.search}%`));
  }
  if (query.category_id) {
    conditions.push(eq(events.categoryId, query.category_id));
  }
  if (query.event_type) {
    conditions.push(eq(events.eventType, query.event_type));
  }
  if (query.status) {
    const statusReverseMap: Record<string, string> = { 'Aktiv': 'active', 'Entwurf': 'draft', 'Abgeschlossen': 'completed', 'Abgesagt': 'cancelled' };
    conditions.push(eq(events.status, statusReverseMap[query.status] || query.status));
  }
  if (query.start_after) {
    conditions.push(gte(events.startDate, query.start_after));
  }
  if (query.start_before) {
    conditions.push(lte(events.startDate, query.start_before));
  }

  const whereClause = and(...conditions);

  const totalResult = await db.select({ count: count() }).from(events).where(whereClause);
  const total = totalResult[0]?.count || 0;

  const sortOrder = query.sort_order === 'desc' ? desc : asc;
  const eventRows = await db.select().from(events).where(whereClause)
    .orderBy(sortOrder(events.startDate)).limit(perPage).offset(offset);

  const enriched = await Promise.all(eventRows.map((e) => enrichEvent(db, e)));

  return c.json({ data: enriched, meta: buildMeta(total, page, perPage) });
});

// ─── GET /v1/events/calendar ─────────────────────────────────────────────────
eventRoutes.get('/calendar', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();

  // Fetch occurrences within date range
  const conditions: any[] = [];
  if (query.start_after) conditions.push(gte(eventOccurrences.startDate, query.start_after));
  if (query.start_before) conditions.push(lte(eventOccurrences.startDate, query.start_before));

  const occurrences = await db
    .select({
      id: eventOccurrences.id,
      eventId: eventOccurrences.eventId,
      startDate: eventOccurrences.startDate,
      endDate: eventOccurrences.endDate,
      isCancelled: eventOccurrences.isCancelled,
      overrideLocation: eventOccurrences.overrideLocation,
      title: events.title,
      location: events.location,
      maxParticipants: events.maxParticipants,
      timeStart: events.timeStart,
      timeEnd: events.timeEnd,
      categoryId: events.categoryId,
      status: events.status,
      groupIds: events.groupIds,
    })
    .from(eventOccurrences)
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(and(eq(events.orgId, user.orgId), ...conditions));

  // Resolve category names
  const catIds = [...new Set(occurrences.map((o) => o.categoryId).filter(Boolean))];
  const catMap: Record<string, string> = {};
  if (catIds.length > 0) {
    for (const catId of catIds) {
      const rows = await db.select().from(eventCategories).where(eq(eventCategories.id, catId!));
      if (rows[0]) catMap[catId!] = rows[0].name;
    }
  }

  // Resolve all group IDs
  const allGroupIds = [...new Set(occurrences.flatMap(o => o.groupIds ? JSON.parse(o.groupIds) : []))];
  const groupMap: Record<string, string> = {};
  for (const gid of allGroupIds) {
    const rows = await db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.id, gid));
    if (rows[0]) groupMap[gid] = rows[0].name;
  }

  // Format for frontend
  const formatted = occurrences.map((o) => {
    // Convert YYYY-MM-DD to dd.MM.yyyy
    const [y, m, d] = (o.startDate || '').split('-');
    const dateStr = d && m && y ? `${d}.${m}.${y}` : '';

    const statusMap: Record<string, string> = { active: 'Offen', draft: 'Entwurf', completed: 'Abgeschlossen', cancelled: 'Abgesagt' };

    return {
      id: o.id,
      courseId: o.eventId,
      title: o.title,
      date: dateStr,
      endDate: o.endDate,
      timeStart: o.timeStart || '',
      timeEnd: o.timeEnd || '',
      category: o.categoryId ? (catMap[o.categoryId] || 'Training') : 'Training',
      location: o.overrideLocation || o.location || '',
      participants: 0,
      maxParticipants: o.maxParticipants || 0,
      status: o.isCancelled ? 'Abgesagt' : statusMap[o.status || 'active'] || 'Offen',
      groups: (o.groupIds ? JSON.parse(o.groupIds) : []).map((gid: string) => ({ id: gid, name: groupMap[gid] || '' })).filter((g: any) => g.name),
    };
  });

  return c.json(formatted);
});

// ─── GET /v1/events/:id ──────────────────────────────────────────────────────
eventRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const eventId = c.req.param('id');

  const rows = await db.select().from(events).where(and(eq(events.id, eventId), eq(events.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Event', eventId);

  const enriched = await enrichEvent(db, rows[0]);

  // Also fetch occurrences
  const occurrences = await db.select().from(eventOccurrences).where(eq(eventOccurrences.eventId, eventId));

  // Fetch target roles
  const targetRoles = await db
    .select({ roleId: eventTargetRoles.roleId, roleName: roles.name, maxFromRole: eventTargetRoles.maxFromRole })
    .from(eventTargetRoles)
    .innerJoin(roles, eq(eventTargetRoles.roleId, roles.id))
    .where(eq(eventTargetRoles.eventId, eventId));

  return c.json({ ...enriched, occurrences, targetRoles });
});

// ─── POST /v1/events ─────────────────────────────────────────────────────────
eventRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;
  const db = drizzle(c.env.DB);
  const eventId = crypto.randomUUID();

  // Resolve category_name to category_id
  let categoryId = data.category_id;
  if (!categoryId && data.category_name) {
    const existing = await db.select().from(eventCategories)
      .where(and(eq(eventCategories.orgId, user.orgId), eq(eventCategories.name, data.category_name)));
    if (existing.length > 0) {
      categoryId = existing[0].id;
    } else {
      categoryId = crypto.randomUUID();
      await db.insert(eventCategories).values({ id: categoryId, orgId: user.orgId, name: data.category_name });
    }
  }

  await db.insert(events).values({
    id: eventId,
    orgId: user.orgId,
    categoryId,
    title: data.title,
    description: data.description,
    eventType: data.event_type,
    location: data.location,
    startDate: data.start_date || '',
    endDate: data.end_date,
    recurrenceRule: data.recurrence_rule,
    maxParticipants: data.max_participants,
    registrationDeadline: data.registration_deadline,
    cancellationDeadline: data.cancellation_deadline,
    feeAmount: data.fee_amount || 0,
    autoInvoice: data.auto_invoice ? 1 : 0,
    isPublic: data.is_public ? 1 : 0,
    timeStart: data.time_start,
    timeEnd: data.time_end,
    weekdays: data.weekdays ? JSON.stringify(data.weekdays) : null,
    groupIds: data.group_ids ? JSON.stringify(data.group_ids) : null,
    status: data.status || 'active',
    createdBy: user.id,
  });

  // Assign leaders
  if (data.leader_ids?.length) {
    for (const leaderId of data.leader_ids) {
      await db.insert(eventLeaders).values({ eventId, userId: leaderId, roleLabel: 'Trainer' });
    }
  }

  // Assign target roles
  if (data.target_role_ids?.length) {
    for (const roleId of data.target_role_ids) {
      await db.insert(eventTargetRoles).values({ eventId, roleId });
    }
  }

  // Generate occurrence for single/course events
  if ((data.event_type === 'single' || data.event_type === 'course') && data.start_date) {
    await db.insert(eventOccurrences).values({
      eventId,
      startDate: data.start_date,
      endDate: data.end_date || data.start_date,
    });
  }

  // Generate occurrences for recurring events (simple weekly implementation)
  if (data.event_type === 'recurring' && data.weekdays?.length && data.start_date && data.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    const dayMap: Record<string, number> = { 'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5, 'Sa': 6, 'So': 0 };
    const targetDays = data.weekdays.map((d) => dayMap[d]).filter((d) => d !== undefined);

    const current = new Date(start);
    while (current <= end) {
      if (targetDays.includes(current.getDay())) {
        await db.insert(eventOccurrences).values({
          eventId,
          startDate: current.toISOString().slice(0, 10),
          endDate: current.toISOString().slice(0, 10),
        });
      }
      current.setDate(current.getDate() + 1);
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Event erstellt', 'event', eventId, data.title);

  const inserted = await db.select().from(events).where(eq(events.id, eventId));
  const enriched = await enrichEvent(db, inserted[0]);
  return c.json(enriched, 201);
});

// ─── PATCH /v1/events/:id ────────────────────────────────────────────────────
eventRoutes.patch('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const eventId = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(events).where(and(eq(events.id, eventId), eq(events.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Event', eventId);

  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.location !== undefined) updateData.location = body.location;
  if (body.start_date !== undefined) updateData.startDate = body.start_date;
  if (body.end_date !== undefined) updateData.endDate = body.end_date;
  if (body.max_participants !== undefined) updateData.maxParticipants = body.max_participants;
  if (body.fee_amount !== undefined) updateData.feeAmount = body.fee_amount;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.is_public !== undefined) updateData.isPublic = body.is_public ? 1 : 0;
  if (body.auto_invoice !== undefined) updateData.autoInvoice = body.auto_invoice ? 1 : 0;
  if (body.time_start !== undefined) updateData.timeStart = body.time_start;
  if (body.time_end !== undefined) updateData.timeEnd = body.time_end;
  if (body.weekdays !== undefined) updateData.weekdays = JSON.stringify(body.weekdays);
  if (body.group_ids !== undefined) updateData.groupIds = JSON.stringify(body.group_ids);

  await db.update(events).set(updateData).where(eq(events.id, eventId));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Event bearbeitet', 'event', eventId, JSON.stringify(body));

  return c.json({ success: true });
});

// ─── DELETE /v1/events/:id ───────────────────────────────────────────────────
eventRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const eventId = c.req.param('id');

  const existing = await db.select().from(events).where(and(eq(events.id, eventId), eq(events.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Event', eventId);

  // Delete related records first
  await db.delete(eventLeaders).where(eq(eventLeaders.eventId, eventId));
  await db.delete(eventRegistrations).where(eq(eventRegistrations.eventId, eventId));
  await db.delete(eventOccurrences).where(eq(eventOccurrences.eventId, eventId));
  await db.delete(eventTargetRoles).where(eq(eventTargetRoles.eventId, eventId));
  // Delete the event itself
  await db.delete(events).where(eq(events.id, eventId));

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Event gelöscht', 'event', eventId, existing[0].title);

  return c.json({ success: true });
});

// ─── POST /v1/events/:id/register ────────────────────────────────────────────
eventRoutes.post('/:id/register', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const eventId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const userId = body.user_id || authUser.id;

  const eventRows = await db.select().from(events).where(and(eq(events.id, eventId), eq(events.orgId, authUser.orgId)));
  if (eventRows.length === 0) throw new NotFoundError('Event', eventId);
  const event = eventRows[0];

  // Check if already registered
  const existingReg = await db.select().from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId), eq(eventRegistrations.status, 'registered')));
  if (existingReg.length > 0) throw new AppError(409, 'Bereits angemeldet');

  // Check capacity
  const currentCount = await db.select({ count: count() }).from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, 'registered')));
  const registered = currentCount[0]?.count || 0;

  let status = 'registered';
  let waitlistPosition = null;

  if (event.maxParticipants && registered >= event.maxParticipants) {
    status = 'waitlist';
    const waitlistCount = await db.select({ count: count() }).from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, 'waitlist')));
    waitlistPosition = (waitlistCount[0]?.count || 0) + 1;
  }

  const regId = crypto.randomUUID();
  await db.insert(eventRegistrations).values({
    id: regId,
    eventId,
    userId,
    status,
    waitlistPosition,
    registeredBy: authUser.id,
  });

  // Auto-invoice
  let invoice = null;
  if (event.autoInvoice === 1 && event.feeAmount && event.feeAmount > 0 && status === 'registered') {
    const year = new Date().getFullYear();
    const invCountResult = await db.select({ count: count() }).from(invoices).where(eq(invoices.orgId, authUser.orgId));
    const invNum = `RE-${year}-${String((invCountResult[0]?.count || 0) + 1).padStart(5, '0')}`;
    const invoiceId = crypto.randomUUID();

    await db.insert(invoices).values({
      id: invoiceId,
      orgId: authUser.orgId,
      userId,
      invoiceNumber: invNum,
      status: 'draft',
      subtotal: event.feeAmount,
      total: event.feeAmount,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    });

    await db.insert(invoiceItems).values({
      invoiceId,
      description: `Kursgebühr: ${event.title}`,
      quantity: 1,
      unitPrice: event.feeAmount,
      total: event.feeAmount,
      eventId,
    });

    await db.update(eventRegistrations).set({ invoiceId }).where(eq(eventRegistrations.id, regId));
    invoice = { id: invoiceId, number: invNum, total: event.feeAmount };
  }

  return c.json({ registration: { id: regId, status, waitlistPosition }, invoice }, 201);
});

// ─── DELETE /v1/events/:id/register ──────────────────────────────────────────
eventRoutes.delete('/:id/register', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const eventId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const userId = body.user_id || authUser.id;

  // Cancel registration
  await db.update(eventRegistrations)
    .set({ status: 'cancelled', cancellationReason: body.cancellation_reason })
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId), eq(eventRegistrations.status, 'registered')));

  // Waitlist promotion: find next person on waitlist
  const nextOnWaitlist = await db.select().from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, 'waitlist')))
    .orderBy(asc(eventRegistrations.waitlistPosition))
    .limit(1);

  if (nextOnWaitlist.length > 0) {
    await db.update(eventRegistrations)
      .set({ status: 'registered', waitlistPosition: null })
      .where(eq(eventRegistrations.id, nextOnWaitlist[0].id));
  }

  return c.json({ success: true });
});

// ─── GET /v1/events/:id/registrations ────────────────────────────────────────
eventRoutes.get('/:id/registrations', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const eventId = c.req.param('id');

  const regs = await db
    .select({
      id: eventRegistrations.id,
      userId: eventRegistrations.userId,
      status: eventRegistrations.status,
      waitlistPosition: eventRegistrations.waitlistPosition,
      registeredAt: eventRegistrations.registeredAt,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(eventRegistrations)
    .innerJoin(users, eq(eventRegistrations.userId, users.id))
    .where(eq(eventRegistrations.eventId, eventId));

  const registered = regs.filter((r) => r.status === 'registered');
  const waitlist = regs.filter((r) => r.status === 'waitlist');
  const cancelled = regs.filter((r) => r.status === 'cancelled');

  return c.json({ registered, waitlist, cancelled });
});

