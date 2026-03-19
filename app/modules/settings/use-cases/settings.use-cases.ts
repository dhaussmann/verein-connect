import bcrypt from "bcryptjs";
import { writeAuditLog } from "@/core/lib/audit";
import type { RouteEnv } from "@/core/runtime/route";
import { settingsRepository } from "../repository/settings.repository";
import type {
  OrganizationSettingsData,
  SettingsAuditEntry,
  SettingsProfileField,
  SettingsRole,
  SettingsUser,
} from "../types/settings.types";

function mapUserStatus(status: string | null) {
  const statusMap: Record<string, string> = {
    active: "Aktiv",
    inactive: "Inaktiv",
    pending: "Ausstehend",
    blocked: "Inaktiv",
  };
  return statusMap[status || "active"] || "Aktiv";
}

function mapRoleCategory(category: string | null) {
  return category === "system" ? "System" : category === "team" ? "Sport" : "Verein";
}

function parseRolePermissions(raw: string | null) {
  const parsed = JSON.parse(raw || "[]");
  if (Array.isArray(parsed)) return parsed.map(String);
  if (parsed && typeof parsed === "object") {
    return Object.values(parsed).flatMap((value) => Array.isArray(value) ? value.map(String) : [String(value)]);
  }
  return [];
}

export async function getOrganizationSettingsUseCase(env: RouteEnv, orgId: string): Promise<OrganizationSettingsData | null> {
  const repo = settingsRepository(env);
  const org = await repo.findOrganizationById(orgId);
  if (!org) return null;

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logoUrl ?? null,
    plan: org.plan ?? null,
    settings: JSON.parse(org.settings || "{}"),
  };
}

export async function updateOrganizationSettingsUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; name: string; timezone: string; language: string; website?: string },
) {
  const repo = settingsRepository(env);
  const existing = await getOrganizationSettingsUseCase(env, input.orgId);
  const mergedSettings = {
    ...(existing?.settings || {}),
    timezone: input.timezone,
    language: input.language,
    website: input.website || "",
  };

  await repo.updateOrganization(input.orgId, {
    name: input.name,
    settings: JSON.stringify(mergedSettings),
    updatedAt: new Date().toISOString(),
  });

  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Organisation bearbeitet", "organization", input.orgId);
}

