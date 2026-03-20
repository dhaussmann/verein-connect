import { and, asc, count, desc, eq, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  groupMembers,
  groups,
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

export function membersRepository(env: RouteEnv) {
  const db = getDb(env);

  return {
    async listUsersByOrg(orgId: string) {
      return db.select().from(users).where(eq(users.orgId, orgId)).orderBy(asc(users.lastName), asc(users.firstName));
    },

    async listUserIdsByRoleName(orgId: string, roleName: string) {
      const rows = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(roles.orgId, orgId), eq(roles.name, roleName), eq(userRoles.status, "active")));
      return rows.map((row) => row.userId);
    },

    async listUserIdsByGroupName(orgId: string, groupName: string) {
      const rows = await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .innerJoin(groups, eq(groupMembers.groupId, groups.id))
        .where(and(eq(groups.orgId, orgId), eq(groups.name, groupName)));
      return rows.map((row) => row.userId);
    },

    async listUsersByOrgPage(input: {
      orgId: string;
      search?: string;
      status?: string;
      userIds?: string[];
      sort?: string;
      dir?: string;
      limit: number;
      offset: number;
    }) {
      const conditions = [eq(users.orgId, input.orgId)];

      if (input.status && input.status !== "Alle") {
        const reverseStatusMap: Record<string, string> = {
          Aktiv: "active",
          Inaktiv: "inactive",
          Ausstehend: "pending",
          blocked: "blocked",
        };
        conditions.push(eq(users.status, reverseStatusMap[input.status] || input.status.toLowerCase()));
      }

      if (input.search) {
        const pattern = `%${input.search}%`;
        conditions.push(or(
          like(users.firstName, pattern),
          like(users.lastName, pattern),
          like(users.email, pattern),
          like(users.memberNumber, pattern),
        )!);
      }

      if (input.userIds) {
        if (input.userIds.length === 0) return [];
        conditions.push(inArray(users.id, input.userIds));
      }

      const baseQuery = db.select().from(users).where(and(...conditions)).limit(input.limit).offset(input.offset);
      const isDesc = input.dir === "desc";
      switch (input.sort) {
        case "email":
          return baseQuery.orderBy(isDesc ? desc(users.email) : asc(users.email));
        case "memberNumber":
          return baseQuery.orderBy(isDesc ? desc(users.memberNumber) : asc(users.memberNumber));
        case "status":
          return baseQuery.orderBy(isDesc ? desc(users.status) : asc(users.status));
        case "joinDate":
          return baseQuery.orderBy(isDesc ? desc(users.joinDate) : asc(users.joinDate));
        default:
          return baseQuery.orderBy(
            isDesc ? desc(users.lastName) : asc(users.lastName),
            isDesc ? desc(users.firstName) : asc(users.firstName),
          );
      }
    },

    async countUsersByOrgFiltered(input: {
      orgId: string;
      search?: string;
      status?: string;
      userIds?: string[];
    }) {
      const conditions = [eq(users.orgId, input.orgId)];

      if (input.status && input.status !== "Alle") {
        const reverseStatusMap: Record<string, string> = {
          Aktiv: "active",
          Inaktiv: "inactive",
          Ausstehend: "pending",
          blocked: "blocked",
        };
        conditions.push(eq(users.status, reverseStatusMap[input.status] || input.status.toLowerCase()));
      }

      if (input.search) {
        const pattern = `%${input.search}%`;
        conditions.push(or(
          like(users.firstName, pattern),
          like(users.lastName, pattern),
          like(users.email, pattern),
          like(users.memberNumber, pattern),
        )!);
      }

      if (input.userIds) {
        if (input.userIds.length === 0) return 0;
        conditions.push(inArray(users.id, input.userIds));
      }

      const rows = await db.select({ count: count() }).from(users).where(and(...conditions));
      return rows[0]?.count || 0;
    },

    async listActiveRolesForUser(userId: string) {
      return db
        .select({ id: roles.id, name: roles.name, category: roles.category })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(userRoles.userId, userId), eq(userRoles.status, "active")));
    },

    async listActiveRolesForUsers(userIds: string[]) {
      if (userIds.length === 0) return [];
      return db
        .select({
          userId: userRoles.userId,
          id: roles.id,
          name: roles.name,
          category: roles.category,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(inArray(userRoles.userId, userIds), eq(userRoles.status, "active")));
    },

    async listGroupsForUser(userId: string) {
      return db
        .select({
          groupId: groups.id,
          groupName: groups.name,
          category: groups.category,
          groupType: groups.groupType,
          memberRole: groupMembers.role,
        })
        .from(groupMembers)
        .innerJoin(groups, eq(groupMembers.groupId, groups.id))
        .where(eq(groupMembers.userId, userId));
    },

    async listGroupsForUsers(userIds: string[]) {
      if (userIds.length === 0) return [];
      return db
        .select({
          userId: groupMembers.userId,
          groupId: groups.id,
          groupName: groups.name,
          category: groups.category,
          groupType: groups.groupType,
          memberRole: groupMembers.role,
        })
        .from(groupMembers)
        .innerJoin(groups, eq(groupMembers.groupId, groups.id))
        .where(inArray(groupMembers.userId, userIds));
    },

    async listCustomFieldsForUser(userId: string) {
      return db
        .select({
          fieldName: profileFieldDefinitions.fieldName,
          value: profileFieldValues.value,
        })
        .from(profileFieldValues)
        .innerJoin(profileFieldDefinitions, eq(profileFieldValues.fieldId, profileFieldDefinitions.id))
        .where(eq(profileFieldValues.userId, userId));
    },

    async listCustomFieldsForUsers(userIds: string[]) {
      if (userIds.length === 0) return [];
      return db
        .select({
          userId: profileFieldValues.userId,
          fieldName: profileFieldDefinitions.fieldName,
          value: profileFieldValues.value,
        })
        .from(profileFieldValues)
        .innerJoin(profileFieldDefinitions, eq(profileFieldValues.fieldId, profileFieldDefinitions.id))
        .where(inArray(profileFieldValues.userId, userIds));
    },

    async listRolesByOrg(orgId: string) {
      return db.select().from(roles).where(eq(roles.orgId, orgId)).orderBy(asc(roles.name));
    },

    async findActiveUserRole(userId: string, roleId: string) {
      const rows = await db
        .select({ id: userRoles.id })
        .from(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId), eq(userRoles.status, "active")));
      return rows[0] || null;
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

    async listGroupsByOrg(orgId: string) {
      return db.select().from(groups).where(eq(groups.orgId, orgId)).orderBy(asc(groups.name));
    },

    async listProfileFieldsByOrg(orgId: string) {
      return db
        .select()
        .from(profileFieldDefinitions)
        .where(eq(profileFieldDefinitions.orgId, orgId))
        .orderBy(asc(profileFieldDefinitions.sortOrder), asc(profileFieldDefinitions.fieldLabel));
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

    async assignRole(userId: string, roleId: string) {
      await db.insert(userRoles).values({ userId, roleId, status: "active" });
    },

    async assignGroup(userId: string, groupId: string, role = "Mitglied") {
      await db.insert(groupMembers).values({ userId, groupId, role });
    },

    async findProfileFieldByName(orgId: string, fieldName: string) {
      const rows = await db
        .select()
        .from(profileFieldDefinitions)
        .where(and(eq(profileFieldDefinitions.orgId, orgId), eq(profileFieldDefinitions.fieldName, fieldName)));
      return rows[0] || null;
    },

    async setProfileFieldValue(userId: string, fieldId: string, value: string) {
      await db.insert(profileFieldValues).values({ userId, fieldId, value });
    },

    async findUserById(orgId: string, userId: string) {
      const rows = await db.select().from(users).where(and(eq(users.id, userId), eq(users.orgId, orgId)));
      return rows[0] || null;
    },

    async deleteUser(userId: string) {
      await db.delete(users).where(eq(users.id, userId));
    },

    async blockUser(userId: string) {
      await db.update(users).set({ status: "blocked", updatedAt: new Date().toISOString() }).where(eq(users.id, userId));
    },
  };
}
