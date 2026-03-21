import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like, or, desc, count, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import type { Env, AuthUser } from '../../types/env';
import { users, roles, userRoles, profileFieldDefinitions, profileFieldValues, groups, groupMembers, families, familyMembers, membershipLevels, userMembershipLevels } from '../../db/schema';
import { parsePagination, buildMeta } from '../../lib/pagination';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const memberRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Helper: Enrich member with roles, fields, groups, family ───────────────
async function enrichMember(db: ReturnType<typeof drizzle>, member: any) {
  // Roles
  const memberRoles = await db
    .select({ id: roles.id, name: roles.name, category: roles.category })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, member.id), eq(userRoles.status, 'active')));

  // Profile fields
  const fieldValues = await db
    .select({
      fieldId: profileFieldValues.fieldId,
      value: profileFieldValues.value,
      fieldName: profileFieldDefinitions.fieldName,
      fieldLabel: profileFieldDefinitions.fieldLabel,
      fieldType: profileFieldDefinitions.fieldType,
      category: profileFieldDefinitions.category,
    })
    .from(profileFieldValues)
    .innerJoin(profileFieldDefinitions, eq(profileFieldValues.fieldId, profileFieldDefinitions.id))
    .where(eq(profileFieldValues.userId, member.id));

  // Groups
  const memberGroups = await db
    .select({ id: groups.id, name: groups.name })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, member.id));

  // Family
  const familyMembership = await db
    .select({ familyId: familyMembers.familyId, familyName: families.name, relationship: familyMembers.relationship })
    .from(familyMembers)
    .innerJoin(families, eq(familyMembers.familyId, families.id))
    .where(eq(familyMembers.userId, member.id));

  // Membership level
  const levelRows = await db
    .select({ levelId: userMembershipLevels.levelId, levelName: membershipLevels.name, color: membershipLevels.color })
    .from(userMembershipLevels)
    .innerJoin(membershipLevels, eq(userMembershipLevels.levelId, membershipLevels.id))
    .where(eq(userMembershipLevels.userId, member.id));

  return {
    ...member,
    roles: memberRoles,
    profileFields: fieldValues.map((f) => ({
      fieldId: f.fieldId,
      name: f.fieldName,
      label: f.fieldLabel,
      type: f.fieldType,
      category: f.category || 'Allgemein',
      value: f.value,
    })),
    groups: memberGroups,
    family: familyMembership[0] || null,
    membershipLevel: levelRows[0] || null,
  };
}

// ─── GET / — List members ───────────────────────────────────────────────────
memberRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const conditions: any[] = [eq(users.orgId, user.orgId)];
  if (query.search) {
    const s = `%${query.search}%`;
    conditions.push(
      or(like(users.firstName, s), like(users.lastName, s), like(users.email, s), like(users.memberNumber, s))!,
    );
  }
  if (query.status) conditions.push(eq(users.status, query.status));
  if (query.role_id) {
    const usersWithRole = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(and(eq(userRoles.roleId, query.role_id), eq(userRoles.status, 'active')));
    const userIds = usersWithRole.map((r) => r.userId);
    if (userIds.length > 0) {
      conditions.push(inArray(users.id, userIds));
    } else {
      return c.json({ data: [], meta: buildMeta(0, page, perPage) });
    }
  }

  const whereClause = and(...conditions);
  const totalResult = await db.select({ count: count() }).from(users).where(whereClause);
  const total = totalResult[0]?.count || 0;

  const rows = await db
    .select()
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(perPage)
    .offset(offset);

  const enriched = await Promise.all(rows.map((m) => enrichMember(db, m)));

  return c.json({ data: enriched, meta: buildMeta(total, page, perPage) });
});

// ─── GET /:id — Member detail ───────────────────────────────────────────────
memberRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(users).where(and(eq(users.id, id), eq(users.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Mitglied', id);

  const enriched = await enrichMember(db, rows[0]);
  return c.json(enriched);
});

// ─── POST / — Create member ────────────────────────────────────────────────
const createMemberSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  password: z.string().min(6).optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  street: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  join_date: z.string().optional(),
  status: z.string().optional(),
  role_ids: z.array(z.string()).optional(),
  group_ids: z.array(z.string()).optional(),
  profile_fields: z.record(z.string()).optional(),
});

memberRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;

  // Check duplicate email
  const existing = await db.select({ id: users.id }).from(users).where(and(eq(users.email, data.email), eq(users.orgId, user.orgId)));
  if (existing.length > 0) throw new ConflictError('Ein Benutzer mit dieser E-Mail existiert bereits');

  const passwordHash = await hash(data.password || 'Welcome1!', 12);

  // Generate member number
  const countResult = await db.select({ count: count() }).from(users).where(eq(users.orgId, user.orgId));
  const memberNumber = `M-${String((countResult[0]?.count || 0) + 1).padStart(5, '0')}`;

  const newUser = await db.insert(users).values({
    orgId: user.orgId,
    email: data.email,
    passwordHash,
    firstName: data.first_name,
    lastName: data.last_name,
    phone: data.phone || null,
    mobile: data.mobile || null,
    birthDate: data.birth_date || null,
    gender: data.gender || null,
    street: data.street || null,
    zip: data.zip || null,
    city: data.city || null,
    joinDate: data.join_date || new Date().toISOString().slice(0, 10),
    status: data.status || 'active',
    memberNumber,
  }).returning();

  const newId = newUser[0].id;

  // Assign roles
  if (data.role_ids?.length) {
    for (const roleId of data.role_ids) {
      await db.insert(userRoles).values({ userId: newId, roleId, status: 'active' });
    }
  }

  // Assign groups
  if (data.group_ids?.length) {
    for (const groupId of data.group_ids) {
      await db.insert(groupMembers).values({ groupId, userId: newId });
    }
  }

  // Profile fields
  if (data.profile_fields) {
    for (const [fieldId, value] of Object.entries(data.profile_fields)) {
      await db.insert(profileFieldValues).values({ userId: newId, fieldId, value });
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Mitglied angelegt', 'user', newId, `${data.first_name} ${data.last_name}`);

  return c.json({ id: newId, memberNumber }, 201);
});

