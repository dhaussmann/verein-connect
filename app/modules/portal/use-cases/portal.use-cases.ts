import { and, count, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import bcrypt from "bcryptjs";
import type { RouteEnv } from "@/core/runtime/route";
import { writeAuditLog } from "@/core/lib/audit";
import {
  attendance,
  eventOccurrences,
  eventRegistrations,
  events,
  profileFieldDefinitions,
  profileFieldValues,
  roles,
  userRoles,
  users,
} from "@/core/db/schema";

export async function getPortalProfileUseCase(env: RouteEnv, userId: string) {
  const db = drizzle(env.DB);
  const userRows = await db.select().from(users).where(eq(users.id, userId));
  const user = userRows[0];
  if (!user) return null;

  const [memberRoles, fields] = await Promise.all([
    db
      .select({ id: roles.id, name: roles.name, category: roles.category, description: roles.description })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(userRoles.userId, user.id), eq(userRoles.status, "active"))),
    db
      .select({
        fieldName: profileFieldDefinitions.fieldName,
        fieldLabel: profileFieldDefinitions.fieldLabel,
        value: profileFieldValues.value,
      })
      .from(profileFieldValues)
      .innerJoin(profileFieldDefinitions, eq(profileFieldValues.fieldId, profileFieldDefinitions.id))
      .where(eq(profileFieldValues.userId, user.id)),
  ]);

  const customFields = fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.fieldLabel || field.fieldName] = field.value || "";
    return acc;
  }, {});

  const statusMap: Record<string, string> = { active: "Aktiv", inactive: "Inaktiv", pending: "Ausstehend" };

  return {
    id: user.id,
    memberNumber: user.memberNumber || "",
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || "",
    mobile: user.mobile || "",
    birthDate: user.birthDate || "",
    gender: user.gender || "",
    street: user.street || "",
    zip: user.zip || "",
    city: user.city || "",
    status: statusMap[user.status || "active"] || user.status,
    avatarUrl: user.avatarUrl,
    avatarInitials: `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`,
    roles: memberRoles.map((role) => ({
      id: role.id,
      name: role.name,
      category: role.category,
      description: role.description || "",
    })),
    customFields,
    joinDate: (user.joinDate || user.createdAt) ? new Date((user.joinDate || user.createdAt) as string).toLocaleDateString("de-DE") : "",
  };
}

export async function updatePortalProfileUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    userId: string;
    phone?: string;
    mobile?: string;
    street?: string;
    zip?: string;
    city?: string;
    currentPassword?: string;
    newPassword?: string;
  },
) {
  const db = drizzle(env.DB);
  const updateData: Record<string, string | null> = {
    updatedAt: new Date().toISOString(),
  };

  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.mobile !== undefined) updateData.mobile = input.mobile;
  if (input.street !== undefined) updateData.street = input.street;
  if (input.zip !== undefined) updateData.zip = input.zip;
  if (input.city !== undefined) updateData.city = input.city;

  if (input.newPassword) {
    if (!input.currentPassword) {
      throw new Error("Aktuelles Passwort erforderlich");
    }

    const userRows = await db.select().from(users).where(eq(users.id, input.userId));
    const user = userRows[0];
    if (!user) {
      throw new Error("Benutzer nicht gefunden");
    }

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash || "");
    if (!valid) {
      throw new Error("Aktuelles Passwort ist falsch");
    }

    updateData.passwordHash = await bcrypt.hash(input.newPassword, 12);
  }

  await db.update(users).set(updateData).where(eq(users.id, input.userId));
  await writeAuditLog(env.DB, input.orgId, input.userId, "Eigenes Profil bearbeitet", "user", input.userId);
}

export async function getPortalEventsUseCase(env: RouteEnv, userId: string) {
  const db = drizzle(env.DB);
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
    .where(and(eq(eventRegistrations.userId, userId), eq(eventRegistrations.status, "registered")))
    .orderBy(desc(events.startDate));

  const eventIds = [...new Set(registrations.map((registration) => registration.eventId))];
  const participantRows = eventIds.length > 0
    ? await db
        .select({ eventId: eventRegistrations.eventId, count: count() })
        .from(eventRegistrations)
        .where(and(inArray(eventRegistrations.eventId, eventIds), eq(eventRegistrations.status, "registered")))
        .groupBy(eventRegistrations.eventId)
    : [];
  const participantsByEventId = new Map(participantRows.map((row) => [row.eventId, row.count]));

  return registrations.map((registration) => {
    const statusMap: Record<string, string> = {
      draft: "Entwurf",
      published: "Aktiv",
      active: "Aktiv",
      completed: "Abgeschlossen",
      cancelled: "Abgesagt",
    };

    return {
      id: registration.eventId,
      title: registration.title,
      description: registration.description || "",
      location: registration.location || "",
      startDate: registration.startDate || "",
      endDate: registration.endDate || "",
      timeStart: registration.timeStart || "",
      timeEnd: registration.timeEnd || "",
      eventType: registration.eventType || "single",
      status: statusMap[registration.status || "active"] || registration.status,
      maxParticipants: registration.maxParticipants,
      participants: participantsByEventId.get(registration.eventId) || 0,
      registeredAt: registration.registeredAt,
      registrationStatus: registration.regStatus,
    };
  });
}

export async function getPortalAttendanceUseCase(env: RouteEnv, userId: string) {
  const db = drizzle(env.DB);
  const rows = await db
    .select({
      id: attendance.id,
      status: attendance.status,
      checkedInAt: attendance.checkedInAt,
      eventTitle: events.title,
      startDate: eventOccurrences.startDate,
    })
    .from(attendance)
    .innerJoin(eventOccurrences, eq(attendance.occurrenceId, eventOccurrences.id))
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(eq(attendance.userId, userId))
    .orderBy(desc(eventOccurrences.startDate))
    .limit(50);

  const total = rows.length;
  const present = rows.filter((row) => row.status === "present").length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
  const statusMap: Record<string, string> = {
    present: "Anwesend",
    absent: "Abwesend",
    excused: "Entschuldigt",
    late: "Verspätet",
  };

  return {
    stats: { total, present, rate },
    records: rows.map((row) => ({
      id: row.id,
      date: row.startDate || row.checkedInAt || "",
      eventTitle: row.eventTitle,
      status: statusMap[row.status] || row.status,
    })),
  };
}

export async function getPortalDashboardUseCase(env: RouteEnv, userId: string) {
  const [profile, eventsData, attendanceData] = await Promise.all([
    getPortalProfileUseCase(env, userId),
    getPortalEventsUseCase(env, userId),
    getPortalAttendanceUseCase(env, userId),
  ]);

  return {
    data: {
      registeredEvents: eventsData.length,
      attendanceRate: attendanceData.stats.rate,
      upcomingEvents: eventsData.slice(0, 5).map((event) => ({
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        timeStart: event.timeStart,
        timeEnd: event.timeEnd,
        location: event.location,
      })),
      roles: profile?.roles.map((role) => role.name) || [],
    },
  };
}
