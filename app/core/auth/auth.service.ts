import { drizzle } from "drizzle-orm/d1";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { Env } from "../types/bindings";
import { organizations, roles, userRoles, users } from "../db/schema";
import { AppError, UnauthorizedError } from "../lib/errors";
import type { SessionUser } from "@/core/types/auth";

function getFrontendRole(roleNames: string[]) {
  if (roleNames.includes("org_admin")) return "admin";
  if (roleNames.includes("trainer")) return "trainer";
  return "member";
}

export async function getUserRolesAndPermissions(db: ReturnType<typeof drizzle>, userId: string) {
  const userRoleRows = await db
    .select({ roleName: roles.name, permissions: roles.permissions })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(userRoles.status, "active")));

  const roleNames = userRoleRows.map((row) => row.roleName);
  const permissions = new Set<string>();
  for (const row of userRoleRows) {
    const values: string[] = JSON.parse(row.permissions || "[]");
    values.forEach((value) => permissions.add(value));
  }

  return { roleNames, permissions: Array.from(permissions) };
}

export async function getSessionUserById(env: Pick<Env, "DB">, userId: string): Promise<SessionUser | null> {
  const db = drizzle(env.DB);
  const userRows = await db.select().from(users).where(eq(users.id, userId));
  const user = userRows[0];
  if (!user) return null;

  const orgRows = await db.select().from(organizations).where(eq(organizations.id, user.orgId));
  const org = orgRows[0];
  const { roleNames, permissions } = await getUserRolesAndPermissions(db, user.id);

  return {
    id: user.id,
    orgId: user.orgId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: getFrontendRole(roleNames),
    clubName: org?.name || "",
    avatarUrl: user.avatarUrl,
    roles: roleNames,
    permissions,
    organization: org
      ? {
          id: org.id,
          name: org.name,
          slug: org.slug,
        }
      : null,
  };
}

export async function loginWithPassword(
  env: Pick<Env, "DB">,
  input: { email: string; password: string },
): Promise<SessionUser> {
  const db = drizzle(env.DB);
  const userRows = await db.select().from(users).where(eq(users.email, input.email));
  const user = userRows[0];

  if (!user) throw new UnauthorizedError("Ungültige Anmeldedaten");
  if (!user.passwordHash) throw new UnauthorizedError("Kein Passwort gesetzt. Bitte Passwort zurücksetzen.");

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) throw new UnauthorizedError("Ungültige Anmeldedaten");
  if (user.status === "blocked") throw new AppError(403, "Ihr Konto wurde gesperrt");

  await db.update(users).set({ lastLogin: new Date().toISOString() }).where(eq(users.id, user.id));
  const sessionUser = await getSessionUserById(env, user.id);
  if (!sessionUser) throw new UnauthorizedError("Benutzer konnte nicht geladen werden");
  return sessionUser;
}

export async function requestPasswordReset(
  env: Pick<Env, "DB" | "KV" | "FRONTEND_URL"> & Partial<Pick<Env, "RESEND_API_KEY">>,
  email: string,
) {
  const db = drizzle(env.DB);
  const userRows = await db.select().from(users).where(eq(users.email, email));

  if (userRows.length > 0) {
    const resetToken = crypto.randomUUID();
    await env.KV.put(
      `reset:${resetToken}`,
      JSON.stringify({ user_id: userRows[0].id, email }),
      { expirationTtl: 3600 },
    );

    if (env.RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "noreply@verein-connect.de",
            to: [email],
            subject: "Passwort zurücksetzen – Verein Connect",
            html: `<p>Klicke auf folgenden Link, um dein Passwort zurückzusetzen:</p>
                   <p><a href="${env.FRONTEND_URL}/reset-password?token=${resetToken}">Passwort zurücksetzen</a></p>
                   <p>Der Link ist 1 Stunde gültig.</p>`,
          }),
        });
      } catch (error) {
        console.error("Failed to send reset email:", error);
      }
    }
  }
}
