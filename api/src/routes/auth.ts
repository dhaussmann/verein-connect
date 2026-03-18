import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { hash, compare } from 'bcryptjs';
import type { Env } from '../types/bindings';
import { organizations, users, roles, userRoles } from '../db/schema';
import { createAccessToken, createRefreshToken, verifyAccessToken } from '../lib/jwt';
import { generateSlug } from '../lib/slug';
import { AppError, ValidationError, UnauthorizedError, NotFoundError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

const SYSTEM_ROLES = [
  { name: 'org_admin', description: 'Vollzugriff auf alle Bereiche', category: 'system', permissions: ['*'] },
  { name: 'member_admin', description: 'Mitglieder- und Rollenverwaltung', category: 'system', permissions: ['members.*', 'roles.*'] },
  { name: 'event_admin', description: 'Kurs- und Terminverwaltung', category: 'system', permissions: ['events.*', 'courses.*'] },
  { name: 'finance_admin', description: 'Rechnungen und Buchhaltung', category: 'system', permissions: ['invoices.*', 'payments.*', 'accounting.*'] },
  { name: 'trainer', description: 'Anwesenheit erfassen, Kurse einsehen', category: 'system', permissions: ['events.read', 'attendance.write', 'members.read'] },
  { name: 'member', description: 'Basis-Mitgliedsrechte', category: 'system', permissions: ['profile.own', 'events.register', 'events.read', 'courses.read'] },
];

const registerSchema = z.object({
  org_name: z.string().min(2, 'Vereinsname muss mindestens 2 Zeichen lang sein'),
  org_type: z.string().optional(),
  first_name: z.string().min(1, 'Vorname ist erforderlich'),
  last_name: z.string().min(1, 'Nachname ist erforderlich'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
});

const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
  org_slug: z.string().optional(),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  new_password: z.string().min(8),
});

export const authRoutes = new Hono<{ Bindings: Env }>();

// ─── Helper: generate tokens ────────────────────────────────────────────────
async function generateTokenPair(
  env: Env,
  userId: string,
  orgId: string,
  roleNames: string[],
  permissions: string[],
) {
  const accessToken = await createAccessToken(
    { sub: userId, org: orgId, roles: roleNames, permissions },
    env.JWT_PRIVATE_KEY,
    env.JWT_ISSUER,
  );
  const refreshToken = await createRefreshToken();

  await env.KV.put(
    `refresh:${refreshToken}`,
    JSON.stringify({ user_id: userId, org_id: orgId, created_at: new Date().toISOString() }),
    { expirationTtl: 604800 },
  );

  return { access_token: accessToken, refresh_token: refreshToken, expires_in: 900 };
}

// ─── Helper: collect user roles & permissions ────────────────────────────────
async function getUserRolesAndPermissions(db: ReturnType<typeof drizzle>, userId: string) {
  const userRoleRows = await db
    .select({ roleName: roles.name, permissions: roles.permissions })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(userRoles.status, 'active')));

  const roleNames = userRoleRows.map((r) => r.roleName);
  const allPermissions = new Set<string>();
  for (const row of userRoleRows) {
    const perms: string[] = JSON.parse(row.permissions || '[]');
    perms.forEach((p) => allPermissions.add(p));
  }
  return { roleNames, permissions: Array.from(allPermissions) };
}

