import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { contractSettings } from '../db/schema';
import { ValidationError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const contractSettingsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const settingsSchema = z.object({
  invoice_publish_mode: z.enum(['DRAFT', 'AUTO_PUBLISH']).optional(),
  default_invoice_group_id: z.string().nullable().optional(),
  days_in_advance: z.number().optional(),
  price_update_trigger: z.enum(['ON_RENEWAL', 'ON_INVOICE']).optional(),
  sepa_required: z.boolean().optional(),
  member_cancellation_allowed: z.boolean().optional(),
  self_registration_enabled: z.boolean().optional(),
  self_registration_access: z.enum(['LINK_AND_FORM', 'LINK_ONLY']).optional(),
  welcome_page_text: z.string().nullable().optional(),
  confirmation_page_text: z.string().nullable().optional(),
});

// ─── GET / — Get settings ───────────────────────────────────────────────────
contractSettingsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(contractSettings).where(eq(contractSettings.orgId, user.orgId));

  if (rows.length === 0) {
    // Return defaults
    return c.json({
      invoicePublishMode: 'DRAFT',
      defaultInvoiceGroupId: null,
      daysInAdvance: 14,
      priceUpdateTrigger: 'ON_RENEWAL',
      sepaRequired: 0,
      memberCancellationAllowed: 1,
      selfRegistrationEnabled: 0,
      selfRegistrationAccess: 'LINK_AND_FORM',
      welcomePageText: null,
      confirmationPageText: null,
    });
  }

  return c.json(rows[0]);
});

// ─── PUT / — Update settings ────────────────────────────────────────────────
contractSettingsRoutes.put('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;
  const existing = await db.select().from(contractSettings).where(eq(contractSettings.orgId, user.orgId));

  const values: Record<string, any> = {};
  if (data.invoice_publish_mode !== undefined) values.invoicePublishMode = data.invoice_publish_mode;
  if (data.default_invoice_group_id !== undefined) values.defaultInvoiceGroupId = data.default_invoice_group_id;
  if (data.days_in_advance !== undefined) values.daysInAdvance = data.days_in_advance;
  if (data.price_update_trigger !== undefined) values.priceUpdateTrigger = data.price_update_trigger;
  if (data.sepa_required !== undefined) values.sepaRequired = data.sepa_required ? 1 : 0;
  if (data.member_cancellation_allowed !== undefined) values.memberCancellationAllowed = data.member_cancellation_allowed ? 1 : 0;
  if (data.self_registration_enabled !== undefined) values.selfRegistrationEnabled = data.self_registration_enabled ? 1 : 0;
  if (data.self_registration_access !== undefined) values.selfRegistrationAccess = data.self_registration_access;
  if (data.welcome_page_text !== undefined) values.welcomePageText = data.welcome_page_text;
  if (data.confirmation_page_text !== undefined) values.confirmationPageText = data.confirmation_page_text;

  if (existing.length === 0) {
    await db.insert(contractSettings).values({ orgId: user.orgId, ...values });
  } else {
    await db.update(contractSettings).set(values).where(eq(contractSettings.orgId, user.orgId));
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Vertragseinstellungen aktualisiert', 'contract_settings');
  return c.json({ success: true });
});
