import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like, or, sql, desc, asc, count } from 'drizzle-orm';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import type { Env, AuthUser } from '../types/bindings';
import { users, roles, userRoles, profileFieldDefinitions, profileFieldValues, families, familyMembers } from '../db/schema';
import { parsePagination, buildMeta } from '../lib/pagination';
import { NotFoundError, ValidationError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const memberRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const createMemberSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  street: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  password: z.string().min(8).optional(),
  role_ids: z.array(z.string()).optional(),
  profile_fields: z.record(z.string(), z.string()).optional(),
});

// ─── Helper: enrich member with roles + profile fields ──────────────────────
async function enrichMember(db: ReturnType<typeof drizzle>, member: any, orgId: string) {
  // Roles
  const memberRoles = await db
    .select({ id: roles.id, name: roles.name, category: roles.category })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, member.id), eq(userRoles.status, 'active')));

  // Profile fields
  const fields = await db
    .select({
      fieldName: profileFieldDefinitions.fieldName,
      fieldLabel: profileFieldDefinitions.fieldLabel,
      value: profileFieldValues.value,
    })
    .from(profileFieldValues)
    .innerJoin(profileFieldDefinitions, eq(profileFieldValues.fieldId, profileFieldDefinitions.id))
    .where(eq(profileFieldValues.userId, member.id));

  const customFields: Record<string, string> = {};
  for (const f of fields) {
    customFields[f.fieldName] = f.value || '';
  }

  // Family
  const familyRow = await db
    .select({
      familyId: familyMembers.familyId,
      relationship: familyMembers.relationship,
      familyName: families.name,
    })
    .from(familyMembers)
    .innerJoin(families, eq(familyMembers.familyId, families.id))
    .where(eq(familyMembers.userId, member.id));

  const initials = `${(member.firstName || '')[0] || ''}${(member.lastName || '')[0] || ''}`.toUpperCase();

  // Map DB status to frontend status
  const statusMap: Record<string, string> = { active: 'Aktiv', inactive: 'Inaktiv', pending: 'Ausstehend', blocked: 'Inaktiv' };

  return {
    id: member.id,
    memberNumber: member.memberNumber || '',
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone || '',
    mobile: member.mobile || '',
    birthDate: member.birthDate || '',
    gender: member.gender || '',
    street: member.street || '',
    zip: member.zip || '',
    city: member.city || '',
    status: statusMap[member.status || 'active'] || 'Aktiv',
    roles: memberRoles.map((r) => r.name),
    groups: memberRoles.filter((r) => r.category === 'team' || r.category === 'department').map((r) => r.name),
    joinDate: member.createdAt ? new Date(member.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
    avatarInitials: initials,
    avatarUrl: member.avatarUrl,
    customFields,
    familyId: familyRow[0]?.familyId || undefined,
    familyRelation: familyRow[0]?.relationship || undefined,
  };
}

// ─── GET /v1/members ─────────────────────────────────────────────────────────
memberRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  // Build where conditions
  const conditions = [eq(users.orgId, user.orgId)];

  if (query.status) {
    const statusMap: Record<string, string> = { 'Aktiv': 'active', 'Inaktiv': 'inactive', 'Ausstehend': 'pending' };
    conditions.push(eq(users.status, statusMap[query.status] || query.status));
  }

  if (query.search) {
    const search = `%${query.search}%`;
    conditions.push(
      or(
        like(users.firstName, search),
        like(users.lastName, search),
        like(users.email, search),
        like(users.memberNumber, search),
      )!
    );
  }

  const whereClause = and(...conditions);

  // Count total
  const totalResult = await db.select({ count: count() }).from(users).where(whereClause);
  const total = totalResult[0]?.count || 0;

  // Sort
  const sortBy = query.sort_by || 'last_name';
  const sortOrder = query.sort_order === 'desc' ? desc : asc;
  const sortColumn = sortBy === 'email' ? users.email
    : sortBy === 'created_at' ? users.createdAt
    : users.lastName;

  // Fetch members
  const memberRows = await db
    .select()
    .from(users)
    .where(whereClause)
    .orderBy(sortOrder(sortColumn))
    .limit(perPage)
    .offset(offset);

  // Filter by role if needed
  let filteredMembers = memberRows;
  if (query.role_id) {
    const usersWithRole = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(and(eq(userRoles.roleId, query.role_id), eq(userRoles.status, 'active')));
    const roleUserIds = new Set(usersWithRole.map((r) => r.userId));
    filteredMembers = memberRows.filter((m) => roleUserIds.has(m.id));
  }

  // Enrich with roles + fields
  const enriched = await Promise.all(filteredMembers.map((m) => enrichMember(db, m, user.orgId)));

  return c.json({
    data: enriched,
    meta: buildMeta(total, page, perPage),
  });
});

