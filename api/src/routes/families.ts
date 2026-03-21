import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, count } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { families, familyMembers, users, contracts } from '../db/schema';
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const familyRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const familySchema = z.object({
  name: z.string().min(1, 'Familienname ist erforderlich'),
  contract_partner_first_name: z.string().min(1, 'Vorname ist erforderlich'),
  contract_partner_last_name: z.string().min(1, 'Nachname ist erforderlich'),
  contract_partner_email: z.string().email().optional().nullable().or(z.literal('')),
  contract_partner_phone: z.string().optional().nullable(),
  contract_partner_street: z.string().optional().nullable(),
  contract_partner_zip: z.string().optional().nullable(),
  contract_partner_city: z.string().optional().nullable(),
  contract_partner_birth_date: z.string().optional().nullable(),
  contract_partner_member_id: z.string().optional().nullable(),
});

// ─── GET / — List all family profiles ───────────────────────────────────────
familyRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(families).where(eq(families.orgId, user.orgId));

  const enriched = await Promise.all(rows.map(async (f) => {
    const members = await db.select({
      id: familyMembers.id,
      userId: familyMembers.userId,
      firstName: users.firstName,
      lastName: users.lastName,
    }).from(familyMembers)
      .innerJoin(users, eq(familyMembers.userId, users.id))
      .where(eq(familyMembers.familyId, f.id));

    // Check for active family contract
    const activeContracts = await db.select({ id: contracts.id, contractNumber: contracts.contractNumber, status: contracts.status })
      .from(contracts)
      .where(and(eq(contracts.familyId, f.id), eq(contracts.orgId, user.orgId), eq(contracts.status, 'ACTIVE')));

    return {
      id: f.id,
      name: f.name,
      contractPartnerFirstName: f.contractPartnerFirstName,
      contractPartnerLastName: f.contractPartnerLastName,
      contractPartnerEmail: f.contractPartnerEmail,
      contractPartnerPhone: f.contractPartnerPhone,
      contractPartnerStreet: f.contractPartnerStreet,
      contractPartnerZip: f.contractPartnerZip,
      contractPartnerCity: f.contractPartnerCity,
      contractPartnerBirthDate: f.contractPartnerBirthDate,
      contractPartnerMemberId: f.contractPartnerMemberId,
      memberCount: members.length,
      members,
      hasActiveContract: activeContracts.length > 0,
      activeContractNumber: activeContracts[0]?.contractNumber || null,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    };
  }));

  return c.json(enriched);
});

