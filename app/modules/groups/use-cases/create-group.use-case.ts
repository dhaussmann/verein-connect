import { writeAuditLog } from "@/core/lib/audit";
import type { RouteEnv } from "@/core/runtime/route";
import { groupsRepository } from "../repository/groups.repository";

export async function createGroupUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; name: string; description?: string; category?: string },
) {
  const repo = groupsRepository(env);
  const created = await repo.createGroup({
    orgId: input.orgId,
    name: input.name,
    description: input.description || null,
    category: input.category || "standard",
  });

  await writeAuditLog(env.DB, input.orgId, input.actorUserId, `Gruppe '${input.name}' erstellt`, "group", created.id);
  return created.id;
}
