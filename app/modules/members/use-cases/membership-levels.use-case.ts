import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { membershipLevels, userMembershipLevels } from "@/core/db/schema";

export async function listMembershipLevelsUseCase(
  env: RouteEnv,
  orgId: string,
) {
  const db = drizzle(env.DB);
  return db.select().from(membershipLevels)
    .where(eq(membershipLevels.orgId, orgId))
    .orderBy(membershipLevels.sortOrder);
}

export async function createMembershipLevelUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    name: string;
    description?: string | null;
    color?: string;
    sortOrder?: number;
    isDefault?: boolean;
  },
) {
  const db = drizzle(env.DB);
  const [row] = await db.insert(membershipLevels).values({
    orgId: input.orgId,
    name: input.name,
    description: input.description ?? null,
    color: input.color ?? '#3b82f6',
    sortOrder: input.sortOrder ?? 0,
    isDefault: input.isDefault ? 1 : 0,
  }).returning();
  return row;
}

export async function updateMembershipLevelUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    levelId: string;
    name?: string;
    description?: string | null;
    color?: string;
    sortOrder?: number;
    isDefault?: boolean;
  },
) {
  const db = drizzle(env.DB);
  await db.update(membershipLevels)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault ? 1 : 0 }),
    })
    .where(and(eq(membershipLevels.id, input.levelId), eq(membershipLevels.orgId, input.orgId)));
}

export async function deleteMembershipLevelUseCase(
  env: RouteEnv,
  input: { orgId: string; levelId: string },
) {
  const db = drizzle(env.DB);
  await db.delete(membershipLevels).where(
    and(eq(membershipLevels.id, input.levelId), eq(membershipLevels.orgId, input.orgId)),
  );
}

export async function assignMembershipLevelUseCase(
  env: RouteEnv,
  input: { userId: string; levelId: string },
) {
  const db = drizzle(env.DB);
  await db.insert(userMembershipLevels)
    .values({ userId: input.userId, levelId: input.levelId })
    .onConflictDoNothing();
}

export async function removeMembershipLevelUseCase(
  env: RouteEnv,
  input: { userId: string; levelId: string },
) {
  const db = drizzle(env.DB);
  await db.delete(userMembershipLevels).where(
    and(eq(userMembershipLevels.userId, input.userId), eq(userMembershipLevels.levelId, input.levelId)),
  );
}

export async function getUserMembershipLevelsUseCase(
  env: RouteEnv,
  userId: string,
) {
  const db = drizzle(env.DB);
  return db.select({ levelId: userMembershipLevels.levelId, assignedAt: userMembershipLevels.assignedAt })
    .from(userMembershipLevels)
    .where(eq(userMembershipLevels.userId, userId));
}
