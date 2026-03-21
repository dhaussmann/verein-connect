import type { RouteEnv } from "@/core/runtime/route";
import { groupsRepository } from "../repository/groups.repository";
import { toGroupListItem } from "../presenters/group.presenter";

export async function listGroupsUseCase(env: RouteEnv, orgId: string) {
  const repo = groupsRepository(env);
  const groups = await repo.listGroupsByOrg(orgId);
  return { groups: groups.map(toGroupListItem) };
}
