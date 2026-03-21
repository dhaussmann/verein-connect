import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { accountingEntries, invoiceItems, invoices, users } from "@/core/db/schema";
import type { RouteEnv } from "@/core/runtime/route";

function getDb(env: RouteEnv) {
  return drizzle(env.DB);
}

export function financeRepository(env: RouteEnv) {
  const db = getDb(env);

  return {
    async listInvoicesByOrg(orgId: string, filters?: { status?: string; search?: string; userIds?: string[] }) {
      const conditions = [eq(invoices.orgId, orgId)];
      if (filters?.status && filters.status !== "all") {
        const reverseStatusMap: Record<string, string> = {
          Entwurf: "draft",
          Gesendet: "sent",
          Bezahlt: "paid",
          Überfällig: "overdue",
          Storniert: "cancelled",
        };
        conditions.push(eq(invoices.status, reverseStatusMap[filters.status] || filters.status));
      }
      if (filters?.search) {
        const searchConditions = [like(invoices.invoiceNumber, `%${filters.search}%`)];
        if (filters.userIds && filters.userIds.length > 0) {
          searchConditions.push(inArray(invoices.userId, filters.userIds));
        }
        conditions.push(or(...searchConditions)!);
      }

      return db.select().from(invoices).where(and(...conditions)).orderBy(desc(invoices.createdAt));
    },
    async findUserName(userId: string) {
      const rows = await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, userId));
      return rows[0] || null;
    },
    async findUsersByIds(userIds: string[]) {
      if (userIds.length === 0) return [];
      return db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(inArray(users.id, userIds));
    },
    async findUsersByOrgAndName(orgId: string, search: string) {
      const pattern = `%${search}%`;
      return db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(and(
          eq(users.orgId, orgId),
          or(
            like(users.firstName, pattern),
            like(users.lastName, pattern),
            like(users.email, pattern),
          )!,
        ));
    },
    async listInvoiceItems(invoiceId: string) {
      return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(asc(invoiceItems.sortOrder));
    },
    async listInvoiceItemsByInvoiceIds(invoiceIds: string[]) {
      if (invoiceIds.length === 0) return [];
      return db
        .select()
        .from(invoiceItems)
        .where(inArray(invoiceItems.invoiceId, invoiceIds))
        .orderBy(asc(invoiceItems.sortOrder));
    },
    async updateInvoice(orgId: string, invoiceId: string, values: Partial<typeof invoices.$inferInsert>) {
      await db.update(invoices).set(values).where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)));
    },
    async findInvoiceById(invoiceId: string) {
      const rows = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
      return rows[0] || null;
    },
    async insertAccountingEntry(values: typeof accountingEntries.$inferInsert) {
      await db.insert(accountingEntries).values(values);
    },
    async clearInvoiceLinkFromAccountingEntries(invoiceId: string) {
      await db.update(accountingEntries).set({ invoiceId: null }).where(eq(accountingEntries.invoiceId, invoiceId));
    },
    async deleteInvoiceItems(invoiceId: string) {
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    },
    async deleteInvoice(orgId: string, invoiceId: string) {
      await db.delete(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)));
    },
    async listAccountingEntriesByOrg(orgId: string) {
      return db.select().from(accountingEntries).where(eq(accountingEntries.orgId, orgId)).orderBy(desc(accountingEntries.entryDate));
    },
  };
}