// ─── PUT /:id — Update member ──────────────────────────────────────────────
memberRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(users).where(and(eq(users.id, id), eq(users.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Mitglied', id);

  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.first_name !== undefined) updateData.firstName = body.first_name;
  if (body.last_name !== undefined) updateData.lastName = body.last_name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.mobile !== undefined) updateData.mobile = body.mobile;
  if (body.birth_date !== undefined) updateData.birthDate = body.birth_date;
  if (body.gender !== undefined) updateData.gender = body.gender;
  if (body.street !== undefined) updateData.street = body.street;
  if (body.zip !== undefined) updateData.zip = body.zip;
  if (body.city !== undefined) updateData.city = body.city;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.join_date !== undefined) updateData.joinDate = body.join_date;

  await db.update(users).set(updateData).where(eq(users.id, id));

  // Update roles
  if (body.role_ids !== undefined) {
    await db.delete(userRoles).where(eq(userRoles.userId, id));
    for (const roleId of body.role_ids) {
      await db.insert(userRoles).values({ userId: id, roleId, status: 'active' });
    }
  }

  // Update groups
  if (body.group_ids !== undefined) {
    await db.delete(groupMembers).where(eq(groupMembers.userId, id));
    for (const groupId of body.group_ids) {
      await db.insert(groupMembers).values({ groupId, userId: id });
    }
  }

  // Update profile fields
  if (body.profile_fields) {
    for (const [fieldId, value] of Object.entries(body.profile_fields)) {
      const existingField = await db.select().from(profileFieldValues).where(and(eq(profileFieldValues.userId, id), eq(profileFieldValues.fieldId, fieldId)));
      if (existingField.length > 0) {
        await db.update(profileFieldValues).set({ value: value as string }).where(and(eq(profileFieldValues.userId, id), eq(profileFieldValues.fieldId, fieldId)));
      } else {
        await db.insert(profileFieldValues).values({ userId: id, fieldId, value: value as string });
      }
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Mitglied bearbeitet', 'user', id);

  return c.json({ success: true });
});

// ─── DELETE /:id — Delete member ────────────────────────────────────────────
memberRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const query = c.req.query();
  const hard = query.hard === 'true';

  if (hard) {
    await db.delete(userRoles).where(eq(userRoles.userId, id));
    await db.delete(groupMembers).where(eq(groupMembers.userId, id));
    await db.delete(profileFieldValues).where(eq(profileFieldValues.userId, id));
    await db.delete(familyMembers).where(eq(familyMembers.userId, id));
    await db.delete(users).where(and(eq(users.id, id), eq(users.orgId, user.orgId)));
    await writeAuditLog(c.env.DB, user.orgId, user.id, 'Mitglied endgültig gelöscht', 'user', id);
  } else {
    await db.update(users).set({ status: 'blocked', updatedAt: new Date().toISOString() }).where(and(eq(users.id, id), eq(users.orgId, user.orgId)));
    await writeAuditLog(c.env.DB, user.orgId, user.id, 'Mitglied deaktiviert', 'user', id);
  }

  return c.json({ success: true });
});

// ─── POST /bulk — Bulk actions ──────────────────────────────────────────────
memberRoutes.post('/bulk', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const { action, user_ids, role_id } = await c.req.json();

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    throw new ValidationError('Keine Benutzer ausgewählt');
  }

  if (action === 'activate') {
    for (const uid of user_ids) {
      await db.update(users).set({ status: 'active' }).where(and(eq(users.id, uid), eq(users.orgId, user.orgId)));
    }
  } else if (action === 'deactivate') {
    for (const uid of user_ids) {
      await db.update(users).set({ status: 'blocked' }).where(and(eq(users.id, uid), eq(users.orgId, user.orgId)));
    }
  } else if (action === 'assign_role' && role_id) {
    for (const uid of user_ids) {
      const existing = await db.select().from(userRoles).where(and(eq(userRoles.userId, uid), eq(userRoles.roleId, role_id)));
      if (existing.length === 0) {
        await db.insert(userRoles).values({ userId: uid, roleId: role_id, status: 'active' });
      }
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Massenaktion: ${action} für ${user_ids.length} Benutzer`, 'user');

  return c.json({ success: true, affected: user_ids.length });
});

// ─── GET /export — CSV export ───────────────────────────────────────────────
memberRoutes.get('/export', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(users).where(eq(users.orgId, user.orgId));

  const headers = ['ID', 'Vorname', 'Nachname', 'E-Mail', 'Status', 'Mitgliedsnummer', 'Beitrittsdatum'];
  const csvRows = rows.map((r) =>
    [r.id, r.firstName, r.lastName, r.email, r.status, r.memberNumber || '', r.joinDate || ''].join(','),
  );
  const csv = [headers.join(','), ...csvRows].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="mitglieder_export.csv"',
    },
  });
});
