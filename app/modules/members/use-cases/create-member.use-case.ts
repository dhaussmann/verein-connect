import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { writeAuditLog } from "@/core/lib/audit";
import { nextMemberNumber } from "@/core/db/sequences";
import type { RouteEnv } from "@/core/runtime/route";
import { profileFieldDefinitions } from "@/core/db/schema";
import { membersRepository } from "../repository/members.repository";

export async function createMemberUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    actorUserId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    mobile?: string;
    birthDate?: string;
    gender?: string;
    street?: string;
    zip?: string;
    city?: string;
    joinDate?: string;
    status: "active" | "inactive" | "pending";
    passwordHash?: string | null;
    roleIds?: string[];
    groupAssignments?: Array<{ groupId: string; role?: string }>;
    profileFields?: Record<string, string>;
  },
) {
  const repo = membersRepository(env);
  const db = drizzle(env.DB);
  const existing = await repo.findUserByEmail(input.orgId, input.email);
  if (existing) {
    throw new Error("Ein Mitglied mit dieser E-Mail-Adresse existiert bereits");
  }

  const memberId = crypto.randomUUID();
  const memberNumber = await nextMemberNumber(env.DB, input.orgId);

  await repo.insertUser({
    id: memberId,
    orgId: input.orgId,
    email: input.email,
    passwordHash: input.passwordHash || null,
    firstName: input.firstName,
    lastName: input.lastName,
    displayName: `${input.firstName} ${input.lastName}`,
    phone: input.phone || null,
    mobile: input.mobile || null,
    birthDate: input.birthDate || null,
    gender: input.gender || null,
    street: input.street || null,
    zip: input.zip || null,
    city: input.city || null,
    joinDate: input.joinDate || null,
    status: input.status,
    memberNumber,
  });

  for (const roleId of [...new Set(input.roleIds || [])]) {
    if (roleId) await repo.assignRole(memberId, roleId);
  }
  for (const assignment of input.groupAssignments || []) {
    if (assignment.groupId) await repo.assignGroup(memberId, assignment.groupId, assignment.role || "Mitglied");
  }

  if (input.profileFields) {
    const fieldNames = Object.entries(input.profileFields)
      .filter(([, value]) => Boolean(value))
      .map(([fieldName]) => fieldName);
    if (fieldNames.length > 0) {
      const fields = await db
        .select({ id: profileFieldDefinitions.id, fieldName: profileFieldDefinitions.fieldName })
        .from(profileFieldDefinitions)
        .where(and(eq(profileFieldDefinitions.orgId, input.orgId), inArray(profileFieldDefinitions.fieldName, fieldNames)));
      const fieldIdsByName = new Map(fields.map((field) => [field.fieldName, field.id]));

      for (const [fieldName, value] of Object.entries(input.profileFields)) {
        if (!value) continue;
        const fieldId = fieldIdsByName.get(fieldName);
        if (fieldId) await repo.setProfileFieldValue(memberId, fieldId, value);
      }
    }
  }

  await writeAuditLog(
    env.DB,
    input.orgId,
    input.actorUserId,
    "Mitglied erstellt",
    "user",
    memberId,
    `${input.firstName} ${input.lastName} (${memberNumber})`,
  );

  return memberId;
}
