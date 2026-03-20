import { and, asc, count, desc, eq, gte, inArray, like, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { Event, CalendarEvent } from "@/lib/api";
import type { RouteEnv } from "@/core/runtime/route";
import { writeAuditLog } from "@/core/lib/audit";
import { buildMeta, parsePagination } from "@/core/lib/pagination";
import {
  eventCategories,
  eventLeaders,
  eventOccurrences,
  eventRegistrations,
  eventTargetGroups,
  events,
  groups,
  users,
} from "@/core/db/schema";

const categoryFallback = "Training";

const detailStatusMap: Record<string, string> = {
  active: "Aktiv",
  draft: "Entwurf",
  completed: "Abgeschlossen",
  cancelled: "Abgesagt",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function mapCalendarStatus(event: typeof events.$inferSelect, participants: number) {
  if (event.status === "cancelled") return "Abgesagt";
  if ((event.maxParticipants || 0) > 0 && participants >= (event.maxParticipants || 0)) return "Voll";
  return "Offen";
}

async function countRegistrations(db: ReturnType<typeof drizzle>, eventId: string, status: "registered" | "waitlist") {
  const rows = await db
    .select({ count: count() })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, status)));
  return rows[0]?.count || 0;
}

type EventRow = typeof events.$inferSelect;

