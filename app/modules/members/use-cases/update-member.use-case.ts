import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { writeAuditLog } from "@/core/lib/audit";
import { groupMembers, profileFieldDefinitions, profileFieldValues, userRoles, users } from "@/core/db/schema";

export async function updateMemberUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    actorUserId: string;
    memberId: string;
    body: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      mobile?: string;
      birth_date?: string;
      gender?: string;
      street?: string;
      zip?: string;
      city?: string;
      join_date?: string;
      status?: string;
      profile_fields?: Record<string, string>;
      role_ids?: string[];
      group_assignments?: Array<{ group_id: string; role?: string }>;
    };
  },
) {
  const db = drizzle(env.DB);
  const existing = await db.select().from(users).where(and(eq(users.id, input.memberId), eq(users.orgId, input.orgId)));
  if (!existing[0]) {
    throw new Error("Mitglied nicht gefunden");
  }

  const updateData: Record<string, string | null> = { updatedAt: new Date().toISOString() };
  if (input.body.first_name !== undefined) updateData.firstName = input.body.first_name;
  if (input.body.last_name !== undefined) updateData.lastName = input.body.last_name;
  if (input.body.email !== undefined) updateData.email = input.body.email;
  if (input.body.phone !== undefined) updateData.phone = input.body.phone;
  if (input.body.mobile !== undefined) updateData.mobile = input.body.mobile;
  if (input.body.birth_date !== undefined) updateData.birthDate = input.body.birth_date;
  if (input.body.gender !== undefined) updateData.gender = input.body.gender;
  if (input.body.street !== undefined) updateData.street = input.body.street;
  if (input.body.zip !== undefined) updateData.zip = input.body.zip;
  if (input.body.city !== undefined) updateData.city = input.body.city;
  if (input.body.join_date !== undefined) updateData.joinDate = input.body.join_date;
  if (input.body.status !== undefined) updateData.status = input.body.status;

  await db.update(users).set(updateData).where(eq(users.id, input.memberId));

  if (input.body.profile_fields) {
    const fieldNames = Object.keys(input.body.profile_fields);
    const fields = fieldNames.length > 0
      ? await db.select().from(profileFieldDefinitions)
          .where(and(eq(profileFieldDefinitions.orgId, input.orgId), inArray(profileFieldDefinitions.fieldName, fieldNames)))
      : [];
    const fieldsByName = new Map(fields.map((field) => [field.fieldName, field]));
    const existingValues = fields.length > 0
      ? await db.select().from(profileFieldValues).where(and(eq(profileFieldValues.userId, input.memberId), inArray(profileFieldValues.fieldId, fields.map((field) => field.id))))
      : [];
    const existingValuesByFieldId = new Map(existingValues.map((value) => [value.fieldId, value]));
    const updatedAt = new Date().toISOString();

    for (const [fieldName, value] of Object.entries(input.body.profile_fields)) {
      const field = fieldsByName.get(fieldName);
      if (!field) continue;

      if (existingValuesByFieldId.has(field.id)) {
        await db.update(profileFieldValues)
          .set({ value, updatedAt })
          .where(and(eq(profileFieldValues.userId, input.memberId), eq(profileFieldValues.fieldId, field.id)));
      } else {
        await db.insert(profileFieldValues).values({ userId: input.memberId, fieldId: field.id, value });
      }
    }
  }

  if (input.body.role_ids) {
    await db.delete(userRoles).where(eq(userRoles.userId, input.memberId));
    for (const roleId of input.body.role_ids) {
      await db.insert(userRoles).values({ userId: input.memberId, roleId, status: "active" });
    }
  }

  if (input.body.group_assignments) {
    await db.delete(groupMembers).where(eq(groupMembers.userId, input.memberId));
    for (const assignment of input.body.group_assignments) {
      await db.insert(groupMembers).values({
        userId: input.memberId,
        groupId: assignment.group_id,
        role: assignment.role || "Mitglied",
      });
    }
  }

  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Mitglied bearbeitet", "user", input.memberId, JSON.stringify(input.body));
}
