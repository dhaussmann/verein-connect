import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, count } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import type { Env, AuthUser } from '../../types/env';
import { organizations, users, roles, userRoles, profileFieldDefinitions, auditLog, savedFilters } from '../../db/schema';
import { parsePagination, buildMeta } from '../../lib/pagination';
import { NotFoundError, ForbiddenError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const settingsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Organization settings ──────────────────────────────────────────────────
settingsRoutes.get('/organization', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(organizations).where(eq(organizations.id, user.orgId));
  if (rows.length === 0) throw new NotFoundError('Organisation', user.orgId);
  return c.json(rows[0]);
});

settingsRoutes.put('/organization', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const u: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) u.name = body.name;
  if (body.slug !== undefined) u.slug = body.slug;
  if (body.logo_url !== undefined) u.logoUrl = body.logo_url;
  if (body.settings !== undefined) u.settings = typeof body.settings === 'string' ? body.settings : JSON.stringify(body.settings);

  await db.update(organizations).set(u).where(eq(organizations.id, user.orgId));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Organisation bearbeitet', 'organization', user.orgId);
  return c.json({ success: true });
});

// ─── User management ────────────────────────────────────────────────────────
settingsRoutes.get('/users', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const totalResult = await db.select({ count: count() }).from(users).where(eq(users.orgId, user.orgId));
  const total = totalResult[0]?.count || 0;

  const rows = await db.select({
    id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName,
    status: users.status, lastLogin: users.lastLogin, createdAt: users.createdAt,
  }).from(users).where(eq(users.orgId, user.orgId))
    .orderBy(desc(users.createdAt)).limit(perPage).offset(offset);

  const enriched = await Promise.all(rows.map(async (u) => {
    const userRoleRows = await db
      .select({ roleId: userRoles.roleId, roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(userRoles.userId, u.id), eq(userRoles.status, 'active')));
    return { ...u, roles: userRoleRows };
  }));

  return c.json({ data: enriched, meta: buildMeta(total, page, perPage) });
});

settingsRoutes.put('/users/:id/toggle-admin', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  // Find admin role
  const adminRoles = await db.select().from(roles)
    .where(and(eq(roles.orgId, user.orgId), eq(roles.name, 'admin')));

  if (adminRoles.length === 0) {
    // Create admin role if not exists
    const r = await db.insert(roles).values({
      orgId: user.orgId, name: 'admin', description: 'Administrator',
      isSystem: 1, permissions: '["*"]',
    }).returning();
    adminRoles.push(r[0]);
  }

  const adminRoleId = adminRoles[0].id;
  const existingAssignment = await db.select().from(userRoles)
    .where(and(eq(userRoles.userId, id), eq(userRoles.roleId, adminRoleId)));

  if (existingAssignment.length > 0) {
    await db.delete(userRoles).where(eq(userRoles.id, existingAssignment[0].id));
  } else {
    await db.insert(userRoles).values({ userId: id, roleId: adminRoleId, status: 'active' });
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Admin-Status geändert', 'user', id);
  return c.json({ success: true });
});

settingsRoutes.post('/users/invite', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const tempPassword = `Willkommen${Math.random().toString(36).slice(2, 8)}!`;
  const passwordHash = await hash(tempPassword, 12);

  const newUser = await db.insert(users).values({
    orgId: user.orgId,
    email: body.email,
    passwordHash,
    firstName: body.first_name || 'Neuer',
    lastName: body.last_name || 'Benutzer',
    status: 'active',
  }).returning();

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Benutzer eingeladen', 'user', newUser[0].id);
  return c.json({ id: newUser[0].id, tempPassword }, 201);
});

// ─── Profile field definitions ──────────────────────────────────────────────
settingsRoutes.get('/profile-fields', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(profileFieldDefinitions)
    .where(eq(profileFieldDefinitions.orgId, user.orgId))
    .orderBy(profileFieldDefinitions.sortOrder);
  return c.json(rows);
});

settingsRoutes.post('/profile-fields', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const pf = await db.insert(profileFieldDefinitions).values({
    orgId: user.orgId,
    category: body.category || 'general',
    fieldName: body.field_name,
    fieldLabel: body.field_label,
    fieldType: body.field_type,
    options: body.options ? JSON.stringify(body.options) : null,
    isRequired: body.is_required ? 1 : 0,
    isSearchable: body.is_searchable !== false ? 1 : 0,
    sortOrder: body.sort_order ?? 0,
  }).returning();

  return c.json({ id: pf[0].id }, 201);
});

settingsRoutes.put('/profile-fields/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const u: Record<string, any> = {};
  if (body.field_label !== undefined) u.fieldLabel = body.field_label;
  if (body.field_type !== undefined) u.fieldType = body.field_type;
  if (body.options !== undefined) u.options = JSON.stringify(body.options);
  if (body.is_required !== undefined) u.isRequired = body.is_required ? 1 : 0;
  if (body.sort_order !== undefined) u.sortOrder = body.sort_order;

  await db.update(profileFieldDefinitions).set(u).where(and(eq(profileFieldDefinitions.id, id), eq(profileFieldDefinitions.orgId, user.orgId)));
  return c.json({ success: true });
});

settingsRoutes.delete('/profile-fields/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  await db.delete(profileFieldDefinitions).where(and(eq(profileFieldDefinitions.id, id), eq(profileFieldDefinitions.orgId, user.orgId)));
  return c.json({ success: true });
});

// ─── Audit log ──────────────────────────────────────────────────────────────
settingsRoutes.get('/audit-log', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const totalResult = await db.select({ count: count() }).from(auditLog).where(eq(auditLog.orgId, user.orgId));
  const total = totalResult[0]?.count || 0;

  const rows = await db.select().from(auditLog).where(eq(auditLog.orgId, user.orgId))
    .orderBy(desc(auditLog.createdAt)).limit(perPage).offset(offset);

  return c.json({ data: rows, meta: buildMeta(total, page, perPage) });
});

// ─── Saved filters ──────────────────────────────────────────────────────────
settingsRoutes.get('/saved-filters', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();

  const conditions: any[] = [eq(savedFilters.orgId, user.orgId)];
  if (query.entity_type) conditions.push(eq(savedFilters.entityType, query.entity_type));

  const rows = await db.select().from(savedFilters).where(and(...conditions));
  return c.json(rows);
});

settingsRoutes.post('/saved-filters', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const sf = await db.insert(savedFilters).values({
    orgId: user.orgId,
    createdBy: user.id,
    name: body.name,
    entityType: body.entity_type,
    filterRules: typeof body.filter_rules === 'string' ? body.filter_rules : JSON.stringify(body.filter_rules),
    columns: body.columns ? JSON.stringify(body.columns) : null,
  }).returning();

  return c.json({ id: sf[0].id }, 201);
});

settingsRoutes.delete('/saved-filters/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  await db.delete(savedFilters).where(and(eq(savedFilters.id, id), eq(savedFilters.orgId, user.orgId)));
  return c.json({ success: true });
});
