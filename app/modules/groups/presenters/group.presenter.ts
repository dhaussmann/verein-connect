import type { groupsRepository } from "../repository/groups.repository";
import type { GroupAvailableMember, GroupListItem, GroupMemberItem } from "../types/group.types";

type GroupsRepository = ReturnType<typeof groupsRepository>;
type GroupRow = Awaited<ReturnType<GroupsRepository["listGroupsByOrg"]>>[number];
type GroupMemberRow = Awaited<ReturnType<GroupsRepository["listGroupMembers"]>>[number];
type UserRow = Awaited<ReturnType<GroupsRepository["listUsersByOrg"]>>[number];

export function toGroupListItem(group: GroupRow): GroupListItem {
  return {
    id: group.id,
    orgId: group.orgId,
    name: group.name,
    description: group.description,
    category: group.category,
    createdAt: group.createdAt || "",
  };
}

export function toGroupMemberItem(member: GroupMemberRow): GroupMemberItem {
  return {
    id: member.id,
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt || "",
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
  };
}

export function toAvailableMember(member: UserRow): GroupAvailableMember {
  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
  };
}
