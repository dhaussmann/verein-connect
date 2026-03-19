import { writeAuditLog } from "@/core/lib/audit";
import type { RouteEnv } from "@/core/runtime/route";
import { groupsRepository } from "../repository/groups.repository";

export async function updateGroupUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; groupId: string; name: string; description?: string; category?: string },
) {
  const repo = groupsRepository(env);
  await repo.updateGroup(input.orgId, input.groupId, {
    name: input.name,
    description: input.description || null,
    category: input.category || "standard",
  });
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Gruppe '${input.name}' bearbeitet`, "group", input.groupId);
}