// ─── POST /auth/register ─────────────────────────────────────────────────────
authRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);
  }

  const { org_name, org_type, first_name, last_name, email, password } = parsed.data;
  const db = drizzle(c.env.DB);

  const slug = generateSlug(org_name);

  // Check if slug already exists
  const existingOrg = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug));
  if (existingOrg.length > 0) {
    throw new AppError(409, 'Ein Verein mit diesem Namen existiert bereits');
  }

  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const passwordHash = await hash(password, 12);
  const memberNumber = `M-${new Date().getFullYear()}-001`;

  // 1. Create organization
  await db.insert(organizations).values({
    id: orgId,
    name: org_name,
    slug,
    settings: JSON.stringify({ type: org_type || 'sport', language: 'de', timezone: 'Europe/Berlin' }),
    plan: 'free',
  });

  // 2. Create user
  await db.insert(users).values({
    id: userId,
    orgId,
    email,
    passwordHash,
    firstName: first_name,
    lastName: last_name,
    displayName: `${first_name} ${last_name}`,
    status: 'active',
    memberNumber,
  });

  // 3. Create system roles for the org
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

  // 4. Assign org_admin + member role to user
  await db.insert(userRoles).values({
    userId,
    roleId: roleIds['org_admin'],
    status: 'active',
  });
  await db.insert(userRoles).values({
    userId,
    roleId: roleIds['member'],
    status: 'active',
  });

  // 5. Generate token pair
  const tokens = await generateTokenPair(c.env, userId, orgId, ['org_admin', 'member'], ['*']);

  await writeAuditLog(c.env.DB, orgId, userId, 'register', 'organization', orgId, `Verein "${org_name}" registriert`);

  return c.json({
    user: {
      id: userId,
      email,
      firstName: first_name,
      lastName: last_name,
      role: 'admin',
      clubName: org_name,
    },
    organization: { id: orgId, name: org_name, slug, plan: 'free' },
    ...tokens,
  }, 201);
});

// ─── POST /auth/login ────────────────────────────────────────────────────────
authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);
  }

  const { email, password, org_slug } = parsed.data;
  const db = drizzle(c.env.DB);

  // Find user
  let query = db
    .select()
    .from(users)
    .where(eq(users.email, email));

  const userRows = await query;

  // If org_slug provided, filter by org
  let user = userRows[0];
  if (org_slug && userRows.length > 1) {
    const org = await db.select().from(organizations).where(eq(organizations.slug, org_slug));
    if (org.length > 0) {
      user = userRows.find((u) => u.orgId === org[0].id) || userRows[0];
    }
  }

  if (!user) {
    throw new UnauthorizedError('Ungültige Anmeldedaten');
  }

  if (!user.passwordHash) {
    throw new UnauthorizedError('Kein Passwort gesetzt. Bitte Passwort zurücksetzen.');
  }

  const passwordValid = await compare(password, user.passwordHash);
  if (!passwordValid) {
    throw new UnauthorizedError('Ungültige Anmeldedaten');
  }

  if (user.status === 'blocked') {
    throw new AppError(403, 'Ihr Konto wurde gesperrt');
  }

  // Update last_login
  await db.update(users).set({ lastLogin: new Date().toISOString() }).where(eq(users.id, user.id));

  // Get org info
  const orgRows = await db.select().from(organizations).where(eq(organizations.id, user.orgId));
  const org = orgRows[0];

  // Get roles & permissions
  const { roleNames, permissions } = await getUserRolesAndPermissions(db, user.id);
  const tokens = await generateTokenPair(c.env, user.id, user.orgId, roleNames, permissions);

  // Determine frontend-friendly role
  const frontendRole = roleNames.includes('org_admin') ? 'admin' : roleNames.includes('trainer') ? 'trainer' : 'member';

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'login', 'user', user.id, 'Login erfolgreich');

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: frontendRole,
      clubName: org?.name || '',
      avatarUrl: user.avatarUrl,
    },
    ...tokens,
  });
});

// ─── POST /auth/refresh ──────────────────────────────────────────────────────
authRoutes.post('/refresh', async (c) => {
  const body = await c.req.json();
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);
  }

  const { refresh_token } = parsed.data;
  const stored = await c.env.KV.get(`refresh:${refresh_token}`);
  if (!stored) {
    throw new UnauthorizedError('Ungültiger oder abgelaufener Refresh-Token');
  }

  // Delete old token (rotation)
  await c.env.KV.delete(`refresh:${refresh_token}`);

  const { user_id, org_id } = JSON.parse(stored);
  const db = drizzle(c.env.DB);
  const { roleNames, permissions } = await getUserRolesAndPermissions(db, user_id);
  const tokens = await generateTokenPair(c.env, user_id, org_id, roleNames, permissions);

  return c.json(tokens);
});

