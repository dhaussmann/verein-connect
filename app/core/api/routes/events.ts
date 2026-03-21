import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, desc, count, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../../types/env';
import { events, eventOccurrences, eventRegistrations, eventCategories, eventLeaders, eventTargetRoles, users, roles, invoices, invoiceItems, attendance } from '../../db/schema';
import { parsePagination, buildMeta } from '../../lib/pagination';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const eventRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Helper: Enrich event ───────────────────────────────────────────────────
async function enrichEvent(db: ReturnType<typeof drizzle>, event: any) {
  let category = null;
  if (event.categoryId) {
    const catRows = await db.select().from(eventCategories).where(eq(eventCategories.id, event.categoryId));
    category = catRows[0] || null;
  }

  const leaders = await db
    .select({ userId: eventLeaders.userId, firstName: users.firstName, lastName: users.lastName })
    .from(eventLeaders)
    .innerJoin(users, eq(eventLeaders.userId, users.id))
    .where(eq(eventLeaders.eventId, event.id));

  const targetRoles = await db
    .select({ roleId: eventTargetRoles.roleId, roleName: roles.name })
    .from(eventTargetRoles)
    .innerJoin(roles, eq(eventTargetRoles.roleId, roles.id))
    .where(eq(eventTargetRoles.eventId, event.id));

  const regCount = await db.select({ count: count() }).from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.status, 'registered')));

  const occCount = await db.select({ count: count() }).from(eventOccurrences)
    .where(eq(eventOccurrences.eventId, event.id));

  return {
    ...event,
    category,
    leaders: leaders.map((l) => ({ id: l.userId, name: `${l.firstName} ${l.lastName}` })),
    targetRoles,
    registrationCount: regCount[0]?.count || 0,
    occurrenceCount: occCount[0]?.count || 0,
  };
}

// ─── GET / — List events ───────────────────────────────────────────────────
eventRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const conditions: any[] = [eq(events.orgId, user.orgId)];
  if (query.type) conditions.push(eq(events.eventType, query.type));
  if (query.category_id) conditions.push(eq(events.categoryId, query.category_id));

  const whereClause = and(...conditions);
  const totalResult = await db.select({ count: count() }).from(events).where(whereClause);
  const total = totalResult[0]?.count || 0;

  const rows = await db.select().from(events).where(whereClause)
    .orderBy(desc(events.createdAt)).limit(perPage).offset(offset);

  const enriched = await Promise.all(rows.map((e) => enrichEvent(db, e)));

  return c.json({ data: enriched, meta: buildMeta(total, page, perPage) });
});

// ─── GET /calendar — Calendar view ─────────────────────────────────────────
eventRoutes.get('/calendar', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();

  const from = query.from || new Date().toISOString().slice(0, 10);
  const to = query.to || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const occurrences = await db
    .select({
      id: eventOccurrences.id,
      eventId: eventOccurrences.eventId,
      startDate: eventOccurrences.startDate,
      endDate: eventOccurrences.endDate,
      isCancelled: eventOccurrences.isCancelled,
      eventTitle: events.title,
      eventType: events.eventType,
      location: events.location,
    })
    .from(eventOccurrences)
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(and(eq(events.orgId, user.orgId), gte(eventOccurrences.startDate, from), lte(eventOccurrences.startDate, to)));

  return c.json(occurrences);
});

// ─── GET /:id — Event detail ───────────────────────────────────────────────
eventRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(events).where(and(eq(events.id, id), eq(events.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Veranstaltung', id);

  const enriched = await enrichEvent(db, rows[0]);

  const occurrences = await db.select().from(eventOccurrences).where(eq(eventOccurrences.eventId, id)).orderBy(eventOccurrences.startDate);

  const registrations = await db
    .select({
      id: eventRegistrations.id,
      userId: eventRegistrations.userId,
      status: eventRegistrations.status,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      registeredAt: eventRegistrations.registeredAt,
    })
    .from(eventRegistrations)
    .innerJoin(users, eq(eventRegistrations.userId, users.id))
    .where(eq(eventRegistrations.eventId, id));

  return c.json({ ...enriched, occurrences, registrations });
});

// ─── POST / — Create event ─────────────────────────────────────────────────
const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  event_type: z.enum(['single', 'recurring', 'course']),
  location: z.string().optional(),
  category_id: z.string().optional(),
  max_participants: z.number().optional(),
  fee_amount: z.number().optional(),
  start_date: z.string(),
  end_date: z.string().optional(),
  time_start: z.string().optional(),
  time_end: z.string().optional(),
  recurrence_rule: z.string().optional(),
  weekdays: z.string().optional(),
  leader_ids: z.array(z.string()).optional(),
  target_role_ids: z.array(z.string()).optional(),
  occurrences: z.array(z.object({
    start_date: z.string(),
    end_date: z.string().optional(),
  })).optional(),
});

eventRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;
  const eventId = crypto.randomUUID();

  await db.insert(events).values({
    id: eventId,
    orgId: user.orgId,
    title: data.title,
    description: data.description || null,
    eventType: data.event_type,
    location: data.location || null,
    categoryId: data.category_id || null,
    maxParticipants: data.max_participants || null,
    feeAmount: data.fee_amount ?? 0,
    startDate: data.start_date,
    endDate: data.end_date || null,
    timeStart: data.time_start || null,
    timeEnd: data.time_end || null,
    recurrenceRule: data.recurrence_rule || null,
    weekdays: data.weekdays || null,
    createdBy: user.id,
  });

  // Leaders
  if (data.leader_ids?.length) {
    for (const lid of data.leader_ids) {
      await db.insert(eventLeaders).values({ eventId, userId: lid });
    }
  }

  // Target roles
  if (data.target_role_ids?.length) {
    for (const rid of data.target_role_ids) {
      await db.insert(eventTargetRoles).values({ eventId, roleId: rid });
    }
  }

  // Occurrences
  if (data.occurrences?.length) {
    for (const occ of data.occurrences) {
      await db.insert(eventOccurrences).values({
        eventId,
        startDate: occ.start_date,
        endDate: occ.end_date || null,
      });
    }
  } else if (data.event_type === 'recurring' && data.recurrence_rule && data.start_date) {
    // Generate recurring occurrences
    const start = new Date(data.start_date);
    const end = data.end_date ? new Date(data.end_date) : new Date(start.getTime() + 365 * 86400000);
    const rule = data.recurrence_rule;
    const current = new Date(start);

    while (current <= end) {
      await db.insert(eventOccurrences).values({
        eventId,
        startDate: current.toISOString().slice(0, 10),
      });

      if (rule === 'weekly') current.setDate(current.getDate() + 7);
      else if (rule === 'biweekly') current.setDate(current.getDate() + 14);
      else if (rule === 'monthly') current.setMonth(current.getMonth() + 1);
      else break;
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Veranstaltung erstellt', 'event', eventId, data.title);

  return c.json({ id: eventId }, 201);
});

// ─── PUT /:id — Update event ───────────────────────────────────────────────
eventRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(events).where(and(eq(events.id, id), eq(events.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Veranstaltung', id);

  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.location !== undefined) updateData.location = body.location;
  if (body.category_id !== undefined) updateData.categoryId = body.category_id;
  if (body.max_participants !== undefined) updateData.maxParticipants = body.max_participants;
  if (body.fee_amount !== undefined) updateData.feeAmount = body.fee_amount;
  if (body.start_date !== undefined) updateData.startDate = body.start_date;
  if (body.end_date !== undefined) updateData.endDate = body.end_date;
  if (body.time_start !== undefined) updateData.timeStart = body.time_start;
  if (body.time_end !== undefined) updateData.timeEnd = body.time_end;

  await db.update(events).set(updateData).where(eq(events.id, id));

  // Update leaders
  if (body.leader_ids !== undefined) {
    await db.delete(eventLeaders).where(eq(eventLeaders.eventId, id));
    for (const lid of body.leader_ids) {
      await db.insert(eventLeaders).values({ eventId: id, userId: lid });
    }
  }

  // Update target roles
  if (body.target_role_ids !== undefined) {
    await db.delete(eventTargetRoles).where(eq(eventTargetRoles.eventId, id));
    for (const rid of body.target_role_ids) {
      await db.insert(eventTargetRoles).values({ eventId: id, roleId: rid });
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Veranstaltung bearbeitet', 'event', id);

  return c.json({ success: true });
});

// ─── DELETE /:id — Delete event ─────────────────────────────────────────────
eventRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  // Cascade delete
  const occIds = (await db.select({ id: eventOccurrences.id }).from(eventOccurrences).where(eq(eventOccurrences.eventId, id))).map((o) => o.id);
  if (occIds.length > 0) {
    await db.delete(attendance).where(inArray(attendance.occurrenceId, occIds));
  }
  await db.delete(eventOccurrences).where(eq(eventOccurrences.eventId, id));
  await db.delete(eventRegistrations).where(eq(eventRegistrations.eventId, id));
  await db.delete(eventLeaders).where(eq(eventLeaders.eventId, id));
  await db.delete(eventTargetRoles).where(eq(eventTargetRoles.eventId, id));
  await db.delete(events).where(and(eq(events.id, id), eq(events.orgId, user.orgId)));

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Veranstaltung gelöscht', 'event', id);

  return c.json({ success: true });
});

