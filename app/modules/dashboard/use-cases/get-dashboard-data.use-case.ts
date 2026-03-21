import { and, count, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { auditLog, eventRegistrations, events, users } from "@/core/db/schema";

export async function getDashboardDataUseCase(env: RouteEnv, orgId: string) {
  const db = drizzle(env.DB);

  const [memberCountRows, eventRows, auditRows] = await Promise.all([
    db.select({ count: count() }).from(users).where(eq(users.orgId, orgId)),
    db.select().from(events).where(eq(events.orgId, orgId)).orderBy(desc(events.startDate)).limit(5),
    db.select().from(auditLog).where(eq(auditLog.orgId, orgId)).orderBy(desc(auditLog.createdAt)).limit(8),
  ]);

  const eventIds = eventRows.map((event) => event.id);
  const auditUserIds = [...new Set(auditRows.map((entry) => entry.userId).filter((id): id is string => Boolean(id)))];

  const [participantRows, auditUsers] = await Promise.all([
    eventIds.length > 0
      ? db
          .select({ eventId: eventRegistrations.eventId, count: count() })
          .from(eventRegistrations)
          .where(and(inArray(eventRegistrations.eventId, eventIds), eq(eventRegistrations.status, "registered")))
          .groupBy(eventRegistrations.eventId)
      : Promise.resolve([]),
    auditUserIds.length > 0
      ? db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(inArray(users.id, auditUserIds))
      : Promise.resolve([]),
  ]);

  const participantCountByEventId = new Map(participantRows.map((row) => [row.eventId, row.count]));
  const auditUsersById = new Map(auditUsers.map((user) => [user.id, user]));

  const eventsData = eventRows.map((event) => {
    const participants = participantCountByEventId.get(event.id) || 0;

    return {
      id: event.id,
      title: event.title,
      startDate: event.startDate || "",
      timeStart: event.timeStart || "",
      eventType: event.eventType || "",
      participants,
      maxParticipants: event.maxParticipants || 0,
    };
  });

  const auditData = auditRows.map((entry) => {
    const user = entry.userId ? auditUsersById.get(entry.userId) : undefined;
    const userName = user ? `${user.firstName} ${user.lastName}` : "System";

    return {
      id: entry.id,
      action: entry.action,
      user: userName,
      timestamp: entry.createdAt || "",
    };
  });

  return {
    membersData: {
      meta: {
        total: memberCountRows[0]?.count || 0,
      },
    },
    eventsData: {
      data: eventsData,
      meta: {
        total: eventsData.length,
      },
    },
    auditData: {
      data: auditData,
    },
  };
}
