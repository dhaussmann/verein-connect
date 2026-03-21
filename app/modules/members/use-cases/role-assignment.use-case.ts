import { writeAuditLog } from "@/core/lib/audit";
import type { RouteEnv } from "@/core/runtime/route";
import { membersRepository } from "../repository/members.repository";

export async function assignMemberRoleUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; userId: string; roleId: string },
) {
  const repo = membersRepository(env);
  const existing = await repo.findActiveUserRole(input.userId, input.roleId);
  if (existing) {
    throw new Error("Rolle ist dem Mitglied bereits zugewiesen");
  }

  await repo.assignRole(input.userId, input.roleId);
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Rolle zugewiesen", "user_role", input.userId, input.roleId);
}
