import { drizzle } from "drizzle-orm/d1";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { Env } from "../types/bindings";
import { organizations, roles, userRoles, users } from "../db/schema";
import { generateSlug } from "../lib/slug";
import { AppError, UnauthorizedError } from "../lib/errors";
import type { SessionUser } from "@/core/types/auth";

const SYSTEM_ROLES = [
  { name: "org_admin", description: "Vollzugriff auf alle Bereiche", category: "system", permissions: ["*"] },
  { name: "member_admin", description: "Mitglieder- und Rollenverwaltung", category: "system", permissions: ["members.*", "roles.*"] },
  { name: "event_admin", description: "Kurs- und Terminverwaltung", category: "system", permissions: ["events.*", "courses.*"] },
  { name: "finance_admin", description: "Rechnungen und Buchhaltung", category: "system", permissions: ["invoices.*", "payments.*", "accounting.*"] },
  { name: "trainer", description: "Anwesenheit erfassen, Kurse einsehen", category: "system", permissions: ["events.read", "attendance.write", "members.read"] },
  { name: "member", description: "Basis-Mitgliedsrechte", category: "system", permissions: ["profile.own", "events.register", "events.read", "courses.read"] },
];

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
          plan: org.plan || "free",
        }
      : null,
  };
}

export async function loginWithPassword(
  env: Pick<Env, "DB">,
  input: { email: string; password: string; org_slug?: string },
): Promise<SessionUser> {
  const db = drizzle(env.DB);
  const userRows = await db.select().from(users).where(eq(users.email, input.email));

  let user = userRows[0];
  if (input.org_slug && userRows.length > 1) {
    const orgRows = await db.select().from(organizations).where(eq(organizations.slug, input.org_slug));
    const org = orgRows[0];
    if (org) {
      user = userRows.find((candidate) => candidate.orgId === org.id) || user;
    }
  }

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

export async function registerOrganizationWithAdmin(
  env: Pick<Env, "DB">,
  input: {
    org_name: string;
    org_type?: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  },
): Promise<SessionUser> {
  const db = drizzle(env.DB);
  const slug = generateSlug(input.org_name);

  const existingOrg = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug));
  if (existingOrg.length > 0) throw new AppError(409, "Ein Verein mit diesem Namen existiert bereits");

  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const memberNumber = `M-${new Date().getFullYear()}-001`;

  await db.insert(organizations).values({
    id: orgId,
    name: input.org_name,
    slug,
    settings: JSON.stringify({ type: input.org_type || "sport", language: "de", timezone: "Europe/Berlin" }),
    plan: "free",
  });

  await db.insert(users).values({
    id: userId,
    orgId,
    email: input.email,
    passwordHash,
    firstName: input.first_name,
    lastName: input.last_name,
    displayName: `${input.first_name} ${input.last_name}`,
    status: "active",
    memberNumber,
  });

  const roleIds: Record<string, string> = {};
  for (const roleDef of SYSTEM_ROLES) {
    const roleId = crypto.randomUUID();
    roleIds[roleDef.name] = roleId;
    await db.insert(roles).values({
      id: roleId,
      orgId,
      name: roleDef.name,
      description: roleDef.description,
      category: roleDef.category,
      isSystem: 1,
      permissions: JSON.stringify(roleDef.permissions),
    });
  }

  await db.insert(userRoles).values({
    userId,
    roleId: roleIds.org_admin,
    status: "active",
  });

  await db.insert(userRoles).values({
    userId,
    roleId: roleIds.member,
    status: "active",
  });

  const sessionUser = await getSessionUserById(env, userId);
  if (!sessionUser) throw new AppError(500, "Benutzer konnte nach Registrierung nicht geladen werden");
  return sessionUser;
}

export async function requestPasswordReset(
  env: Pick<Env, "DB" | "KV" | "FRONTEND_URL" | "RESEND_API_KEY">,
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