export async function getSettingsUsersUseCase(env: RouteEnv, orgId: string): Promise<SettingsUser[]> {
  const repo = settingsRepository(env);
  const [users, roleRows] = await Promise.all([
    repo.listUsersByOrg(orgId),
    repo.listActiveUserRolesByOrg(orgId),
  ]);

  const rolesByUser = new Map<string, string[]>();
  for (const row of roleRows) {
    rolesByUser.set(row.userId, [...(rolesByUser.get(row.userId) || []), row.roleName]);
  }

  return users.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    status: mapUserStatus(user.status),
    avatarInitials: `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase(),
    roles: rolesByUser.get(user.id) || [],
  }));
}

export async function createSettingsUserUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; firstName: string; lastName: string; email: string; password: string; roleIds: string[] },
) {
  const repo = settingsRepository(env);
  const existing = await repo.findUserByEmail(input.orgId, input.email);
  if (existing) throw new Error("Ein Mitglied mit dieser E-Mail-Adresse existiert bereits");

  const total = await repo.countUsersByOrg(input.orgId);
  const memberNumber = `M-${new Date().getFullYear()}-${String(total + 1).padStart(3, "0")}`;
  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(input.password, 12);

  await repo.insertUser({
    id: userId,
    orgId: input.orgId,
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    displayName: `${input.firstName} ${input.lastName}`,
    status: "active",
    memberNumber,
  });

  for (const roleId of input.roleIds) {
    await repo.assignRoleToUser(userId, roleId);
  }

  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Mitglied erstellt", "user", userId, `${input.firstName} ${input.lastName} (${memberNumber})`);
}

export async function toggleOrgAdminRoleUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; targetUserId: string },
) {
  const repo = settingsRepository(env);
  const adminRole = await repo.findOrgAdminRole(input.orgId);
  if (!adminRole) throw new Error("Admin-Rolle nicht gefunden");

  const existing = await repo.findActiveUserRole(input.targetUserId, adminRole.id);
  if (existing) {
    await repo.deleteUserRoleById(existing.id);
    await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Rolle entfernt", "user_role", existing.id);
    return { isAdmin: false };
  }

  await repo.assignRoleToUser(input.targetUserId, adminRole.id);
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Rolle zugewiesen", "user_role", input.targetUserId);
  return { isAdmin: true };
}

export async function getSettingsRolesUseCase(env: RouteEnv, orgId: string): Promise<SettingsRole[]> {
  const repo = settingsRepository(env);
  const roles = await repo.listRolesByOrg(orgId);

  return Promise.all(
    roles.map(async (role) => ({
      id: role.id,
      name: role.name,
      category: mapRoleCategory(role.category),
      memberCount: await repo.countActiveMembersForRole(role.id),
      isSystem: role.isSystem === 1,
      description: role.description || "",
      permissions: parseRolePermissions(role.permissions),
    })),
  );
}

export async function createOrUpdateRoleUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; roleId?: string; name: string; description?: string; category: "general" | "team" | "department" | "system"; permissions: string[] },
) {
  const repo = settingsRepository(env);
  if (input.roleId) {
    await repo.updateRole(input.orgId, input.roleId, {
      name: input.name,
      description: input.description || null,
      category: input.category,
      permissions: JSON.stringify(input.permissions),
    });
    await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Rolle bearbeitet", "role", input.roleId, input.name);
    return input.roleId;
  }

  const roleId = crypto.randomUUID();
  await repo.insertRole({
    id: roleId,
    orgId: input.orgId,
    name: input.name,
    description: input.description || null,
    category: input.category,
    permissions: JSON.stringify(input.permissions),
  });
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Rolle erstellt", "role", roleId, input.name);
  return roleId;
}

export async function deleteRoleUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; roleId: string }) {
  const repo = settingsRepository(env);
  const role = await repo.findRoleById(input.orgId, input.roleId);
  if (!role) throw new Error("Rolle nicht gefunden");
  if (role.isSystem === 1) throw new Error("System-Rollen können nicht gelöscht werden");

  await repo.deleteUserRolesForRole(input.roleId);
  await repo.deleteRole(input.roleId);
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Rolle gelöscht", "role", input.roleId, role.name);
}

export async function getSettingsProfileFieldsUseCase(env: RouteEnv, orgId: string): Promise<SettingsProfileField[]> {
  const repo = settingsRepository(env);
  const rows = await repo.listProfileFieldsByOrg(orgId);
  return rows.map((field) => ({
    id: field.id,
    name: field.fieldName,
    label: field.fieldLabel,
    type: field.fieldType,
    required: field.isRequired === 1,
    searchable: field.isSearchable === 1,
    visibleRegistration: field.isVisibleRegistration === 1,
    sortOrder: field.sortOrder,
    gdprRetentionDays: field.gdprRetentionDays,
  }));
}

export async function createOrUpdateProfileFieldUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; fieldId?: string; name: string; label: string; type: string; required: boolean; searchable: boolean; visibleRegistration: boolean; gdprRetentionDays: number },
) {
  const repo = settingsRepository(env);
  if (input.fieldId) {
    await repo.updateProfileField(input.orgId, input.fieldId, {
      fieldName: input.name,
      fieldLabel: input.label,
      fieldType: input.type,
      isRequired: input.required ? 1 : 0,
      isSearchable: input.searchable ? 1 : 0,
      isVisibleRegistration: input.visibleRegistration ? 1 : 0,
      gdprRetentionDays: input.gdprRetentionDays,
    });
    await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Profilfeld bearbeitet", "profile_field", input.fieldId, input.label);
    return input.fieldId;
  }

  const fieldId = crypto.randomUUID();
  const count = await repo.countProfileFieldsByOrg(input.orgId);
  await repo.insertProfileField({
    id: fieldId,
    orgId: input.orgId,
    fieldName: input.name,
    fieldLabel: input.label,
    fieldType: input.type,
    isRequired: input.required ? 1 : 0,
    isSearchable: input.searchable ? 1 : 0,
    isVisibleRegistration: input.visibleRegistration ? 1 : 0,
    sortOrder: count,
    gdprRetentionDays: input.gdprRetentionDays,
  });
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Profilfeld erstellt", "profile_field", fieldId, input.label);
  return fieldId;
}

export async function deleteProfileFieldUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; fieldId: string }) {
  const repo = settingsRepository(env);
  await repo.deleteProfileFieldValues(input.fieldId);
  await repo.deleteProfileField(input.orgId, input.fieldId);
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Profilfeld gelöscht", "profile_field", input.fieldId);
}

export async function getSettingsAuditLogUseCase(env: RouteEnv, orgId: string, limit = 50): Promise<SettingsAuditEntry[]> {
  const repo = settingsRepository(env);
  const rows = await repo.listAuditEntriesByOrg(orgId, limit);

  return Promise.all(rows.map(async (entry) => {
    let userName = "System";
    if (entry.userId) {
      const user = await repo.findUserNameById(entry.userId);
      if (user) userName = `${user.firstName} ${user.lastName}`;
    }

    return {
      id: entry.id,
      user: userName,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details,
      timestamp: entry.createdAt || "",
    };
  }));
}
