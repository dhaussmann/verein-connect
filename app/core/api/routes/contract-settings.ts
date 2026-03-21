import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import type { Env, AuthUser } from '../../types/env';
import { contractSettings } from '../../db/schema';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const contractSettingsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

contractSettingsRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(contractSettings).where(eq(contractSettings.orgId, user.orgId));
  if (rows.length === 0) {
    return c.json({
      invoicePublishMode: 'DRAFT',
      daysInAdvance: 14,
      priceUpdateTrigger: 'ON_RENEWAL',
      sepaRequired: false,
      memberCancellationAllowed: true,
      selfRegistrationEnabled: false,
    });
  }
  return c.json(rows[0]);
});

contractSettingsRoutes.put('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const existing = await db.select().from(contractSettings).where(eq(contractSettings.orgId, user.orgId));

  const data: Record<string, any> = {};
  if (body.invoice_publish_mode !== undefined) data.invoicePublishMode = body.invoice_publish_mode;
  if (body.default_invoice_group_id !== undefined) data.defaultInvoiceGroupId = body.default_invoice_group_id;
  if (body.days_in_advance !== undefined) data.daysInAdvance = body.days_in_advance;
  if (body.price_update_trigger !== undefined) data.priceUpdateTrigger = body.price_update_trigger;
  if (body.sepa_required !== undefined) data.sepaRequired = body.sepa_required ? 1 : 0;
  if (body.member_cancellation_allowed !== undefined) data.memberCancellationAllowed = body.member_cancellation_allowed ? 1 : 0;
  if (body.self_registration_enabled !== undefined) data.selfRegistrationEnabled = body.self_registration_enabled ? 1 : 0;
  if (body.self_registration_access !== undefined) data.selfRegistrationAccess = body.self_registration_access;
  if (body.welcome_page_text !== undefined) data.welcomePageText = body.welcome_page_text;
  if (body.confirmation_page_text !== undefined) data.confirmationPageText = body.confirmation_page_text;

  if (existing.length > 0) {
    await db.update(contractSettings).set(data).where(eq(contractSettings.orgId, user.orgId));
  } else {
    await db.insert(contractSettings).values({ orgId: user.orgId, ...data });
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Vertragseinstellungen aktualisiert', 'contract_settings');
  return c.json({ success: true });
});
