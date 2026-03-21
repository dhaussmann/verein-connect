import { writeAuditLog } from "@/core/lib/audit";
import type { RouteEnv } from "@/core/runtime/route";
import { groupsRepository } from "../repository/groups.repository";

export async function addGroupMemberUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; groupId: string; userId: string; role?: string },
) {
  const repo = groupsRepository(env);
  const group = await repo.findGroupById(input.orgId, input.groupId);
  if (!group) {
    throw new Error("Gruppe nicht gefunden");
  }

  await repo.addGroupMember(input.groupId, input.userId, input.role || "Mitglied");
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Mitglied zu Gruppe '${group.name}' hinzugefügt`, "group", input.groupId);
}
