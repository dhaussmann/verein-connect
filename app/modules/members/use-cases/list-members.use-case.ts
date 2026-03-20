import { membersRepository } from "../repository/members.repository";
import type { RouteEnv } from "@/core/runtime/route";
import { toMemberGroupOption, toMemberRoleOption } from "../presenters/member.presenter";
import type { MemberListItem } from "../types/member.types";

function mapStatus(status: string | null): MemberListItem["status"] {
  const statusMap: Record<string, MemberListItem["status"]> = {
    active: "Aktiv",
    inactive: "Inaktiv",
    pending: "Ausstehend",
    blocked: "Inaktiv",
  };
  return statusMap[status || "active"] || "Aktiv";
}

export async function listMembersUseCase(
  env: RouteEnv,
  orgId: string,
  filters: {
    search?: string;
    status?: string;
    role?: string;
    group?: string;
    sort?: string;
    dir?: string;
    page?: number;
    perPage?: number;
  },
) {
  const repo = membersRepository(env);
  const page = Math.max(1, filters.page || 1);
  const perPage = Math.max(1, filters.perPage || 25);
  const offset = (page - 1) * perPage;

  let filteredUserIds: string[] | undefined;

  if (filters.role && filters.role !== "Alle") {
    filteredUserIds = await repo.listUserIdsByRoleName(orgId, filters.role);
  }

  if (filters.group && filters.group !== "Alle") {
    const groupUserIds = await repo.listUserIdsByGroupName(orgId, filters.group);
    filteredUserIds = filteredUserIds
      ? filteredUserIds.filter((userId) => groupUserIds.includes(userId))
      : groupUserIds;
  }

  const [total, userRows] = await Promise.all([
    repo.countUsersByOrgFiltered({
      orgId,
      search: filters.search?.trim(),
      status: filters.status,
      userIds: filteredUserIds,
    }),
    repo.listUsersByOrgPage({
      orgId,
      search: filters.search?.trim(),
      status: filters.status,
      userIds: filteredUserIds,
      sort: filters.sort,
      dir: filters.dir,
      limit: perPage,
      offset,
    }),
  ]);

  const userIds = userRows.map((row) => row.id);

  const [roleRowsByUser, groupRowsByUser, customFieldRowsByUser] = await Promise.all([
    repo.listActiveRolesForUsers(userIds),
    repo.listGroupsForUsers(userIds),
    repo.listCustomFieldsForUsers(userIds),
  ]);

  const rolesByUserId = new Map<string, typeof roleRowsByUser>();
  for (const role of roleRowsByUser) {
    const list = rolesByUserId.get(role.userId) || [];
    list.push(role);
    rolesByUserId.set(role.userId, list);
  }

  const groupsByUserId = new Map<string, typeof groupRowsByUser>();
  for (const group of groupRowsByUser) {
    const list = groupsByUserId.get(group.userId) || [];
    list.push(group);
    groupsByUserId.set(group.userId, list);
  }

  const customFieldsByUserId = new Map<string, Record<string, string>>();
  for (const field of customFieldRowsByUser) {
    const values = customFieldsByUserId.get(field.userId) || {};
    values[field.fieldName] = field.value || "";
    customFieldsByUserId.set(field.userId, values);
  }

  const allMembers: MemberListItem[] = userRows.map((row) => {
    const memberRoles = rolesByUserId.get(row.id) || [];
    const memberGroups = groupsByUserId.get(row.id) || [];

    return {
      id: row.id,
      memberNumber: row.memberNumber || "",
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone || "",
      mobile: row.mobile || "",
      birthDate: row.birthDate || "",
      gender: row.gender || "",
      street: row.street || "",
      zip: row.zip || "",
      city: row.city || "",
      status: mapStatus(row.status),
      roles: memberRoles.map((role) => role.name),
      groups: memberGroups.map((group) => ({
        id: group.groupId,
        name: group.groupName,
        category: group.category,
        role: group.memberRole,
      })),
      joinDate: (row.joinDate || row.createdAt)
        ? new Date((row.joinDate || row.createdAt) as string).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "",
      avatarInitials: `${row.firstName?.[0] || ""}${row.lastName?.[0] || ""}`.toUpperCase(),
      customFields: customFieldsByUserId.get(row.id) || {},
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const members = allMembers;

  const [roleRows, groupRows] = await Promise.all([
    repo.listRolesByOrg(orgId),
    repo.listGroupsByOrg(orgId),
  ]);
  const roleCounts = await repo.countActiveMembersForRoles(roleRows.map((role) => role.id));
  const roleCountsById = new Map(roleCounts.map((row) => [row.roleId, row.count]));
  const roles = roleRows.map((role) => toMemberRoleOption(role, roleCountsById.get(role.id) || 0));
  const groups = groupRows.map(toMemberGroupOption);

  return { members, total, totalPages, page, perPage, roles, groups };
}
