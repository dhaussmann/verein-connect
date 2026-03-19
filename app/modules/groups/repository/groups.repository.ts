import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { groupMembers, groups, users } from "@/core/db/schema";
import type { RouteEnv } from "@/core/runtime/route";

function getDb(env: RouteEnv) {
  return drizzle(env.DB);
}

export function groupsRepository(env: RouteEnv) {
  const db = getDb(env);

  return {
    async listGroupsByOrg(orgId: string) {
      return db.select().from(groups).where(eq(groups.orgId, orgId)).orderBy(asc(groups.name));
    },

    async findGroupById(orgId: string, groupId: string) {
      const rows = await db.select().from(groups).where(and(eq(groups.id, groupId), eq(groups.orgId, orgId)));
      return rows[0] || null;
    },

    async createGroup(input: typeof groups.$inferInsert) {
      const result = await db.insert(groups).values(input).returning();
      return result[0];
    },

    async updateGroup(orgId: string, groupId: string, input: Partial<typeof groups.$inferInsert>) {
      await db.update(groups).set(input).where(and(eq(groups.id, groupId), eq(groups.orgId, orgId)));
    },

    async deleteGroup(groupId: string) {
      await db.delete(groups).where(eq(groups.id, groupId));
    },

    async deleteAllGroupMembers(groupId: string) {
      await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId));
    },

    async listGroupMembers(groupId: string) {
      return db
        .select({
          id: groupMembers.id,
          userId: groupMembers.userId,
          role: groupMembers.role,
          joinedAt: groupMembers.joinedAt,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(groupMembers)
        .innerJoin(users, eq(groupMembers.userId, users.id))
        .where(eq(groupMembers.groupId, groupId));
    },

    async listUsersByOrg(orgId: string) {
      return db.select().from(users).where(eq(users.orgId, orgId)).orderBy(asc(users.lastName), asc(users.firstName));
    },

    async listMemberUserIdsForGroup(groupId: string) {
      return db.select({ userId: groupMembers.userId }).from(groupMembers).where(eq(groupMembers.groupId, groupId));
    },

    async addGroupMember(groupId: string, userId: string, role = "Mitglied") {
      await db.insert(groupMembers).values({ groupId, userId, role });
    },

    async removeGroupMember(groupId: string, userId: string) {
      await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    },
  };
}
