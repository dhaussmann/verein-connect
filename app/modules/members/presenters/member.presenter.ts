import type { membersRepository } from "../repository/members.repository";
import type {
  MemberCreateLoaderData,
  MemberGroupOption,
  MemberListItem,
  MemberListStatus,
  MemberProfileFieldOption,
  MemberRoleOption,
} from "../types/member.types";

type MembersRepository = ReturnType<typeof membersRepository>;
type UserRow = Awaited<ReturnType<MembersRepository["listUsersByOrg"]>>[number];
type RoleRow = Awaited<ReturnType<MembersRepository["listRolesByOrg"]>>[number];
type GroupRow = Awaited<ReturnType<MembersRepository["listGroupsByOrg"]>>[number];
type ProfileFieldRow = Awaited<ReturnType<MembersRepository["listProfileFieldsByOrg"]>>[number];

function mapStatus(status: string | null): MemberListStatus {
  const statusMap: Record<string, MemberListStatus> = {
    active: "Aktiv",
    inactive: "Inaktiv",
    pending: "Ausstehend",
    blocked: "Inaktiv",
  };
  return statusMap[status || "active"] || "Aktiv";
}

export function toMemberRoleOption(role: RoleRow, memberCount: number): MemberRoleOption {
  return {
    id: role.id,
    name: role.name,
    category: role.category === "system" ? "System" : "Verein",
    roleType: role.roleType || "staff",
    scope: role.scope || "club",
    isAssignable: role.isAssignable === 1,
    memberCount,
    isSystem: role.isSystem === 1,
    description: role.description || "",
    permissions: JSON.parse(role.permissions || "[]"),
    maxMembers: role.maxMembers || undefined,
    parentRoleId: role.parentRoleId || undefined,
  };
}

export function toMemberGroupOption(group: GroupRow): MemberGroupOption {
  return {
    id: group.id,
    orgId: group.orgId,
    name: group.name,
    description: group.description,
    category: group.category,
    groupType: group.groupType,
    ageBand: group.ageBand,
    genderScope: group.genderScope,
    season: group.season,
    league: group.league,
    location: group.location,
    trainingFocus: group.trainingFocus,
    visibility: group.visibility,
    admissionOpen: group.admissionOpen === 1,
    maxMembers: group.maxMembers,
    maxGoalies: group.maxGoalies,
    createdAt: group.createdAt || "",
  };
}

export function toMemberProfileFieldOption(field: ProfileFieldRow): MemberProfileFieldOption {
  return {
    id: field.id,
    category: field.category,
    name: field.fieldName,
    label: field.fieldLabel,
    type: field.fieldType,
    options: field.options ? JSON.parse(field.options) : [],
    required: field.isRequired === 1,
    onRegistrationForm: field.onRegistrationForm === 1,
  };
}

export async function toMemberListItem(
  repo: MembersRepository,
  row: UserRow,
): Promise<MemberListItem> {
  const [memberRoles, memberGroups, customFieldRows] = await Promise.all([
    repo.listActiveRolesForUser(row.id),
    repo.listGroupsForUser(row.id),
    repo.listCustomFieldsForUser(row.id),
  ]);

  const customFields = customFieldRows.reduce<Record<string, string>>((acc, field) => {
    acc[field.fieldName] = field.value || "";
    return acc;
  }, {});

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
      groupType: group.groupType,
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
    customFields,
  };
}

export async function toMemberFormOptions(
  repo: MembersRepository,
  orgId: string,
): Promise<MemberCreateLoaderData> {
  const [roles, groups, profileFields] = await Promise.all([
    repo.listRolesByOrg(orgId),
    repo.listGroupsByOrg(orgId),
    repo.listProfileFieldsByOrg(orgId),
  ]);

  return {
    roles: roles.filter((role) => role.isAssignable === 1).map((role) => toMemberRoleOption(role, 0)),
    groups: groups.map(toMemberGroupOption),
    profileFields: profileFields.map(toMemberProfileFieldOption),
  };
}
