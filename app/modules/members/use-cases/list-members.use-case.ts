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
  const userRows = await repo.listUsersByOrg(orgId);
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
      joinDate: row.createdAt
        ? new Date(row.createdAt).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "",
      avatarInitials: `${row.firstName?.[0] || ""}${row.lastName?.[0] || ""}`.toUpperCase(),
      customFields: customFieldsByUserId.get(row.id) || {},
    };
  });

  let filtered = [...allMembers];
  const query = (filters.search || "").toLowerCase().trim();
  if (query) {
    filtered = filtered.filter((member) =>
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(query)
      || member.email.toLowerCase().includes(query)
      || member.memberNumber.toLowerCase().includes(query),
    );
  }
  if (filters.status && filters.status !== "Alle") {
    filtered = filtered.filter((member) => member.status === filters.status);
  }
  if (filters.role && filters.role !== "Alle") {
    filtered = filtered.filter((member) => member.roles.includes(filters.role));
  }
  if (filters.group && filters.group !== "Alle") {
    filtered = filtered.filter((member) => member.groups.some((group) => group.name === filters.group));
  }

  const sortKey = filters.sort || "name";
  const sortDir = filters.dir === "desc" ? "desc" : "asc";
  filtered.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "email":
        cmp = a.email.localeCompare(b.email);
        break;
      case "memberNumber":
        cmp = a.memberNumber.localeCompare(b.memberNumber);
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "joinDate": {
        const [dA, mA, yA] = a.joinDate.split(".").map(Number);
        const [dB, mB, yB] = b.joinDate.split(".").map(Number);
        cmp = new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
        break;
      }
      default:
        cmp = `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const page = Math.max(1, filters.page || 1);
  const perPage = Math.max(1, filters.perPage || 25);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const members = filtered.slice(start, start + perPage);

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
