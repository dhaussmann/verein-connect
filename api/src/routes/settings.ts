import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, gte, lte, count } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { organizations, profileFieldDefinitions, auditLog, users, profileFieldValues, families, familyMembers, savedFilters, membershipLevels, userMembershipLevels } from '../db/schema';
import { parsePagination, buildMeta } from '../lib/pagination';
import { NotFoundError, ValidationError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const settingsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── GET /v1/settings/organization ───────────────────────────────────────────
settingsRoutes.get('/organization', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(organizations).where(eq(organizations.id, user.orgId));
  if (rows.length === 0) throw new NotFoundError('Organisation');

  const org = rows[0];
  return c.json({
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logoUrl,
    plan: org.plan,
    settings: JSON.parse(org.settings || '{}'),
  });
});

// ─── PATCH /v1/settings/organization ─────────────────────────────────────────
settingsRoutes.patch('/organization', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.settings !== undefined) updateData.settings = JSON.stringify(body.settings);

  await db.update(organizations).set(updateData).where(eq(organizations.id, user.orgId));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Organisation bearbeitet', 'organization', user.orgId);

  return c.json({ success: true });
});

// ─── POST /v1/settings/organization/logo ─────────────────────────────────────
settingsRoutes.post('/organization/logo', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const formData = await c.req.formData();
  const file = formData.get('logo') as File | null;
  if (!file) return c.json({ error: 'Kein Logo angegeben' }, 400);

  const r2Key = `${user.orgId}/logo/${file.name}`;
  await c.env.FILES.put(r2Key, file.stream(), { httpMetadata: { contentType: file.type } });

  const logoUrl = `/v1/files/logo/${user.orgId}`;
  await db.update(organizations).set({ logoUrl, updatedAt: new Date().toISOString() }).where(eq(organizations.id, user.orgId));

  return c.json({ logoUrl });
});

// ─── Profile Field Definitions ───────────────────────────────────────────────
settingsRoutes.get('/fields', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(profileFieldDefinitions)
    .where(eq(profileFieldDefinitions.orgId, user.orgId))
    .orderBy(profileFieldDefinitions.sortOrder);

  return c.json(rows.map((f) => ({
    id: f.id,
    name: f.fieldName,
    label: f.fieldLabel,
    type: f.fieldType,
    category: f.category || 'Allgemein',
    options: f.options ? JSON.parse(f.options) : [],
    required: f.isRequired === 1,
    searchable: f.isSearchable === 1,
    visibleRegistration: f.isVisibleRegistration === 1,
    onRegistrationForm: f.onRegistrationForm === 1,
    editableByMember: f.editableByMember === 1,
    visibleToMember: f.visibleToMember === 1,
    adminOnly: f.adminOnly === 1,
    sortOrder: f.sortOrder,
    gdprRetentionDays: f.gdprRetentionDays,
  })));
});

settingsRoutes.post('/fields', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const id = crypto.randomUUID();
  await db.insert(profileFieldDefinitions).values({
    id,
    orgId: user.orgId,
    category: body.category,
    fieldName: body.name,
    fieldLabel: body.label,
    fieldType: body.type,
    options: body.options ? JSON.stringify(body.options) : null,
    isRequired: body.required ? 1 : 0,
    isSearchable: body.searchable !== false ? 1 : 0,
    isVisibleRegistration: body.visible_registration ? 1 : 0,
    onRegistrationForm: body.on_registration_form ? 1 : 0,
    editableByMember: body.editable_by_member ? 1 : 0,
    visibleToMember: body.visible_to_member ? 1 : 0,
    adminOnly: body.admin_only ? 1 : 0,
    sortOrder: body.sort_order || 0,
    gdprRetentionDays: body.gdpr_retention_days,
  });

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Profilfeld erstellt', 'profile_field', id, body.label);

  return c.json({ id }, 201);
});