// ─── GET /v1/members/:id ─────────────────────────────────────────────────────
memberRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const memberId = c.req.param('id');

  const memberRows = await db.select().from(users).where(and(eq(users.id, memberId), eq(users.orgId, user.orgId)));
  if (memberRows.length === 0) {
    throw new NotFoundError('Mitglied', memberId);
  }

  const enriched = await enrichMember(db, memberRows[0], user.orgId);
  return c.json(enriched);
});

// ─── POST /v1/members ────────────────────────────────────────────────────────
memberRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;
  const db = drizzle(c.env.DB);

  // Generate member number
  const countResult = await db.select({ count: count() }).from(users).where(eq(users.orgId, user.orgId));
  const num = (countResult[0]?.count || 0) + 1;
  const memberNumber = `M-${new Date().getFullYear()}-${String(num).padStart(3, '0')}`;

  const memberId = crypto.randomUUID();
  const passwordHash = data.password ? await hash(data.password, 12) : null;

  await db.insert(users).values({
    id: memberId,
    orgId: user.orgId,
    email: data.email,
    passwordHash,
    firstName: data.first_name,
    lastName: data.last_name,
    displayName: `${data.first_name} ${data.last_name}`,
    phone: data.phone,
    mobile: data.mobile,
    birthDate: data.birth_date,
    gender: data.gender,
    street: data.street,
    zip: data.zip,
    city: data.city,
    status: data.status || 'active',
    memberNumber,
  });

  // Assign roles
  if (data.role_ids?.length) {
    for (const roleId of data.role_ids) {
      await db.insert(userRoles).values({ userId: memberId, roleId, status: 'active' });
    }
  }

  // Save profile fields
  if (data.profile_fields) {
    for (const [fieldName, value] of Object.entries(data.profile_fields)) {
      const fieldDef = await db.select().from(profileFieldDefinitions)
        .where(and(eq(profileFieldDefinitions.orgId, user.orgId), eq(profileFieldDefinitions.fieldName, fieldName)));
      if (fieldDef.length > 0) {
        await db.insert(profileFieldValues).values({ userId: memberId, fieldId: fieldDef[0].id, value });
      }
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Mitglied erstellt', 'user', memberId, `${data.first_name} ${data.last_name} (${memberNumber})`);

  const enriched = await enrichMember(db, { ...data, id: memberId, orgId: user.orgId, memberNumber, status: data.status || 'active', createdAt: new Date().toISOString(), firstName: data.first_name, lastName: data.last_name }, user.orgId);
  return c.json(enriched, 201);
});

