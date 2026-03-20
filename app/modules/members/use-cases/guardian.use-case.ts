import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { guardians } from "@/core/db/schema";

export async function listGuardiansUseCase(
  env: RouteEnv,
  input: { orgId: string; userId: string },
) {
  const db = drizzle(env.DB);
  return db.select().from(guardians).where(
    and(eq(guardians.orgId, input.orgId), eq(guardians.userId, input.userId)),
  );
}

export async function createGuardianUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    userId: string;
    firstName: string;
    lastName: string;
    street?: string | null;
    zip?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
  },
) {
  const db = drizzle(env.DB);
  const [row] = await db.insert(guardians).values({
    orgId: input.orgId,
    userId: input.userId,
    firstName: input.firstName,
    lastName: input.lastName,
    street: input.street ?? null,
    zip: input.zip ?? null,
    city: input.city ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
  }).returning();
  return row;
}

export async function updateGuardianUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    guardianId: string;
    firstName?: string;
    lastName?: string;
    street?: string | null;
    zip?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
  },
) {
  const db = drizzle(env.DB);
  await db.update(guardians)
    .set({
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.street !== undefined && { street: input.street }),
      ...(input.zip !== undefined && { zip: input.zip }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(guardians.id, input.guardianId), eq(guardians.orgId, input.orgId)));
}

export async function deleteGuardianUseCase(
  env: RouteEnv,
  input: { orgId: string; guardianId: string },
) {
  const db = drizzle(env.DB);
  await db.delete(guardians).where(
    and(eq(guardians.id, input.guardianId), eq(guardians.orgId, input.orgId)),
  );
}