// ─── POST /auth/logout ───────────────────────────────────────────────────────
authRoutes.post('/logout', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (body.refresh_token) {
    await c.env.KV.delete(`refresh:${body.refresh_token}`);
  }
  return c.json({ success: true });
});

// ─── POST /auth/forgot-password ──────────────────────────────────────────────
authRoutes.post('/forgot-password', async (c) => {
  const body = await c.req.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);
  }

  const db = drizzle(c.env.DB);
  const userRows = await db.select().from(users).where(eq(users.email, parsed.data.email));

  if (userRows.length > 0) {
    const resetToken = crypto.randomUUID();
    await c.env.KV.put(
      `reset:${resetToken}`,
      JSON.stringify({ user_id: userRows[0].id, email: parsed.data.email }),
      { expirationTtl: 3600 },
    );

    // Send email via Resend (if API key configured)
    if (c.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'noreply@verein-connect.de',
            to: [parsed.data.email],
            subject: 'Passwort zurücksetzen – Verein Connect',
            html: `<p>Klicke auf folgenden Link, um dein Passwort zurückzusetzen:</p>
                   <p><a href="${c.env.FRONTEND_URL}/reset-password?token=${resetToken}">Passwort zurücksetzen</a></p>
                   <p>Der Link ist 1 Stunde gültig.</p>`,
          }),
        });
      } catch (e) {
        console.error('Failed to send reset email:', e);
      }
    }
  }

  // Always return success (don't leak whether email exists)
  return c.json({ message: 'Falls die E-Mail-Adresse existiert, wurde eine Nachricht zum Zurücksetzen gesendet.' });
});

// ─── POST /auth/reset-password ───────────────────────────────────────────────
authRoutes.post('/reset-password', async (c) => {
  const body = await c.req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);
  }

  const stored = await c.env.KV.get(`reset:${parsed.data.token}`);
  if (!stored) {
    throw new AppError(400, 'Ungültiger oder abgelaufener Reset-Token');
  }

  const { user_id } = JSON.parse(stored);
  const db = drizzle(c.env.DB);
  const passwordHash = await hash(parsed.data.new_password, 12);

  await db.update(users).set({ passwordHash, updatedAt: new Date().toISOString() }).where(eq(users.id, user_id));
  await c.env.KV.delete(`reset:${parsed.data.token}`);

  return c.json({ message: 'Passwort erfolgreich geändert' });
});

// ─── GET /auth/me ────────────────────────────────────────────────────────────
authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError();
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = await verifyAccessToken(token, c.env.JWT_PUBLIC_KEY, c.env.JWT_ISSUER);
  } catch {
    throw new UnauthorizedError('Ungültiger Token');
  }

  const db = drizzle(c.env.DB);
  const userRows = await db.select().from(users).where(eq(users.id, payload.sub));
  if (userRows.length === 0) {
    throw new NotFoundError('Benutzer');
  }

  const user = userRows[0];
  const orgRows = await db.select().from(organizations).where(eq(organizations.id, user.orgId));
  const { roleNames, permissions } = await getUserRolesAndPermissions(db, user.id);

  const frontendRole = roleNames.includes('org_admin') ? 'admin' : roleNames.includes('trainer') ? 'trainer' : 'member';

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: frontendRole,
      clubName: orgRows[0]?.name || '',
      avatarUrl: user.avatarUrl,
      roles: roleNames,
      permissions,
      organization: orgRows[0] ? {
        id: orgRows[0].id,
        name: orgRows[0].name,
        slug: orgRows[0].slug,
        plan: orgRows[0].plan,
      } : null,
    },
  });
});
