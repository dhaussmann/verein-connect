import { writeAuditLog } from "@/core/lib/audit";
import type { RouteEnv } from "@/core/runtime/route";
import { communicationRepository } from "../repository/communication.repository";

function mapMessageStatus(status: string | null) {
  const statusMap: Record<string, string> = {
    draft: "Entwurf",
    sent: "Gesendet",
    scheduled: "Geplant",
    failed: "Fehlgeschlagen",
  };
  return statusMap[status || "draft"] || status || "Entwurf";
}

export async function getMessagesDataUseCase(
  env: RouteEnv,
  orgId: string,
  filters: { channel?: string; status?: string } = {},
) {
  const repo = communicationRepository(env);
  const rows = await repo.listMessagesByOrg(orgId, filters);
  const recipientCounts = await repo.countRecipientsForMessages(rows.map((message) => message.id));
  const recipientCountsByMessageId = new Map(recipientCounts.map((row) => [row.messageId, row.count]));

  return rows.map((message) => {
    const recipientCount = recipientCountsByMessageId.get(message.id) || 0;
    return {
      id: message.id,
      subject: message.subject || "",
      channel: message.channel,
      recipients: recipientCount === 0 ? "–" : `${recipientCount} Empfänger`,
      sentDate: message.sentAt || message.createdAt || "",
      status: mapMessageStatus(message.status),
    };
  });
}

export async function createMessageUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; channel: "email" | "push" | "sms" | "homepage"; subject?: string; body: string; recipientLabel?: string; status: "draft" | "scheduled" | "sent"; scheduledAt?: string },
) {
  const repo = communicationRepository(env);
  const messageId = crypto.randomUUID();
  const deliveredAt = input.status === "sent" ? new Date().toISOString() : null;
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO messages (
        id, org_id, sender_id, channel, subject, body, status, scheduled_at, sent_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
    `).bind(
      messageId,
      input.orgId,
      input.actorUserId,
      input.channel,
      input.subject || null,
      input.body,
      input.status,
      input.scheduledAt || null,
      deliveredAt,
    ),
    env.DB.prepare(`
      INSERT INTO message_recipients (
        id, message_id, recipient_type, recipient_id, delivery_status, delivered_at
      ) VALUES (?1, ?2, 'all', NULL, ?3, ?4)
    `).bind(crypto.randomUUID(), messageId, input.status === "sent" ? "delivered" : "pending", deliveredAt),
  ]);
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, input.status === "sent" ? "Nachricht gesendet" : "Nachricht erstellt", "message", messageId, input.subject || input.recipientLabel || "");
  return messageId;
}

export async function duplicateMessageUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; messageId: string }) {
  const repo = communicationRepository(env);
  const original = await repo.findMessageById(input.orgId, input.messageId);
  if (!original) throw new Error("Nachricht nicht gefunden");

  const copyId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO messages (
        id, org_id, sender_id, channel, subject, body, status
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'draft')
    `).bind(
      copyId,
      input.orgId,
      input.actorUserId,
      original.channel,
      original.subject ? `${original.subject} (Kopie)` : "Kopie",
      original.body,
    ),
    env.DB.prepare(`
      INSERT INTO message_recipients (
        id, message_id, recipient_type, recipient_id, delivery_status
      ) VALUES (?1, ?2, 'all', NULL, 'pending')
    `).bind(crypto.randomUUID(), copyId),
  ]);
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Nachricht dupliziert", "message", copyId, original.subject || "");
  return copyId;
}

export async function sendMessageUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; messageId: string }) {
  const deliveredAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE messages
      SET status = 'sent', sent_at = ?1
      WHERE id = ?2 AND org_id = ?3
    `).bind(deliveredAt, input.messageId, input.orgId),
    env.DB.prepare(`
      UPDATE message_recipients
      SET delivery_status = 'delivered', delivered_at = ?1
      WHERE message_id = ?2
    `).bind(deliveredAt, input.messageId),
  ]);
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Nachricht gesendet", "message", input.messageId);
}

export async function deleteMessageUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; messageId: string }) {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM message_recipients WHERE message_id = ?1`).bind(input.messageId),
    env.DB.prepare(`DELETE FROM messages WHERE id = ?1 AND org_id = ?2`).bind(input.messageId, input.orgId),
  ]);
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Nachricht gelöscht", "message", input.messageId);
}

export async function getMessageTemplatesDataUseCase(env: RouteEnv, orgId: string) {
  const repo = communicationRepository(env);
  const rows = await repo.listTemplatesByOrg(orgId);
  return rows.map((template) => ({
    id: template.id,
    name: template.name,
    channel: template.channel,
    subject: template.subject || "",
    body: template.body,
  }));
}

export async function createMessageTemplateUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; name: string; channel: string; subject?: string; body: string },
) {
  const repo = communicationRepository(env);
  const id = crypto.randomUUID();
  await repo.insertTemplate({
    id,
    orgId: input.orgId,
    name: input.name,
    channel: input.channel,
    subject: input.subject || null,
    body: input.body,
  });
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Vorlage erstellt", "message_template", id, input.name);
  return id;
}
