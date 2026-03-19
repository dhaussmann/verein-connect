import { writeAuditLog } from "@/core/lib/audit";
import type { RouteEnv } from "@/core/runtime/route";
import { groupsRepository } from "../repository/groups.repository";

export async function deleteGroupUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; groupId: string },
) {
  const repo = groupsRepository(env);
  const group = await repo.findGroupById(input.orgId, input.groupId);
  if (!group) {
    throw new Error("Gruppe nicht gefunden");
  }

  await repo.deleteAllGroupMembers(input.groupId);
  await repo.deleteGroup(input.groupId);
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Gruppe '${group.name}' gelöscht`, "group", input.groupId);
}
