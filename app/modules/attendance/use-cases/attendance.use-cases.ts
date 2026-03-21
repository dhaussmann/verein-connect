import { and, count, eq, gte, inArray, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { attendance, eventOccurrences, eventRegistrations, events, users } from "@/core/db/schema";

export async function listAttendanceEventsUseCase(
  env: RouteEnv,
  orgId: string,
  input: { startDate: string; endDate?: string },
) {
  const db = drizzle(env.DB);
  const dateCondition = input.endDate
    ? and(
        eq(events.orgId, orgId),
        gte(eventOccurrences.startDate, input.startDate),
        lte(eventOccurrences.startDate, input.endDate),
      )
    : and(eq(events.orgId, orgId), eq(eventOccurrences.startDate, input.startDate));

  const rows = await db
    .select({
      id: eventOccurrences.id,
      eventId: eventOccurrences.eventId,
      title: events.title,
      location: events.location,
      overrideLocation: eventOccurrences.overrideLocation,
      maxParticipants: events.maxParticipants,
      timeStart: events.timeStart,
      timeEnd: events.timeEnd,
    })
    .from(eventOccurrences)
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(dateCondition);

  const eventIds = [...new Set(rows.map((row) => row.eventId))];
  const occurrenceIds = rows.map((row) => row.id);
  const [registeredCounts, checkedInCounts] = await Promise.all([
    eventIds.length > 0
      ? db
          .select({ eventId: eventRegistrations.eventId, count: count() })
          .from(eventRegistrations)
          .where(and(inArray(eventRegistrations.eventId, eventIds), eq(eventRegistrations.status, "registered")))
          .groupBy(eventRegistrations.eventId)
      : Promise.resolve([]),
    occurrenceIds.length > 0
      ? db
          .select({ occurrenceId: attendance.occurrenceId, count: count() })
          .from(attendance)
          .where(and(inArray(attendance.occurrenceId, occurrenceIds), eq(attendance.status, "present")))
          .groupBy(attendance.occurrenceId)
      : Promise.resolve([]),
  ]);

  const registeredByEventId = new Map(registeredCounts.map((row) => [row.eventId, row.count]));
  const checkedInByOccurrenceId = new Map(checkedInCounts.map((row) => [row.occurrenceId, row.count]));

  const data = rows.map((row) => {
    const totalParticipants = registeredByEventId.get(row.eventId) || 0;
    const checkedIn = checkedInByOccurrenceId.get(row.id) || 0;

    return {
      id: row.id,
      title: row.title,
      timeStart: row.timeStart || "",
      timeEnd: row.timeEnd || "",
      location: row.overrideLocation || row.location || "",
      status: checkedIn > 0 && checkedIn < totalParticipants ? "Aktiv" : checkedIn >= totalParticipants && totalParticipants > 0 ? "Abgeschlossen" : "Offen",
      participants: checkedIn,
      maxParticipants: totalParticipants || row.maxParticipants || 0,
    };
  });

  return { data };
}

export async function getAttendanceOccurrenceUseCase(env: RouteEnv, input: { orgId: string; occurrenceId: string }) {
  const db = drizzle(env.DB);
  const occurrenceRows = await db
    .select({
      id: eventOccurrences.id,
      eventId: eventOccurrences.eventId,
      title: events.title,
      location: events.location,
      overrideLocation: eventOccurrences.overrideLocation,
      timeStart: events.timeStart,
      timeEnd: events.timeEnd,
    })
    .from(eventOccurrences)
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(and(eq(eventOccurrences.id, input.occurrenceId), eq(events.orgId, input.orgId)));
  const occurrence = occurrenceRows[0];
  if (!occurrence) return null;

  const registered = await db
    .select({
      userId: eventRegistrations.userId,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(eventRegistrations)
    .innerJoin(users, eq(eventRegistrations.userId, users.id))
    .where(and(eq(eventRegistrations.eventId, occurrence.eventId), eq(eventRegistrations.status, "registered")));

  const attendanceRows = await db
    .select()
    .from(attendance)
    .where(eq(attendance.occurrenceId, input.occurrenceId));
  const attendanceMap = new Map(attendanceRows.map((row) => [row.userId, row]));

  return {
    event: {
      title: occurrence.title,
      timeStart: occurrence.timeStart || "",
      timeEnd: occurrence.timeEnd || "",
      location: occurrence.overrideLocation || occurrence.location || "",
    },
    attendanceData: registered.map((participant) => {
      const record = attendanceMap.get(participant.userId);
      return {
        id: record?.id || participant.userId,
        userId: participant.userId,
        memberId: participant.userId,
        memberName: `${participant.firstName} ${participant.lastName}`,
        status: record?.status || "pending",
        checkedInAt: record?.checkedInAt || undefined,
      };
    }),
  };
}

export async function checkInAttendanceUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    actorUserId: string;
    occurrenceId: string;
    userId: string;
    status: string;
    method?: string;
  },
) {
  const db = drizzle(env.DB);
  const occurrence = await db
    .select({ id: eventOccurrences.id })
    .from(eventOccurrences)
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(and(eq(eventOccurrences.id, input.occurrenceId), eq(events.orgId, input.orgId)));
  if (!occurrence[0]) {
    throw new Error("Termin nicht gefunden");
  }

  const existing = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.occurrenceId, input.occurrenceId), eq(attendance.userId, input.userId)));

  const values = {
    status: input.status,
    checkedInAt: input.status === "present" ? new Date().toISOString() : null,
    checkedInBy: input.actorUserId,
    checkInMethod: input.method || "manual",
  };

  if (existing[0]) {
    await db.update(attendance).set(values).where(eq(attendance.id, existing[0].id));
    return;
  }

  await db.insert(attendance).values({
    occurrenceId: input.occurrenceId,
    userId: input.userId,
    ...values,
  });
}
