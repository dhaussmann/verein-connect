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
  const rows = await repo.listMessagesByOrg(orgId);
  const messages = await Promise.all(rows.map(async (message) => {
    const recipients = await repo.listRecipientsForMessage(message.id);
    return {
      id: message.id,
      subject: message.subject || "",
      channel: message.channel,
      recipients: recipients.length === 0 ? "–" : `${recipients.length} Empfänger`,
      sentDate: message.sentAt || message.createdAt || "",
      status: mapMessageStatus(message.status),
    };
  }));

  return messages.filter((message) => {
    const channelMatches = !filters.channel || filters.channel === "all" || message.channel === filters.channel;
    const statusMatches = !filters.status || filters.status === "all" || message.status === filters.status;
    return channelMatches && statusMatches;
  });
}

export async function createMessageUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; channel: "email" | "push" | "sms" | "homepage"; subject?: string; body: string; recipientLabel?: string; status: "draft" | "scheduled" | "sent"; scheduledAt?: string },
) {
  const repo = communicationRepository(env);
  const messageId = crypto.randomUUID();
  await repo.insertMessage({
    id: messageId,
    orgId: input.orgId,
    senderId: input.actorUserId,
    channel: input.channel,
    subject: input.subject || null,
    body: input.body,
    status: input.status,
    scheduledAt: input.scheduledAt || null,
    sentAt: input.status === "sent" ? new Date().toISOString() : null,
  });
  await repo.insertMessageRecipient({
    messageId,
    recipientType: "all",
    recipientId: null,
    deliveryStatus: input.status === "sent" ? "delivered" : "pending",
    deliveredAt: input.status === "sent" ? new Date().toISOString() : null,
  });
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, input.status === "sent" ? "Nachricht gesendet" : "Nachricht erstellt", "message", messageId, input.subject || input.recipientLabel || "");
  return messageId;
}

export async function duplicateMessageUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; messageId: string }) {
  const repo = communicationRepository(env);
  const original = await repo.findMessageById(input.orgId, input.messageId);
  if (!original) throw new Error("Nachricht nicht gefunden");

  const copyId = crypto.randomUUID();
  await repo.insertMessage({
    id: copyId,
    orgId: input.orgId,
    senderId: input.actorUserId,
    channel: original.channel,
    subject: original.subject ? `${original.subject} (Kopie)` : "Kopie",
    body: original.body,
    status: "draft",
  });
  await repo.insertMessageRecipient({
    messageId: copyId,
    recipientType: "all",
    recipientId: null,
  });
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Nachricht dupliziert", "message", copyId, original.subject || "");
  return copyId;
}

export async function sendMessageUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; messageId: string }) {
  const repo = communicationRepository(env);
  await repo.updateMessage(input.orgId, input.messageId, { status: "sent", sentAt: new Date().toISOString() });
  await repo.updateRecipientsForMessage(input.messageId, { deliveryStatus: "delivered", deliveredAt: new Date().toISOString() });
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Nachricht gesendet", "message", input.messageId);
}

export async function deleteMessageUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; messageId: string }) {
  const repo = communicationRepository(env);
  await repo.deleteRecipientsForMessage(input.messageId);
  await repo.deleteMessage(input.orgId, input.messageId);
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