async function enrichEvents(db: ReturnType<typeof drizzle>, eventRows: EventRow[]): Promise<Event[]> {
  if (eventRows.length === 0) return [];

  const eventIds = eventRows.map((event) => event.id);
  const categoryIds = [...new Set(eventRows.map((event) => event.categoryId).filter((id): id is string => Boolean(id)))];

  const [categoryRows, leaderRows, registrationRows, targetGroupRows] = await Promise.all([
    categoryIds.length > 0
      ? db
          .select({ id: eventCategories.id, name: eventCategories.name })
          .from(eventCategories)
          .where(inArray(eventCategories.id, categoryIds))
      : Promise.resolve([]),
    db
      .select({
        eventId: eventLeaders.eventId,
        userId: eventLeaders.userId,
        roleLabel: eventLeaders.roleLabel,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(eventLeaders)
      .innerJoin(users, eq(eventLeaders.userId, users.id))
      .where(inArray(eventLeaders.eventId, eventIds)),
    db
      .select({
        eventId: eventRegistrations.eventId,
        status: eventRegistrations.status,
        count: count(),
      })
      .from(eventRegistrations)
      .where(inArray(eventRegistrations.eventId, eventIds))
      .groupBy(eventRegistrations.eventId, eventRegistrations.status),
    db
      .select({ eventId: eventTargetGroups.eventId, groupId: eventTargetGroups.groupId, groupName: groups.name })
      .from(eventTargetGroups)
      .innerJoin(groups, eq(eventTargetGroups.groupId, groups.id))
      .where(inArray(eventTargetGroups.eventId, eventIds)),
  ]);

  const categoriesById = new Map(categoryRows.map((row) => [row.id, row.name]));

  const leadersByEventId = new Map<string, typeof leaderRows>();
  for (const leader of leaderRows) {
    const list = leadersByEventId.get(leader.eventId) || [];
    list.push(leader);
    leadersByEventId.set(leader.eventId, list);
  }

  const registrationCountsByEventId = new Map<string, { registered: number; waitlist: number }>();
  for (const row of registrationRows) {
    const counts = registrationCountsByEventId.get(row.eventId) || { registered: 0, waitlist: 0 };
    if (row.status === "registered") counts.registered = row.count;
    if (row.status === "waitlist") counts.waitlist = row.count;
    registrationCountsByEventId.set(row.eventId, counts);
  }

  const targetGroupsByEventId = new Map<string, typeof targetGroupRows>();
  for (const row of targetGroupRows) {
    const list = targetGroupsByEventId.get(row.eventId) || [];
    list.push(row);
    targetGroupsByEventId.set(row.eventId, list);
  }

  return eventRows.map((event) => {
    const categoryName = event.categoryId ? categoriesById.get(event.categoryId) || categoryFallback : categoryFallback;
    const leaders = leadersByEventId.get(event.id) || [];
    const instructor = leaders[0];
    const counts = registrationCountsByEventId.get(event.id) || { registered: 0, waitlist: 0 };
    const targetGroups = targetGroupsByEventId.get(event.id) || [];
    const instructorName = instructor ? `${instructor.firstName} ${instructor.lastName}` : "";
    const instructorInitials = instructor
      ? `${instructor.firstName?.[0] || ""}${instructor.lastName?.[0] || ""}`.toUpperCase()
      : "";

    return {
      id: event.id,
      title: event.title,
      category: categoryName,
      status: detailStatusMap[event.status || "active"] || "Aktiv",
      description: event.description || "",
      instructorId: instructor?.userId || "",
      instructorName,
      instructorInitials,
      schedule:
        event.eventType === "recurring" && event.weekdays
          ? `${JSON.parse(event.weekdays).join(", ")} ${event.timeStart || ""}–${event.timeEnd || ""}`.trim()
          : `${formatDate(event.startDate)} ${event.timeStart || ""}–${event.timeEnd || ""}`.trim(),
      location: event.location || "",
      participants: counts.registered,
      maxParticipants: event.maxParticipants || 0,
      waitlist: counts.waitlist,
      price: event.feeAmount || null,
      startDate: event.startDate,
      endDate: event.endDate || "",
      weekdays: event.weekdays ? JSON.parse(event.weekdays) : [],
      timeStart: event.timeStart || "",
      timeEnd: event.timeEnd || "",
      isPublic: event.isPublic === 1,
      showOnHomepage: event.isPublic === 1,
      targetGroups: targetGroups.map((row) => row.groupName),
      autoInvoice: event.autoInvoice === 1,
      eventType: event.eventType,
      leaders: leaders.map((leader) => ({
        userId: leader.userId,
        name: `${leader.firstName} ${leader.lastName}`,
        roleLabel: leader.roleLabel || "Trainer",
      })),
    };
  });
}

async function enrichEvent(db: ReturnType<typeof drizzle>, event: typeof events.$inferSelect): Promise<Event> {
  const enriched = await enrichEvents(db, [event]);
  return enriched[0];
}

export async function listEventsUseCase(
  env: RouteEnv,
  orgId: string,
  query: Record<string, string | undefined>,
) {
  const db = drizzle(env.DB);
  const { page, perPage, offset } = parsePagination(query);
  const conditions = [eq(events.orgId, orgId)];
  let searchableEventIds: string[] | null = null;

  if (query.search) {
    const searchPattern = `%${query.search}%`;
    const leaderMatches = await db
      .select({ eventId: eventLeaders.eventId })
      .from(eventLeaders)
      .innerJoin(users, eq(eventLeaders.userId, users.id))
      .innerJoin(events, eq(eventLeaders.eventId, events.id))
      .where(and(
        eq(events.orgId, orgId),
        or(
          like(events.title, searchPattern),
          like(users.firstName, searchPattern),
          like(users.lastName, searchPattern),
        )!,
      ));

    searchableEventIds = [...new Set(leaderMatches.map((row) => row.eventId))];
    const titleMatches = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.orgId, orgId), like(events.title, searchPattern)));
    searchableEventIds.push(...titleMatches.map((row) => row.id));
    searchableEventIds = [...new Set(searchableEventIds)];

    if (searchableEventIds.length === 0) {
      return {
        data: [],
        meta: buildMeta(0, page, perPage),
      };
    }

    conditions.push(inArray(events.id, searchableEventIds));
  }
  if (query.event_type) conditions.push(eq(events.eventType, query.event_type));
  if (query.status) {
    const reverseMap: Record<string, string> = {
      Aktiv: "active",
      Entwurf: "draft",
      Abgeschlossen: "completed",
      Abgesagt: "cancelled",
    };
    conditions.push(eq(events.status, reverseMap[query.status] || query.status));
  }
  if (query.start_after) conditions.push(gte(events.startDate, query.start_after));
  if (query.start_before) conditions.push(lte(events.startDate, query.start_before));
  if (query.category && query.category !== "all") {
    const categoryRows = await db
      .select({ id: eventCategories.id })
      .from(eventCategories)
      .where(and(eq(eventCategories.orgId, orgId), eq(eventCategories.name, query.category)));
    const categoryIds = categoryRows.map((row) => row.id);
    if (categoryIds.length === 0) {
      return {
        data: [],
        meta: buildMeta(0, page, perPage),
      };
    }
    conditions.push(inArray(events.categoryId, categoryIds));
  }

  const whereClause = and(...conditions);
  const totalRows = await db.select({ count: count() }).from(events).where(whereClause);
  const rows = await db
    .select()
    .from(events)
    .where(whereClause)
    .orderBy(asc(events.startDate))
    .limit(perPage)
    .offset(offset);

  const data = await enrichEvents(db, rows);

  return {
    data,
    meta: buildMeta(totalRows[0]?.count || 0, page, perPage),
  };
}