// ─── PATCH /v1/members/:id ───────────────────────────────────────────────────
memberRoutes.patch('/:id', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const memberId = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.select().from(users).where(and(eq(users.id, memberId), eq(users.orgId, authUser.orgId)));
  if (existing.length === 0) {
    throw new NotFoundError('Mitglied', memberId);
  }

  // Map frontend field names to DB column names
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

  await db.update(users).set(updateData).where(eq(users.id, memberId));

  // Update profile fields
  if (body.profile_fields) {
    for (const [fieldName, value] of Object.entries(body.profile_fields)) {
      const fieldDef = await db.select().from(profileFieldDefinitions)
        .where(and(eq(profileFieldDefinitions.orgId, authUser.orgId), eq(profileFieldDefinitions.fieldName, fieldName)));
      if (fieldDef.length > 0) {
        // Upsert: try update, if no rows affected, insert
        const existing = await db.select().from(profileFieldValues)
          .where(and(eq(profileFieldValues.userId, memberId), eq(profileFieldValues.fieldId, fieldDef[0].id)));
        if (existing.length > 0) {
          await db.update(profileFieldValues).set({ value: value as string, updatedAt: new Date().toISOString() })
            .where(and(eq(profileFieldValues.userId, memberId), eq(profileFieldValues.fieldId, fieldDef[0].id)));
        } else {
          await db.insert(profileFieldValues).values({ userId: memberId, fieldId: fieldDef[0].id, value: value as string });
        }
      }
    }
  }

  // Update roles
  if (body.role_ids) {
    // Remove existing role assignments
    await db.delete(userRoles).where(eq(userRoles.userId, memberId));
    for (const roleId of body.role_ids) {
      await db.insert(userRoles).values({ userId: memberId, roleId, status: 'active' });
    }
  }

  await writeAuditLog(c.env.DB, authUser.orgId, authUser.id, 'Mitglied bearbeitet', 'user', memberId, JSON.stringify(body));

  const updated = await db.select().from(users).where(eq(users.id, memberId));
  const enriched = await enrichMember(db, updated[0], authUser.orgId);
  return c.json(enriched);
});

// ─── DELETE /v1/members/:id ──────────────────────────────────────────────────
memberRoutes.delete('/:id', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const memberId = c.req.param('id');
  const hard = c.req.query('hard') === 'true';

  const existing = await db.select().from(users).where(and(eq(users.id, memberId), eq(users.orgId, authUser.orgId)));
  if (existing.length === 0) {
    throw new NotFoundError('Mitglied', memberId);
  }

  if (hard) {
    await db.delete(users).where(eq(users.id, memberId));
  } else {
    await db.update(users).set({ status: 'blocked', updatedAt: new Date().toISOString() }).where(eq(users.id, memberId));
  }

  await writeAuditLog(c.env.DB, authUser.orgId, authUser.id, hard ? 'Mitglied gelöscht' : 'Mitglied deaktiviert', 'user', memberId, `${existing[0].firstName} ${existing[0].lastName}`);

  return c.json({ success: true });
});

// ─── POST /v1/members/bulk ───────────────────────────────────────────────────
memberRoutes.post('/bulk', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const { action, member_ids, params } = body;

  let affected = 0;

  if (action === 'status_change' && params?.status) {
    for (const id of member_ids) {
      await db.update(users).set({ status: params.status, updatedAt: new Date().toISOString() })
        .where(and(eq(users.id, id), eq(users.orgId, authUser.orgId)));
      affected++;
    }
  } else if (action === 'role_assign' && params?.role_id) {
    for (const id of member_ids) {
      await db.insert(userRoles).values({ userId: id, roleId: params.role_id, status: 'active' }).onConflictDoNothing();
      affected++;
    }
  }

  await writeAuditLog(c.env.DB, authUser.orgId, authUser.id, `Massenaktion: ${action}`, 'user', '', `${affected} Mitglieder betroffen`);

  return c.json({ success: true, affected });
});

// ─── GET /v1/members/export ──────────────────────────────────────────────────
memberRoutes.get('/export', async (c) => {
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const format = c.req.query('format') || 'csv';

  const memberRows = await db.select().from(users).where(eq(users.orgId, authUser.orgId)).orderBy(asc(users.lastName));

  if (format === 'csv') {
    const header = 'Mitgliedsnummer;Vorname;Nachname;E-Mail;Telefon;Mobil;Geburtsdatum;Geschlecht;Straße;PLZ;Ort;Status\n';
    const rows = memberRows.map((m) =>
      `${m.memberNumber};${m.firstName};${m.lastName};${m.email};${m.phone || ''};${m.mobile || ''};${m.birthDate || ''};${m.gender || ''};${m.street || ''};${m.zip || ''};${m.city || ''};${m.status}`
    ).join('\n');

    return new Response(header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mitglieder_export_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return c.json({ error: 'Format nicht unterstützt' }, 400);
});
