import { writeAuditLog } from "@/core/lib/audit";
import type { RouteEnv } from "@/core/runtime/route";
import { groupsRepository } from "../repository/groups.repository";

export async function removeGroupMemberUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; groupId: string; userId: string },
) {
  const repo = groupsRepository(env);
  const group = await repo.findGroupById(input.orgId, input.groupId);
  if (!group) {
    throw new Error("Gruppe nicht gefunden");
  }

  await repo.removeGroupMember(input.groupId, input.userId);
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Mitglied aus Gruppe '${group.name}' entfernt`, "group", input.groupId);
}
