import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { RouteEnv } from "@/core/runtime/route";
import { writeAuditLog } from "@/core/lib/audit";
import { bankAccounts } from "@/core/db/schema";

export async function upsertBankAccountUseCase(
  env: RouteEnv,
  input: {
    orgId: string;
    actorUserId: string;
    memberId: string;
    accountHolder: string;
    iban: string;
    bic?: string | null;
    bankName?: string | null;
    sepaMandate?: boolean;
    sepaMandateDate?: string | null;
    sepaMandateRef?: string | null;
  },
) {
  const db = drizzle(env.DB);
  const existing = await db.select({ id: bankAccounts.id }).from(bankAccounts)
    .where(and(eq(bankAccounts.userId, input.memberId), eq(bankAccounts.orgId, input.orgId)));

  if (existing[0]) {
    await db.update(bankAccounts).set({
      accountHolder: input.accountHolder,
      iban: input.iban,
      bic: input.bic || null,
      bankName: input.bankName || null,
      sepaMandate: input.sepaMandate ? 1 : 0,
      sepaMandateDate: input.sepaMandateDate || null,
      sepaMandateRef: input.sepaMandateRef || null,
      updatedAt: new Date().toISOString(),
    }).where(eq(bankAccounts.id, existing[0].id));
    await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Kontoverbindung aktualisiert", "bank_account", existing[0].id);
    return { id: existing[0].id, updated: true };
  }

  const id = crypto.randomUUID();
  await db.insert(bankAccounts).values({
    id,
    orgId: input.orgId,
    userId: input.memberId,
    accountHolder: input.accountHolder,
    iban: input.iban,
    bic: input.bic || null,
    bankName: input.bankName || null,
    sepaMandate: input.sepaMandate ? 1 : 0,
    sepaMandateDate: input.sepaMandateDate || null,
    sepaMandateRef: input.sepaMandateRef || null,
  });
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Kontoverbindung angelegt", "bank_account", id);
  return { id, created: true };
}

export async function deleteBankAccountUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; memberId: string }) {
  const db = drizzle(env.DB);
  await db.delete(bankAccounts).where(and(eq(bankAccounts.userId, input.memberId), eq(bankAccounts.orgId, input.orgId)));
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Kontoverbindung gelöscht", "bank_account", input.memberId);
}
