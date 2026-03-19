import type { RouteEnv } from "@/core/runtime/route";
import { groupsRepository } from "../repository/groups.repository";
import { toAvailableMember, toGroupListItem, toGroupMemberItem } from "../presenters/group.presenter";

export async function getGroupDetailUseCase(env: RouteEnv, input: { orgId: string; groupId: string }) {
  const repo = groupsRepository(env);
  const [group, groupMembers, users, existingRows] = await Promise.all([
    repo.findGroupById(input.orgId, input.groupId),
    repo.listGroupMembers(input.groupId),
    repo.listUsersByOrg(input.orgId),
    repo.listMemberUserIdsForGroup(input.groupId),
  ]);

  const existingIds = new Set(existingRows.map((row) => row.userId));

  return {
    group: group ? toGroupListItem(group) : null,
    groupMembers: groupMembers.map(toGroupMemberItem),
    availableMembers: users.filter((user) => !existingIds.has(user.id)).map(toAvailableMember),
  };
}