// ─── GET /:id — Family detail ───────────────────────────────────────────────
familyRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(families).where(and(eq(families.id, id), eq(families.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Familienprofil', id);
  const f = rows[0];

  const members = await db.select({
    id: familyMembers.id,
    userId: familyMembers.userId,
    relationship: familyMembers.relationship,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    birthDate: users.birthDate,
  }).from(familyMembers)
    .innerJoin(users, eq(familyMembers.userId, users.id))
    .where(eq(familyMembers.familyId, f.id));

  const familyContracts = await db.select().from(contracts)
    .where(and(eq(contracts.familyId, f.id), eq(contracts.orgId, user.orgId)));

  return c.json({
    id: f.id,
    name: f.name,
    contractPartnerFirstName: f.contractPartnerFirstName,
    contractPartnerLastName: f.contractPartnerLastName,
    contractPartnerEmail: f.contractPartnerEmail,
    contractPartnerPhone: f.contractPartnerPhone,
    contractPartnerStreet: f.contractPartnerStreet,
    contractPartnerZip: f.contractPartnerZip,
    contractPartnerCity: f.contractPartnerCity,
    contractPartnerBirthDate: f.contractPartnerBirthDate,
    contractPartnerMemberId: f.contractPartnerMemberId,
    members,
    contracts: familyContracts.map((ct) => ({
      id: ct.id,
      contractNumber: ct.contractNumber,
      status: ct.status,
      currentPrice: ct.currentPrice,
      billingPeriod: ct.billingPeriod,
      startDate: ct.startDate,
      endDate: ct.endDate,
    })),
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  });
});

// ─── POST / — Create family profile ────────────────────────────────────────
familyRoutes.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const parsed = familySchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;
  const id = crypto.randomUUID();

  await db.insert(families).values({
    id,
    orgId: user.orgId,
    name: data.name,
    contractPartnerFirstName: data.contract_partner_first_name,
    contractPartnerLastName: data.contract_partner_last_name,
    contractPartnerEmail: data.contract_partner_email || null,
    contractPartnerPhone: data.contract_partner_phone || null,
    contractPartnerStreet: data.contract_partner_street || null,
    contractPartnerZip: data.contract_partner_zip || null,
    contractPartnerCity: data.contract_partner_city || null,
    contractPartnerBirthDate: data.contract_partner_birth_date || null,
    contractPartnerMemberId: data.contract_partner_member_id || null,
  });

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Familienprofil "${data.name}" erstellt`, 'family', id);

  return c.json({ id, created: true }, 201);
});

// ─── PUT /:id — Update family profile ──────────────────────────────────────
familyRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = familySchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const existing = await db.select({ id: families.id }).from(families)
    .where(and(eq(families.id, id), eq(families.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Familienprofil', id);

  const data = parsed.data;
  await db.update(families).set({
    name: data.name,
    contractPartnerFirstName: data.contract_partner_first_name,
    contractPartnerLastName: data.contract_partner_last_name,
    contractPartnerEmail: data.contract_partner_email || null,
    contractPartnerPhone: data.contract_partner_phone || null,
    contractPartnerStreet: data.contract_partner_street || null,
    contractPartnerZip: data.contract_partner_zip || null,
    contractPartnerCity: data.contract_partner_city || null,
    contractPartnerBirthDate: data.contract_partner_birth_date || null,
    contractPartnerMemberId: data.contract_partner_member_id || null,
    updatedAt: new Date().toISOString(),
  }).where(eq(families.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id, `Familienprofil "${data.name}" aktualisiert`, 'family', id);

  return c.json({ id, updated: true });
});

// ─── DELETE /:id — Delete family profile ────────────────────────────────────
familyRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.select({ id: families.id }).from(families)
    .where(and(eq(families.id, id), eq(families.orgId, user.orgId)));
  if (existing.length === 0) throw new NotFoundError('Familienprofil', id);

  // Check for active contracts
  const activeContracts = await db.select({ id: contracts.id }).from(contracts)
    .where(and(eq(contracts.familyId, id), eq(contracts.status, 'ACTIVE')));
  if (activeContracts.length > 0) {
    throw new ConflictError('Familienprofil kann nicht gelöscht werden, da noch aktive Verträge existieren.');
  }

  await db.delete(families).where(eq(families.id, id));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Familienprofil gelöscht', 'family', id);

  return c.json({ success: true });
});

// ─── POST /:id/members — Add member to family ──────────────────────────────
familyRoutes.post('/:id/members', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const familyId = c.req.param('id');
  const body = await c.req.json();

  const schema = z.object({
    user_id: z.string().min(1),
    relationship: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  // Verify family exists in org
  const familyRows = await db.select({ id: families.id }).from(families)
    .where(and(eq(families.id, familyId), eq(families.orgId, user.orgId)));
  if (familyRows.length === 0) throw new NotFoundError('Familienprofil', familyId);

  // Check if user is already in another family
  const existingMembership = await db.select({ id: familyMembers.id, familyId: familyMembers.familyId })
    .from(familyMembers).where(eq(familyMembers.userId, parsed.data.user_id));
  if (existingMembership.length > 0) {
    if (existingMembership[0].familyId === familyId) {
      throw new ConflictError('Mitglied ist bereits in dieser Familie.');
    }
    throw new ConflictError('Mitglied ist bereits in einer anderen Familie.');
  }

  const id = crypto.randomUUID();
  await db.insert(familyMembers).values({
    id,
    familyId,
    userId: parsed.data.user_id,
    relationship: parsed.data.relationship || 'member',
  });

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Mitglied zur Familie hinzugefügt', 'family_member', id);

  return c.json({ id, created: true }, 201);
});

// ─── DELETE /:id/members/:userId — Remove member from family ────────────────
familyRoutes.delete('/:id/members/:userId', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const familyId = c.req.param('id');
  const userId = c.req.param('userId');

  await db.delete(familyMembers)
    .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)));

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Mitglied aus Familie entfernt', 'family_member', userId);

  return c.json({ success: true });
});
