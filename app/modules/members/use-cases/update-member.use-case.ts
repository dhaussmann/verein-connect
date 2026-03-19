import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { writeAuditLog } from "@/core/lib/audit";
import { profileFieldDefinitions, profileFieldValues, userRoles, users } from "@/core/db/schema";

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
      status?: string;
      profile_fields?: Record<string, string>;
      role_ids?: string[];
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
  if (input.body.status !== undefined) updateData.status = input.body.status;

  await db.update(users).set(updateData).where(eq(users.id, input.memberId));

  if (input.body.profile_fields) {
    for (const [fieldName, value] of Object.entries(input.body.profile_fields)) {
      const fieldRows = await db.select().from(profileFieldDefinitions)
        .where(and(eq(profileFieldDefinitions.orgId, input.orgId), eq(profileFieldDefinitions.fieldName, fieldName)));
      const field = fieldRows[0];
      if (!field) continue;

      const existingValue = await db.select().from(profileFieldValues)
        .where(and(eq(profileFieldValues.userId, input.memberId), eq(profileFieldValues.fieldId, field.id)));

      if (existingValue[0]) {
        await db.update(profileFieldValues)
          .set({ value, updatedAt: new Date().toISOString() })
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

  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Mitglied bearbeitet", "user", input.memberId, JSON.stringify(input.body));
}