// ─── POST /:id/register — Register for event ───────────────────────────────
eventRoutes.post('/:id/register', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const eventId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const userId = body.user_id || user.id;

  const existingReg = await db.select().from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)));
  if (existingReg.length > 0) throw new ConflictError('Bereits angemeldet');

  const evt = await db.select().from(events).where(eq(events.id, eventId));
  if (evt.length === 0) throw new NotFoundError('Veranstaltung', eventId);

  const regCount = await db.select({ count: count() }).from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, 'registered')));
  const currentCount = regCount[0]?.count || 0;

  let status = 'registered';
  if (evt[0].maxParticipants && currentCount >= evt[0].maxParticipants) {
    status = 'waitlist';
  }

  await db.insert(eventRegistrations).values({
    eventId,
    userId,
    status,
  });

  // Auto-generate invoice if event has a fee
  const fee = evt[0].feeAmount || 0;
  if (fee > 0 && status === 'registered') {
    const invCount = await db.select({ count: count() }).from(invoices).where(eq(invoices.orgId, user.orgId));
    const invNum = `RE-${new Date().getFullYear()}-${String((invCount[0]?.count || 0) + 1).padStart(5, '0')}`;

    const inv = await db.insert(invoices).values({
      orgId: user.orgId,
      userId,
      invoiceNumber: invNum,
      status: 'draft',
      subtotal: fee,
      total: fee,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      notes: `Anmeldung: ${evt[0].title}`,
    }).returning();

    await db.insert(invoiceItems).values({
      invoiceId: inv[0].id,
      description: `Teilnahme: ${evt[0].title}`,
      quantity: 1,
      unitPrice: fee,
      total: fee,
    });
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Anmeldung', 'event', eventId);

  return c.json({ status }, 201);
});

// ─── DELETE /:id/register — Cancel registration ────────────────────────────
eventRoutes.delete('/:id/register', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const eventId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const userId = body.user_id || user.id;

  await db.delete(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)));

  // Promote from waitlist
  const waitlist = await db.select().from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, 'waitlist')))
    .orderBy(eventRegistrations.registeredAt)
    .limit(1);

  if (waitlist.length > 0) {
    await db.update(eventRegistrations).set({ status: 'registered' })
      .where(eq(eventRegistrations.id, waitlist[0].id));
  }

  return c.json({ success: true });
});

// ─── GET /:id/registrations — List registrations ───────────────────────────
eventRoutes.get('/:id/registrations', async (c) => {
  const db = drizzle(c.env.DB);
  const eventId = c.req.param('id');

  const regs = await db
    .select({
      id: eventRegistrations.id,
      userId: eventRegistrations.userId,
      status: eventRegistrations.status,
      registeredAt: eventRegistrations.registeredAt,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(eventRegistrations)
    .innerJoin(users, eq(eventRegistrations.userId, users.id))
    .where(eq(eventRegistrations.eventId, eventId));

  return c.json(regs);
});

// ─── Event Categories ──────────────────────────────────────────────────────
eventRoutes.get('/categories', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(eventCategories).where(eq(eventCategories.orgId, user.orgId));
  return c.json(rows);
});

eventRoutes.post('/categories', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const { name, color } = await c.req.json();
  const id = crypto.randomUUID();

  await db.insert(eventCategories).values({ id, orgId: user.orgId, name, color: color || '#3b82f6' });
  return c.json({ id }, 201);
});
