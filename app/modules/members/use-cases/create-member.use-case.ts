import { writeAuditLog } from "@/core/lib/audit";
import type { RouteEnv } from "@/core/runtime/route";
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
    status: "active" | "inactive" | "pending";
    roleId?: string;
    groupId?: string;
    profileFields?: Record<string, string>;
  },
) {
  const repo = membersRepository(env);
  const existing = await repo.findUserByEmail(input.orgId, input.email);
  if (existing) {
    throw new Error("Ein Mitglied mit dieser E-Mail-Adresse existiert bereits");
  }

  const total = await repo.countUsersByOrg(input.orgId);
  const memberId = crypto.randomUUID();
  const memberNumber = `M-${new Date().getFullYear()}-${String(total + 1).padStart(3, "0")}`;

  await repo.insertUser({
    id: memberId,
    orgId: input.orgId,
    email: input.email,
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
    status: input.status,
    memberNumber,
  });

  if (input.roleId) await repo.assignRole(memberId, input.roleId);
  if (input.groupId) await repo.assignGroup(memberId, input.groupId);

  if (input.profileFields) {
    for (const [fieldName, value] of Object.entries(input.profileFields)) {
      if (!value) continue;
      const field = await repo.findProfileFieldByName(input.orgId, fieldName);
      if (field) await repo.setProfileFieldValue(memberId, field.id, value);
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