export async function listCalendarEventsUseCase(
  env: RouteEnv,
  orgId: string,
  input: { perPage?: number; eventType?: string } = {},
): Promise<CalendarEvent[]> {
  const db = drizzle(env.DB);
  const conditions = [eq(events.orgId, orgId)];
  if (input.eventType) conditions.push(eq(events.eventType, input.eventType));

  const eventRows = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(asc(events.startDate))
    .limit(input.perPage || 200);

  if (eventRows.length === 0) return [];

  const eventIds = eventRows.map((row) => row.id);
  const occurrences = await db
    .select()
    .from(eventOccurrences)
    .where(inArray(eventOccurrences.eventId, eventIds))
    .orderBy(asc(eventOccurrences.startDate));

  const occurrenceMap = new Map<string, typeof eventOccurrences.$inferSelect[]>();
  for (const occurrence of occurrences) {
    const list = occurrenceMap.get(occurrence.eventId) || [];
    list.push(occurrence);
    occurrenceMap.set(occurrence.eventId, list);
  }

  const enrichedEvents = await enrichEvents(db, eventRows);
  const enrichedEventsById = new Map(enrichedEvents.map((event) => [event.id, event]));

  const result: CalendarEvent[] = [];
  for (const event of eventRows) {
    const enriched = enrichedEventsById.get(event.id);
    if (!enriched) continue;
    const participants = enriched.participants;
    const base = {
      title: event.title,
      timeStart: event.timeStart || "",
      timeEnd: event.timeEnd || "",
      category: enriched.category,
      location: event.location || "",
      participants,
      maxParticipants: event.maxParticipants || 0,
      status: mapCalendarStatus(event, participants),
    };

    const eventOccurrencesList = occurrenceMap.get(event.id) || [];
    if (eventOccurrencesList.length > 0) {
      for (const occurrence of eventOccurrencesList) {
        result.push({
          id: occurrence.id,
          courseId: event.id,
          date: formatDate(occurrence.startDate),
          endDate: occurrence.endDate ? formatDate(occurrence.endDate) : undefined,
          ...base,
        });
      }
      continue;
    }

    result.push({
      id: event.id,
      courseId: event.id,
      date: formatDate(event.startDate),
      endDate: event.endDate ? formatDate(event.endDate) : undefined,
      ...base,
    });
  }

  return result;
}

export async function getEventDetailUseCase(env: RouteEnv, input: { orgId: string; eventId: string }) {
  const db = drizzle(env.DB);
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.id, input.eventId), eq(events.orgId, input.orgId)));
  const event = rows[0];
  if (!event) return null;

  const enriched = await enrichEvent(db, event);
  const occurrences = await db
    .select()
    .from(eventOccurrences)
    .where(eq(eventOccurrences.eventId, input.eventId))
    .orderBy(asc(eventOccurrences.startDate));

  return { ...enriched, occurrences };
}

export async function createEventUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    actorUserId: string;
    payload: {
      title: string;
      description?: string;
      eventType: string;
      location?: string;
      startDate: string;
      endDate?: string;
      timeStart?: string;
      timeEnd?: string;
      maxParticipants?: number;
      price?: number | null;
      autoInvoice?: boolean;
      isPublic?: boolean;
      instructorId?: string;
      targetGroupIds?: string[];
      weekdays?: string[];
      status?: string;
    };
  },
) {
  const db = drizzle(env.DB);
  const eventId = crypto.randomUUID();
  const statusMap: Record<string, string> = {
    Aktiv: "active",
    Entwurf: "draft",
    Abgeschlossen: "completed",
    Abgesagt: "cancelled",
  };

  await db.insert(events).values({
    id: eventId,
    orgId: input.orgId,
    title: input.payload.title,
    description: input.payload.description || null,
    eventType: input.payload.eventType,
    location: input.payload.location || null,
    startDate: input.payload.startDate,
    endDate: input.payload.endDate || null,
    maxParticipants: input.payload.maxParticipants || 0,
    feeAmount: input.payload.price || 0,
    autoInvoice: input.payload.autoInvoice ? 1 : 0,
    isPublic: input.payload.isPublic ? 1 : 0,
    timeStart: input.payload.timeStart || null,
    timeEnd: input.payload.timeEnd || null,
    weekdays: input.payload.weekdays?.length ? JSON.stringify(input.payload.weekdays) : null,
    status: statusMap[input.payload.status || "Entwurf"] || "draft",
    createdBy: input.actorUserId,
  });

  if (input.payload.instructorId) {
    await db.insert(eventLeaders).values({
      eventId,
      userId: input.payload.instructorId,
      roleLabel: "Trainer",
    });
  }

  if (input.payload.targetGroupIds?.length) {
    for (const groupId of [...new Set(input.payload.targetGroupIds)]) {
      await db.insert(eventTargetGroups).values({ eventId, groupId });
    }
  }

  if (
    input.payload.eventType === "recurring"
    && input.payload.weekdays?.length
    && input.payload.startDate
    && input.payload.endDate
  ) {
    const start = new Date(input.payload.startDate);
    const end = new Date(input.payload.endDate);
    const dayMap: Record<string, number> = { Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5, Sa: 6, So: 0 };
    const targetDays = input.payload.weekdays.map((day) => dayMap[day]).filter((day) => day !== undefined);
    const current = new Date(start);

    while (current <= end) {
      if (targetDays.includes(current.getDay())) {
        const value = current.toISOString().slice(0, 10);
        await db.insert(eventOccurrences).values({
          eventId,
          startDate: value,
          endDate: value,
        });
      }
      current.setDate(current.getDate() + 1);
    }
  }

  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Event erstellt", "event", eventId, input.payload.title);
  return getEventDetailUseCase(env, { orgId: input.orgId, eventId });
}
