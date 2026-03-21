import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../../types/env';
import { bankAccounts } from '../../db/schema';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const bankAccountRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const upsertSchema = z.object({
  account_holder: z.string().min(1, 'Kontoinhaber ist erforderlich'),
  iban: z.string().min(15, 'IBAN ist zu kurz').max(34, 'IBAN ist zu lang'),
  bic: z.string().optional().nullable(),
  bank_name: z.string().optional().nullable(),
  sepa_mandate: z.boolean().optional().default(false),
  sepa_mandate_date: z.string().optional().nullable(),
  sepa_mandate_ref: z.string().optional().nullable(),
});

// ─── GET /v1/members/:memberId/bank-account ─────────────────────────────────
bankAccountRoutes.get('/:memberId/bank-account', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const memberId = c.req.param('memberId');

  const rows = await db.select().from(bankAccounts)
    .where(and(eq(bankAccounts.userId, memberId), eq(bankAccounts.orgId, user.orgId)));

  if (rows.length === 0) {
    return c.json(null);
  }

  const ba = rows[0];
  return c.json({
    id: ba.id,
    userId: ba.userId,
    accountHolder: ba.accountHolder,
    iban: ba.iban,
    bic: ba.bic,
    bankName: ba.bankName,
    sepaMandate: !!ba.sepaMandate,
    sepaMandateDate: ba.sepaMandateDate,
    sepaMandateRef: ba.sepaMandateRef,
    createdAt: ba.createdAt,
    updatedAt: ba.updatedAt,
  });
});

// ─── PUT /v1/members/:memberId/bank-account (upsert) ────────────────────────
bankAccountRoutes.put('/:memberId/bank-account', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const memberId = c.req.param('memberId');
  const body = await c.req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const data = parsed.data;

  const existing = await db.select({ id: bankAccounts.id }).from(bankAccounts)
    .where(and(eq(bankAccounts.userId, memberId), eq(bankAccounts.orgId, user.orgId)));

  if (existing.length > 0) {
    await db.update(bankAccounts).set({
      accountHolder: data.account_holder,
      iban: data.iban,
      bic: data.bic || null,
      bankName: data.bank_name || null,
      sepaMandate: data.sepa_mandate ? 1 : 0,
      sepaMandateDate: data.sepa_mandate_date || null,
      sepaMandateRef: data.sepa_mandate_ref || null,
      updatedAt: new Date().toISOString(),
    }).where(eq(bankAccounts.id, existing[0].id));
    await writeAuditLog(c.env.DB, user.orgId, user.id, 'Kontoverbindung aktualisiert', 'bank_account', existing[0].id);
    return c.json({ id: existing[0].id, updated: true });
  } else {
    const id = crypto.randomUUID();
    await db.insert(bankAccounts).values({
      id,
      orgId: user.orgId,
      userId: memberId,
      accountHolder: data.account_holder,
      iban: data.iban,
      bic: data.bic || null,
      bankName: data.bank_name || null,
      sepaMandate: data.sepa_mandate ? 1 : 0,
      sepaMandateDate: data.sepa_mandate_date || null,
      sepaMandateRef: data.sepa_mandate_ref || null,
    });
    await writeAuditLog(c.env.DB, user.orgId, user.id, 'Kontoverbindung angelegt', 'bank_account', id);
    return c.json({ id, created: true }, 201);
  }
});

// ─── DELETE /v1/members/:memberId/bank-account ──────────────────────────────
bankAccountRoutes.delete('/:memberId/bank-account', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const memberId = c.req.param('memberId');

  await db.delete(bankAccounts)
    .where(and(eq(bankAccounts.userId, memberId), eq(bankAccounts.orgId, user.orgId)));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Kontoverbindung gelöscht', 'bank_account', memberId);
  return c.json({ success: true });
});
