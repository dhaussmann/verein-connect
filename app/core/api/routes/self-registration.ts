import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env } from '../../types/env';
import { organizations, membershipTypes, tarifs, tarifPricing, contractApplications, contractSettings } from '../../db/schema';
import { NotFoundError, ValidationError } from '../../lib/errors';

// No auth middleware — public routes
export const selfRegistrationRoutes = new Hono<{ Bindings: Env }>();

// ─── GET /:orgSlug/options — Get registration options ───────────────────────
selfRegistrationRoutes.get('/:orgSlug/options', async (c) => {
  const db = drizzle(c.env.DB);
  const slug = c.req.param('orgSlug');

  const orgRows = await db.select().from(organizations).where(eq(organizations.slug, slug));
  if (orgRows.length === 0) throw new NotFoundError('Organisation nicht gefunden');

  const org = orgRows[0];

  // Check if self-registration is enabled
  const settings = await db.select().from(contractSettings).where(eq(contractSettings.orgId, org.id));
  if (settings.length > 0 && !settings[0].selfRegistrationEnabled) {
    return c.json({ enabled: false, membershipTypes: [], tarifs: [] });
  }

  const mts = await db.select().from(membershipTypes)
    .where(and(eq(membershipTypes.orgId, org.id), eq(membershipTypes.isActive, 1), eq(membershipTypes.selfRegistrationEnabled, 1)));

  const ts = await db.select().from(tarifs)
    .where(and(eq(tarifs.orgId, org.id), eq(tarifs.isActive, 1), eq(tarifs.selfRegistrationEnabled, 1)));

  // Enrich with pricing
  const mtsWithPricing = await Promise.all(mts.map(async (mt) => {
    const pricing = await db.select().from(tarifPricing)
      .where(and(eq(tarifPricing.parentId, mt.id), eq(tarifPricing.parentType, 'membership_type')));
    return { ...mt, pricing };
  }));

  const tsWithPricing = await Promise.all(ts.map(async (t) => {
    const pricing = await db.select().from(tarifPricing)
      .where(and(eq(tarifPricing.parentId, t.id), eq(tarifPricing.parentType, 'tarif')));
    return { ...t, pricing };
  }));

  return c.json({
    enabled: true,
    organization: { name: org.name, slug: org.slug, logoUrl: org.logoUrl },
    membershipTypes: mtsWithPricing,
    tarifs: tsWithPricing,
    welcomeText: settings[0]?.welcomePageText || null,
  });
});

// ─── POST /:orgSlug/apply — Submit application ─────────────────────────────
const applySchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
  membership_type_id: z.string().optional(),
  tarif_id: z.string().optional(),
  billing_period: z.string().optional(),
  additional_data: z.record(z.any()).optional(),
});

selfRegistrationRoutes.post('/:orgSlug/apply', async (c) => {
  const db = drizzle(c.env.DB);
  const slug = c.req.param('orgSlug');
  const body = await c.req.json();
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const orgRows = await db.select().from(organizations).where(eq(organizations.slug, slug));
  if (orgRows.length === 0) throw new NotFoundError('Organisation nicht gefunden');

  const org = orgRows[0];
  const data = parsed.data;

  const app = await db.insert(contractApplications).values({
    orgId: org.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone || null,
    address: data.address || null,
    dateOfBirth: data.date_of_birth || null,
    membershipTypeId: data.membership_type_id || null,
    tarifId: data.tarif_id || null,
    billingPeriod: data.billing_period || null,
    additionalData: data.additional_data ? JSON.stringify(data.additional_data) : '{}',
    status: 'PENDING',
  }).returning();

  return c.json({ id: app[0].id, status: 'PENDING' }, 201);
});
