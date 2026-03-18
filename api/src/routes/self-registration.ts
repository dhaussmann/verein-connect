import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env } from '../types/bindings';
import { membershipTypes, tarifs, tarifPricing, contractSettings, contractApplications, organizations } from '../db/schema';

export const selfRegistrationRoutes = new Hono<{ Bindings: Env }>();

// ─── GET /options — Public: available membership types & tarifs ──────────────
selfRegistrationRoutes.get('/options', async (c) => {
  const db = drizzle(c.env.DB);
  const orgSlug = c.req.query('org');

  if (!orgSlug) return c.json({ error: 'org Parameter fehlt' }, 400);

  // Find org by slug
  const orgRows = await db.select().from(organizations).where(eq(organizations.slug, orgSlug));
  if (orgRows.length === 0) return c.json({ error: 'Organisation nicht gefunden' }, 404);
  const org = orgRows[0];

  // Check if self-registration is enabled
  const settingsRows = await db.select().from(contractSettings).where(eq(contractSettings.orgId, org.id));
  const settings = settingsRows[0];
  if (!settings || !settings.selfRegistrationEnabled) {
    return c.json({ error: 'Selbstregistrierung ist nicht aktiviert' }, 403);
  }

  // Get active membership types with self_registration_enabled
  const types = await db.select().from(membershipTypes)
    .where(and(
      eq(membershipTypes.orgId, org.id),
      eq(membershipTypes.isActive, 1),
      eq(membershipTypes.selfRegistrationEnabled, 1),
    ));

  const typesWithPricing = await Promise.all(types.map(async (mt) => {
    const pricing = await db.select().from(tarifPricing)
      .where(and(eq(tarifPricing.parentId, mt.id), eq(tarifPricing.parentType, 'MEMBERSHIP_TYPE')));
    return {
      id: mt.id,
      name: mt.name,
      shortDescription: mt.shortDescription,
      description: mt.description,
      activationFee: mt.activationFee,
      pricing: pricing.map(p => ({
        billingPeriod: p.billingPeriod,
        price: p.price,
      })),
    };
  }));

  // Get active tarifs with self_registration_enabled
  const tarifRows = await db.select().from(tarifs)
    .where(and(
      eq(tarifs.orgId, org.id),
      eq(tarifs.isActive, 1),
      eq(tarifs.selfRegistrationEnabled, 1),
    ));

  const tarifsWithPricing = await Promise.all(tarifRows.map(async (t) => {
    const pricing = await db.select().from(tarifPricing)
      .where(and(eq(tarifPricing.parentId, t.id), eq(tarifPricing.parentType, 'TARIF')));
    return {
      id: t.id,
      name: t.name,
      shortDescription: t.shortDescription,
      description: t.description,
      activationFee: t.activationFee,
      allowedMembershipTypeIds: JSON.parse(t.allowedMembershipTypeIds || '[]'),
      pricing: pricing.map(p => ({
        billingPeriod: p.billingPeriod,
        price: p.price,
      })),
    };
  }));

  return c.json({
    organization: { name: org.name, logoUrl: org.logoUrl },
    welcomePageText: settings.welcomePageText,
    confirmationPageText: settings.confirmationPageText,
    membershipTypes: typesWithPricing,
    tarifs: tarifsWithPricing,
  });
});

// ─── POST /apply — Public: submit application ──────────────────────────────
selfRegistrationRoutes.post('/apply', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const schema = z.object({
    org_slug: z.string(),
    membership_type_id: z.string().optional(),
    tarif_id: z.string().optional(),
    billing_period: z.string(),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
    date_of_birth: z.string().optional(),
    additional_data: z.record(z.any()).optional(),
    gdpr_accepted: z.boolean(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Validierungsfehler', details: parsed.error.flatten().fieldErrors }, 400);
  if (!parsed.data.gdpr_accepted) return c.json({ error: 'Datenschutzbestimmungen müssen akzeptiert werden' }, 400);

  const data = parsed.data;

  // Find org
  const orgRows = await db.select().from(organizations).where(eq(organizations.slug, data.org_slug));
  if (orgRows.length === 0) return c.json({ error: 'Organisation nicht gefunden' }, 404);
  const org = orgRows[0];

  const result = await db.insert(contractApplications).values({
    orgId: org.id,
    membershipTypeId: data.membership_type_id || null,
    tarifId: data.tarif_id || null,
    billingPeriod: data.billing_period,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone || null,
    address: data.address || null,
    dateOfBirth: data.date_of_birth || null,
    additionalData: JSON.stringify(data.additional_data || {}),
    status: 'PENDING',
  }).returning();

  return c.json({ success: true, id: result[0].id }, 201);
});
