import { betterAuth } from 'better-auth';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';
import { users, roles, userRoles, organizations } from '../db/schema';
import type { Env } from '../types/env';

export function createAuth(env: Env) {
  const kyselyDb = new Kysely({ dialect: new D1Dialect({ database: env.DB }) });
  return betterAuth({
    baseURL: 'https://verein-connect.cloudflareone-demo-account.workers.dev',
    database: { db: kyselyDb, type: 'sqlite' },
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
      fields: {
        accountId: 'account_id',
        providerId: 'provider_id',
        userId: 'user_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        password: 'password_hash',
      },
    },
    session: {
      modelName: 'auth_sessions',
      fields: {
        userId: 'user_id',
        expiresAt: 'expires_at',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    verification: {
      modelName: 'auth_verifications',
      fields: {
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
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
