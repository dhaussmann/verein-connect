import { and, count, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  messageRecipients,
  messages,
  messageTemplates,
} from "@/core/db/schema";
import type { RouteEnv } from "@/core/runtime/route";

function getDb(env: RouteEnv) {
  return drizzle(env.DB);
}

export function communicationRepository(env: RouteEnv) {
  const db = getDb(env);

  return {
    async listMessagesByOrg(orgId: string, filters?: { channel?: string; status?: string }) {
      const conditions = [eq(messages.orgId, orgId)];
      if (filters?.channel && filters.channel !== "all") {
        conditions.push(eq(messages.channel, filters.channel));
      }
      if (filters?.status && filters.status !== "all") {
        const reverseStatusMap: Record<string, string> = {
          Entwurf: "draft",
          Gesendet: "sent",
          Geplant: "scheduled",
          Fehlgeschlagen: "failed",
        };
        conditions.push(eq(messages.status, reverseStatusMap[filters.status] || filters.status));
      }

      return db.select().from(messages).where(and(...conditions)).orderBy(desc(messages.createdAt));
    },
    async listRecipientsForMessage(messageId: string) {
      return db.select().from(messageRecipients).where(eq(messageRecipients.messageId, messageId));
    },
    async countRecipientsForMessages(messageIds: string[]) {
      if (messageIds.length === 0) return [];
      return db
        .select({ messageId: messageRecipients.messageId, count: count() })
        .from(messageRecipients)
        .where(inArray(messageRecipients.messageId, messageIds))
        .groupBy(messageRecipients.messageId);
    },
    async insertMessage(values: typeof messages.$inferInsert) {
      await db.insert(messages).values(values);
    },
    async insertMessageRecipient(values: typeof messageRecipients.$inferInsert) {
      await db.insert(messageRecipients).values(values);
    },
    async findMessageById(orgId: string, messageId: string) {
      const rows = await db.select().from(messages).where(and(eq(messages.id, messageId), eq(messages.orgId, orgId)));
      return rows[0] || null;
    },
    async updateMessage(orgId: string, messageId: string, values: Partial<typeof messages.$inferInsert>) {
      await db.update(messages).set(values).where(and(eq(messages.id, messageId), eq(messages.orgId, orgId)));
    },
    async updateRecipientsForMessage(messageId: string, values: Partial<typeof messageRecipients.$inferInsert>) {
      await db.update(messageRecipients).set(values).where(eq(messageRecipients.messageId, messageId));
    },
    async deleteRecipientsForMessage(messageId: string) {
      await db.delete(messageRecipients).where(eq(messageRecipients.messageId, messageId));
    },
    async deleteMessage(orgId: string, messageId: string) {
      await db.delete(messages).where(and(eq(messages.id, messageId), eq(messages.orgId, orgId)));
    },
    async listTemplatesByOrg(orgId: string) {
      return db.select().from(messageTemplates).where(eq(messageTemplates.orgId, orgId)).orderBy(desc(messageTemplates.createdAt));
    },
    async insertTemplate(values: typeof messageTemplates.$inferInsert) {
      await db.insert(messageTemplates).values(values);
    },
  };
}
