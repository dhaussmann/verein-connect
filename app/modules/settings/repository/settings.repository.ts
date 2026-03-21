import { and, asc, count, desc, eq, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  auditLog,
  organizations,
  profileFieldDefinitions,
  profileFieldValues,
  roles,
  userRoles,
  users,
} from "@/core/db/schema";
import type { RouteEnv } from "@/core/runtime/route";

function getDb(env: RouteEnv) {
  return drizzle(env.DB);
}

export function settingsRepository(env: RouteEnv) {
  const db = getDb(env);

  return {
    async findOrganizationById(orgId: string) {
      const rows = await db.select().from(organizations).where(eq(organizations.id, orgId));
      return rows[0] || null;
    },

    async updateOrganization(orgId: string, values: Partial<typeof organizations.$inferInsert>) {
      await db.update(organizations).set(values).where(eq(organizations.id, orgId));
    },

    async listUsersByOrg(orgId: string, search?: string) {
      const conditions = [eq(users.orgId, orgId)];
      if (search) {
        const pattern = `%${search}%`;
        conditions.push(or(
          like(users.firstName, pattern),
          like(users.lastName, pattern),
          like(users.email, pattern),
        )!);
      }

      return db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          status: users.status,
        })
        .from(users)
        .where(and(...conditions))
        .orderBy(asc(users.lastName), asc(users.firstName));
    },

    async listActiveUserRolesByOrg(orgId: string) {
      return db
        .select({
          userId: userRoles.userId,
          roleName: roles.name,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(roles.orgId, orgId), eq(userRoles.status, "active")));
    },

    async findUserByEmail(orgId: string, email: string) {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.orgId, orgId), eq(users.email, email)));
      return rows[0] || null;
    },

    async countUsersByOrg(orgId: string) {
      const rows = await db.select({ count: count() }).from(users).where(eq(users.orgId, orgId));
      return rows[0]?.count || 0;
    },

    async insertUser(values: typeof users.$inferInsert) {
      await db.insert(users).values(values);
    },

    async assignRoleToUser(userId: string, roleId: string) {
      await db.insert(userRoles).values({ userId, roleId, status: "active" });
    },

    async findOrgAdminRole(orgId: string) {
      const rows = await db
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.orgId, orgId), eq(roles.name, "org_admin")));
      return rows[0] || null;
    },

    async findActiveUserRole(userId: string, roleId: string) {
      const rows = await db
        .select({ id: userRoles.id })
        .from(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId), eq(userRoles.status, "active")));
      return rows[0] || null;
    },

    async deleteUserRoleById(id: string) {
      await db.delete(userRoles).where(eq(userRoles.id, id));
    },

    async listRolesByOrg(orgId: string) {
      return db.select().from(roles).where(eq(roles.orgId, orgId)).orderBy(asc(roles.name));
    },

    async countActiveMembersForRole(roleId: string) {
      const rows = await db
        .select({ count: count() })
        .from(userRoles)
        .where(and(eq(userRoles.roleId, roleId), eq(userRoles.status, "active")));
      return rows[0]?.count || 0;
    },

    async countActiveMembersForRoles(roleIds: string[]) {
      if (roleIds.length === 0) return [];
      return db
        .select({
          roleId: userRoles.roleId,
          count: count(),
        })
        .from(userRoles)
        .where(and(inArray(userRoles.roleId, roleIds), eq(userRoles.status, "active")))
        .groupBy(userRoles.roleId);
    },

    async updateRole(orgId: string, roleId: string, values: Partial<typeof roles.$inferInsert>) {
      await db.update(roles).set(values).where(and(eq(roles.id, roleId), eq(roles.orgId, orgId)));
    },

    async insertRole(values: typeof roles.$inferInsert) {
      await db.insert(roles).values(values);
    },

    async findRoleById(orgId: string, roleId: string) {
      const rows = await db
        .select({ id: roles.id, name: roles.name, isSystem: roles.isSystem })
        .from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.orgId, orgId)));
      return rows[0] || null;
    },

    async deleteUserRolesForRole(roleId: string) {
      await db.delete(userRoles).where(eq(userRoles.roleId, roleId));
    },

    async deleteRole(roleId: string) {
      await db.delete(roles).where(eq(roles.id, roleId));
    },

    async listProfileFieldsByOrg(orgId: string) {
      return db
        .select()
        .from(profileFieldDefinitions)
        .where(eq(profileFieldDefinitions.orgId, orgId))
        .orderBy(asc(profileFieldDefinitions.sortOrder), asc(profileFieldDefinitions.fieldLabel));
    },

    async updateProfileField(orgId: string, fieldId: string, values: Partial<typeof profileFieldDefinitions.$inferInsert>) {
      await db
        .update(profileFieldDefinitions)
        .set(values)
        .where(and(eq(profileFieldDefinitions.id, fieldId), eq(profileFieldDefinitions.orgId, orgId)));
    },

    async countProfileFieldsByOrg(orgId: string) {
      const rows = await db
        .select({ count: count() })
        .from(profileFieldDefinitions)
        .where(eq(profileFieldDefinitions.orgId, orgId));
      return rows[0]?.count || 0;
    },

    async insertProfileField(values: typeof profileFieldDefinitions.$inferInsert) {
      await db.insert(profileFieldDefinitions).values(values);
    },

    async deleteProfileFieldValues(fieldId: string) {
      await db.delete(profileFieldValues).where(eq(profileFieldValues.fieldId, fieldId));
    },

    async deleteProfileField(orgId: string, fieldId: string) {
      await db
        .delete(profileFieldDefinitions)
        .where(and(eq(profileFieldDefinitions.id, fieldId), eq(profileFieldDefinitions.orgId, orgId)));
    },

    async listAuditEntriesByOrg(orgId: string, limit: number) {
      return db
        .select()
        .from(auditLog)
        .where(eq(auditLog.orgId, orgId))
        .orderBy(desc(auditLog.createdAt))
        .limit(limit);
    },

    async findUserNameById(userId: string) {
      const rows = await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, userId));
      return rows[0] || null;
    },

    async findUserNamesByIds(userIds: string[]) {
      if (userIds.length === 0) return [];
      return db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(inArray(users.id, userIds));
    },
  };
}