settingsRoutes.patch('/fields/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const fieldId = c.req.param('id');
  const body = await c.req.json();

  const updateData: Record<string, any> = {};
  if (body.label !== undefined) updateData.fieldLabel = body.label;
  if (body.type !== undefined) updateData.fieldType = body.type;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.options !== undefined) updateData.options = JSON.stringify(body.options);
  if (body.required !== undefined) updateData.isRequired = body.required ? 1 : 0;
  if (body.searchable !== undefined) updateData.isSearchable = body.searchable ? 1 : 0;
  if (body.on_registration_form !== undefined) updateData.onRegistrationForm = body.on_registration_form ? 1 : 0;
  if (body.editable_by_member !== undefined) updateData.editableByMember = body.editable_by_member ? 1 : 0;
  if (body.visible_to_member !== undefined) updateData.visibleToMember = body.visible_to_member ? 1 : 0;
  if (body.admin_only !== undefined) updateData.adminOnly = body.admin_only ? 1 : 0;
  if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;

  await db.update(profileFieldDefinitions).set(updateData)
    .where(and(eq(profileFieldDefinitions.id, fieldId), eq(profileFieldDefinitions.orgId, user.orgId)));
  return c.json({ success: true });
});

settingsRoutes.delete('/fields/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const fieldId = c.req.param('id');

  await db.delete(profileFieldValues).where(eq(profileFieldValues.fieldId, fieldId));
  await db.delete(profileFieldDefinitions).where(and(eq(profileFieldDefinitions.id, fieldId), eq(profileFieldDefinitions.orgId, user.orgId)));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Profilfeld gelöscht', 'profile_field', fieldId);

  return c.json({ success: true });
});

settingsRoutes.put('/fields/order', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const { order } = await c.req.json();

  for (let i = 0; i < order.length; i++) {
    await db.update(profileFieldDefinitions).set({ sortOrder: i })
      .where(and(eq(profileFieldDefinitions.id, order[i]), eq(profileFieldDefinitions.orgId, user.orgId)));
  }

  return c.json({ success: true });
});

// ─── Membership Levels ──────────────────────────────────────────────────────
settingsRoutes.get('/membership-levels', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(membershipLevels)
    .where(eq(membershipLevels.orgId, user.orgId))
    .orderBy(membershipLevels.sortOrder);

  // Count members per level
  const enriched = await Promise.all(rows.map(async (level) => {
    const countResult = await db.select({ count: count() }).from(userMembershipLevels)
      .innerJoin(users, eq(userMembershipLevels.userId, users.id))
      .where(and(eq(users.orgId, user.orgId), eq(userMembershipLevels.levelId, level.id)));
    return {
      id: level.id,
      name: level.name,
      description: level.description,
      color: level.color,
      sortOrder: level.sortOrder,
      isDefault: level.isDefault === 1,
      memberCount: countResult[0]?.count || 0,
    };
  }));

  return c.json({ data: enriched });
});

