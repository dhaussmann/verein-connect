import { betterAuth } from 'better-auth';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';
import { users, roles, userRoles, organizations } from '../db/schema';
import type { Env } from '../types/env';

export function createAuth(env: Env) {
  return betterAuth({
    database: {
      type: 'd1',
      db: env.DB,
    },
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      password: {
        hash: async (password: string) => hash(password, 12),
        verify: async ({ hash: hashed, password }: { hash: string; password: string }) =>
          compare(password, hashed),
      },
      sendResetPassword: async ({ user, url, token }, request) => {
        // TODO: Send actual email via Resend once RESEND_API_KEY is configured
        console.log(`[Password Reset] user=${user.email} url=${url}`);
      },
    },
    user: {
      modelName: 'users',
      additionalFields: {
        orgId: { type: 'string', required: true, fieldName: 'org_id' },
        firstName: { type: 'string', required: true, fieldName: 'first_name' },
        lastName: { type: 'string', required: true, fieldName: 'last_name' },
        displayName: { type: 'string', required: false, fieldName: 'display_name' },
        avatarUrl: { type: 'string', required: false, fieldName: 'avatar_url' },
        status: { type: 'string', required: false, fieldName: 'status' },
        memberNumber: { type: 'string', required: false, fieldName: 'member_number' },
        emailVerified: { type: 'boolean', required: false, fieldName: 'email_verified' },
      },
    },
    account: {
      modelName: 'auth_accounts',
    },
    session: {
      modelName: 'auth_sessions',
    },
    verification: {
      modelName: 'auth_verifications',
    },
  });
}

export async function getSessionUser(request: Request, env: Env) {
  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  const db = drizzle(env.DB);

  // Get roles & permissions
  const userRoleRows = await db
    .select({ roleName: roles.name, permissions: roles.permissions })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, session.user.id), eq(userRoles.status, 'active')));

  const roleNames = userRoleRows.map((r) => r.roleName);
  const allPermissions = new Set<string>();
  for (const row of userRoleRows) {
    const perms: string[] = JSON.parse(row.permissions || '[]');
    perms.forEach((p) => allPermissions.add(p));
  }

  // Get org
  const orgRows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, (session.user as any).orgId));

  return {
    id: session.user.id,
    orgId: (session.user as any).orgId,
    email: session.user.email,
    firstName: (session.user as any).firstName,
    lastName: (session.user as any).lastName,
    roles: roleNames,
    permissions: Array.from(allPermissions),
    organization: orgRows[0]
      ? { id: orgRows[0].id, name: orgRows[0].name, slug: orgRows[0].slug, plan: orgRows[0].plan }
      : null,
  };
}

export async function requireAuth(request: Request, env: Env) {
  const user = await getSessionUser(request, env);
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return user;
}