settingsRoutes.post('/membership-levels', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const id = crypto.randomUUID();
  await db.insert(membershipLevels).values({
    id,
    orgId: user.orgId,
    name: body.name,
    description: body.description || null,
    color: body.color || '#3b82f6',
    sortOrder: body.sort_order || 0,
    isDefault: body.is_default ? 1 : 0,
  });

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Mitgliedschaftslevel '${body.name}' erstellt`, 'membership_level', id);
  return c.json({ id }, 201);
});

settingsRoutes.put('/membership-levels/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const levelId = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(membershipLevels)
    .where(and(eq(membershipLevels.id, levelId), eq(membershipLevels.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Mitgliedschaftslevel', levelId);

  const updateData: Record<string, any> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.color !== undefined) updateData.color = body.color;
  if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;
  if (body.is_default !== undefined) updateData.isDefault = body.is_default ? 1 : 0;

  await db.update(membershipLevels).set(updateData).where(eq(membershipLevels.id, levelId));
  await writeAuditLog(c.env.DB, user.orgId, user.id, `Mitgliedschaftslevel bearbeitet`, 'membership_level', levelId);
  return c.json({ success: true });
});

settingsRoutes.delete('/membership-levels/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const levelId = c.req.param('id');

  const existing = await db.select().from(membershipLevels)
    .where(and(eq(membershipLevels.id, levelId), eq(membershipLevels.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Mitgliedschaftslevel', levelId);

  // Remove all user assignments for this level
  await db.delete(userMembershipLevels).where(eq(userMembershipLevels.levelId, levelId));

  await db.delete(membershipLevels).where(eq(membershipLevels.id, levelId));
  await writeAuditLog(c.env.DB, user.orgId, user.id, `Mitgliedschaftslevel '${existing[0].name}' geloescht`, 'membership_level', levelId);
  return c.json({ success: true });
});

settingsRoutes.put('/membership-levels/reorder', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const { order } = await c.req.json();

  for (let i = 0; i < order.length; i++) {
    await db.update(membershipLevels).set({ sortOrder: i })
      .where(and(eq(membershipLevels.id, order[i]), eq(membershipLevels.orgId, user.orgId)));
  }

  return c.json({ success: true });
});

// ─── Families ────────────────────────────────────────────────────────────────
settingsRoutes.get('/families', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(families).where(eq(families.orgId, user.orgId));

  const enriched = await Promise.all(rows.map(async (f) => {
    const members = await db
      .select({ userId: familyMembers.userId, relationship: familyMembers.relationship, firstName: users.firstName, lastName: users.lastName })
      .from(familyMembers)
      .innerJoin(users, eq(familyMembers.userId, users.id))
      .where(eq(familyMembers.familyId, f.id));

    return { id: f.id, name: f.name, discountPercent: f.discountPercent, members };
  }));

  return c.json(enriched);
});

settingsRoutes.post('/families', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const id = crypto.randomUUID();

  await db.insert(families).values({
    id,
    orgId: user.orgId,
    name: body.name,
    primaryContactId: body.primary_contact_id,
    discountPercent: body.discount_percent || 0,
  });

  return c.json({ id }, 201);
});

settingsRoutes.patch('/families/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const familyId = c.req.param('id');
  const body = await c.req.json();

  const updateData: Record<string, any> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.discount_percent !== undefined) updateData.discountPercent = body.discount_percent;

  await db.update(families).set(updateData).where(and(eq(families.id, familyId), eq(families.orgId, user.orgId)));
  return c.json({ success: true });
});

settingsRoutes.delete('/families/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const familyId = c.req.param('id');

  await db.delete(familyMembers).where(eq(familyMembers.familyId, familyId));
  await db.delete(families).where(and(eq(families.id, familyId), eq(families.orgId, user.orgId)));
  return c.json({ success: true });
});

settingsRoutes.post('/families/:id/members', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const familyId = c.req.param('id');
  const { user_id, relationship } = await c.req.json();

  await db.insert(familyMembers).values({ familyId, userId: user_id, relationship: relationship || 'member' });
  return c.json({ success: true }, 201);
});

settingsRoutes.delete('/families/:fid/members/:uid', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = c.req.param('fid');
  const userId = c.req.param('uid');

  await db.delete(familyMembers).where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)));
  return c.json({ success: true });
});

// ─── Saved Filters ───────────────────────────────────────────────────────────
settingsRoutes.get('/filters', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(savedFilters)
    .where(and(eq(savedFilters.orgId, user.orgId), eq(savedFilters.createdBy, user.id)));

  return c.json(rows.map((f) => ({
    id: f.id,
    name: f.name,
    entityType: f.entityType,
    filterRules: JSON.parse(f.filterRules),
    columns: f.columns ? JSON.parse(f.columns) : null,
    isFavorite: f.isFavorite === 1,
    isShared: f.isShared === 1,
  })));
});

settingsRoutes.post('/filters', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const id = crypto.randomUUID();

  await db.insert(savedFilters).values({
    id,
    orgId: user.orgId,
    createdBy: user.id,
    name: body.name,
    entityType: body.entity_type,
    filterRules: JSON.stringify(body.filter_rules),
    columns: body.columns ? JSON.stringify(body.columns) : null,
    isFavorite: body.is_favorite ? 1 : 0,
    isShared: body.is_shared ? 1 : 0,
  });

  return c.json({ id }, 201);
});

settingsRoutes.delete('/filters/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const filterId = c.req.param('id');

  await db.delete(savedFilters).where(and(eq(savedFilters.id, filterId), eq(savedFilters.createdBy, user.id)));
  return c.json({ success: true });
});

// ─── Audit Log ───────────────────────────────────────────────────────────────
settingsRoutes.get('/audit-log', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const conditions: any[] = [eq(auditLog.orgId, user.orgId)];
  if (query.user_id) conditions.push(eq(auditLog.userId, query.user_id));
  if (query.action) conditions.push(eq(auditLog.action, query.action));
  if (query.entity_type) conditions.push(eq(auditLog.entityType, query.entity_type));
  if (query.date_from) conditions.push(gte(auditLog.createdAt, query.date_from));
  if (query.date_to) conditions.push(lte(auditLog.createdAt, query.date_to));

  const whereClause = and(...conditions);

  const totalResult = await db.select({ count: count() }).from(auditLog).where(whereClause);
  const total = totalResult[0]?.count || 0;

  const rows = await db.select().from(auditLog).where(whereClause)
    .orderBy(desc(auditLog.createdAt)).limit(perPage).offset(offset);

  // Enrich with user name
  const enriched = await Promise.all(rows.map(async (entry) => {
    let userName = 'System';
    if (entry.userId) {
      const u = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, entry.userId));
      if (u.length > 0) userName = `${u[0].firstName} ${u[0].lastName}`;
    }

    return {
      id: entry.id,
      user: userName,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details,
      timestamp: entry.createdAt || '',
      ip: entry.ipAddress,
    };
  }));

  return c.json({ data: enriched, meta: buildMeta(total, page, perPage) });
});

// ─── GDPR ────────────────────────────────────────────────────────────────────
settingsRoutes.get('/gdpr/export/:user_id', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const targetUserId = c.req.param('user_id');

  const userData = await db.select().from(users).where(and(eq(users.id, targetUserId), eq(users.orgId, authUser.orgId)));
  if (userData.length === 0) throw new NotFoundError('Benutzer', targetUserId);

  const profileFields = await db.select().from(profileFieldValues).where(eq(profileFieldValues.userId, targetUserId));
  const auditEntries = await db.select().from(auditLog).where(eq(auditLog.userId, targetUserId));

  const exportData = {
    user: userData[0],
    profileFields,
    auditLog: auditEntries,
    exportedAt: new Date().toISOString(),
  };

  return c.json(exportData, 200, {
    'Content-Disposition': `attachment; filename="dsgvo_export_${targetUserId}.json"`,
  });
});

settingsRoutes.post('/gdpr/delete/:user_id', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const targetUserId = c.req.param('user_id');

  const existing = await db.select().from(users).where(and(eq(users.id, targetUserId), eq(users.orgId, authUser.orgId)));
  if (existing.length === 0) throw new NotFoundError('Benutzer', targetUserId);

  // Anonymize
  await db.update(users).set({
    firstName: 'Gelöschter',
    lastName: 'Benutzer',
    email: `deleted_${targetUserId}@anon.local`,
    passwordHash: null,
    phone: null,
    mobile: null,
    birthDate: null,
    street: null,
    zip: null,
    city: null,
    avatarUrl: null,
    status: 'blocked',
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, targetUserId));

  // Delete profile field values
  await db.delete(profileFieldValues).where(eq(profileFieldValues.userId, targetUserId));

  await writeAuditLog(c.env.DB, authUser.orgId, authUser.id, 'DSGVO-Löschung', 'user', targetUserId, 'Personenbezogene Daten anonymisiert');

  return c.json({ success: true });
});
