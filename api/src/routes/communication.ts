import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { messages, messageRecipients, messageTemplates, users, roles, userRoles, chatConversations, chatParticipants, chatMessages } from '../db/schema';
import { parsePagination, buildMeta } from '../lib/pagination';
import { NotFoundError, ValidationError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const communicationRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const createMessageSchema = z.object({
  channel: z.enum(['email', 'push', 'sms', 'homepage']),
  subject: z.string().optional(),
  body: z.string().min(1),
  recipients: z.array(z.object({
    type: z.enum(['role', 'user', 'all']),
    id: z.string().optional(),
  })),
  scheduled_at: z.string().optional(),
});

// ─── GET /v1/messages ────────────────────────────────────────────────────────
communicationRoutes.get('/messages', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(messages)
    .where(eq(messages.orgId, user.orgId))
    .orderBy(desc(messages.createdAt));

  const result = rows.map((m) => {
    const statusMap: Record<string, string> = { draft: 'Entwurf', sent: 'Gesendet', scheduled: 'Geplant', failed: 'Fehlgeschlagen' };
    return {
      id: m.id,
      subject: m.subject || '',
      channel: m.channel,
      recipients: '',
      sentDate: m.sentAt || m.createdAt || '',
      status: statusMap[m.status || 'draft'] || m.status,
    };
  });

  return c.json(result);
});

// ─── POST /v1/messages ───────────────────────────────────────────────────────
communicationRoutes.post('/messages', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const db = drizzle(c.env.DB);
  const data = parsed.data;
  const msgId = crypto.randomUUID();

  await db.insert(messages).values({
    id: msgId,
    orgId: user.orgId,
    senderId: user.id,
    channel: data.channel,
    subject: data.subject,
    body: data.body,
    status: data.scheduled_at ? 'scheduled' : 'draft',
    scheduledAt: data.scheduled_at,
  });

  // Add recipients
  for (const recipient of data.recipients) {
    await db.insert(messageRecipients).values({
      messageId: msgId,
      recipientType: recipient.type,
      recipientId: recipient.id,
    });
  }

  return c.json({ id: msgId }, 201);
});

// ─── GET /v1/messages/:id ────────────────────────────────────────────────────
communicationRoutes.get('/messages/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const msgId = c.req.param('id');

  const rows = await db.select().from(messages).where(and(eq(messages.id, msgId), eq(messages.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Nachricht', msgId);

  const recipients = await db.select().from(messageRecipients).where(eq(messageRecipients.messageId, msgId));

  return c.json({ ...rows[0], recipients });
});

// ─── PATCH /v1/messages/:id ──────────────────────────────────────────────────
communicationRoutes.patch('/messages/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const msgId = c.req.param('id');
  const body = await c.req.json();

  const updateData: Record<string, any> = {};
  if (body.subject !== undefined) updateData.subject = body.subject;
  if (body.body !== undefined) updateData.body = body.body;
  if (body.channel !== undefined) updateData.channel = body.channel;

  await db.update(messages).set(updateData).where(and(eq(messages.id, msgId), eq(messages.orgId, user.orgId)));
  return c.json({ success: true });
});

// ─── DELETE /v1/messages/:id ─────────────────────────────────────────────────
communicationRoutes.delete('/messages/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const msgId = c.req.param('id');

  await db.delete(messageRecipients).where(eq(messageRecipients.messageId, msgId));
  await db.delete(messages).where(and(eq(messages.id, msgId), eq(messages.orgId, user.orgId)));
  return c.json({ success: true });
});

// ─── POST /v1/messages/:id/send ──────────────────────────────────────────────
communicationRoutes.post('/messages/:id/send', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const msgId = c.req.param('id');

  const msgRows = await db.select().from(messages).where(and(eq(messages.id, msgId), eq(messages.orgId, user.orgId)));
  if (msgRows.length === 0) throw new NotFoundError('Nachricht', msgId);
  const msg = msgRows[0];

  // Resolve recipients
  const recipientRows = await db.select().from(messageRecipients).where(eq(messageRecipients.messageId, msgId));
  const emailAddresses: string[] = [];

  for (const r of recipientRows) {
    if (r.recipientType === 'all') {
      const allUsers = await db.select({ email: users.email }).from(users)
        .where(and(eq(users.orgId, user.orgId), eq(users.status, 'active')));
      emailAddresses.push(...allUsers.map((u) => u.email));
    } else if (r.recipientType === 'role' && r.recipientId) {
      const roleUsers = await db
        .select({ email: users.email })
        .from(userRoles)
        .innerJoin(users, eq(userRoles.userId, users.id))
        .where(and(eq(userRoles.roleId, r.recipientId), eq(userRoles.status, 'active')));
      emailAddresses.push(...roleUsers.map((u) => u.email));
    } else if (r.recipientType === 'user' && r.recipientId) {
      const u = await db.select({ email: users.email }).from(users).where(eq(users.id, r.recipientId));
      if (u.length > 0) emailAddresses.push(u[0].email);
    }
  }

  // Send via Resend if email channel
  if (msg.channel === 'email' && c.env.RESEND_API_KEY && emailAddresses.length > 0) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'noreply@verein-connect.de',
          to: emailAddresses,
          subject: msg.subject || 'Nachricht vom Verein',
          html: msg.body,
        }),
      });
    } catch (e) {
      console.error('Email send failed:', e);
    }
  }

  // Update message status
  await db.update(messages).set({ status: 'sent', sentAt: new Date().toISOString() }).where(eq(messages.id, msgId));

  // Update recipient delivery status
  for (const r of recipientRows) {
    await db.update(messageRecipients).set({ deliveryStatus: 'delivered', deliveredAt: new Date().toISOString() })
      .where(eq(messageRecipients.id, r.id));
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Nachricht gesendet', 'message', msgId, msg.subject || '');

  return c.json({ success: true, recipients_count: emailAddresses.length });
});

// ─── Templates ───────────────────────────────────────────────────────────────
communicationRoutes.get('/messages/templates', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(messageTemplates).where(eq(messageTemplates.orgId, user.orgId));
  return c.json(rows.map((t) => ({
    id: t.id, name: t.name, channel: t.channel, subject: t.subject || '', body: t.body,
  })));
});

communicationRoutes.post('/messages/templates', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const id = crypto.randomUUID();

  await db.insert(messageTemplates).values({
    id, orgId: user.orgId, name: body.name, channel: body.channel, subject: body.subject, body: body.body, signature: body.signature,
  });

  return c.json({ id }, 201);
});

communicationRoutes.patch('/messages/templates/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const updateData: Record<string, any> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.subject !== undefined) updateData.subject = body.subject;
  if (body.body !== undefined) updateData.body = body.body;
  if (body.channel !== undefined) updateData.channel = body.channel;

  await db.update(messageTemplates).set(updateData).where(and(eq(messageTemplates.id, id), eq(messageTemplates.orgId, user.orgId)));
  return c.json({ success: true });
});

communicationRoutes.delete('/messages/templates/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  await db.delete(messageTemplates).where(and(eq(messageTemplates.id, id), eq(messageTemplates.orgId, user.orgId)));
  return c.json({ success: true });
});

// ─── Chat Conversations ─────────────────────────────────────────────────────
communicationRoutes.get('/chat/conversations', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const convos = await db
    .select({
      id: chatConversations.id,
      name: chatConversations.name,
      isGroup: chatConversations.isGroup,
    })
    .from(chatParticipants)
    .innerJoin(chatConversations, eq(chatParticipants.conversationId, chatConversations.id))
    .where(eq(chatParticipants.userId, user.id));

  const result = await Promise.all(convos.map(async (conv) => {
    const lastMsg = await db.select().from(chatMessages)
      .where(eq(chatMessages.conversationId, conv.id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);

    const unreadCount = await db.select({ count: count() }).from(chatMessages)
      .where(eq(chatMessages.conversationId, conv.id));

    const initials = (conv.name || '??').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

    return {
      id: conv.id,
      name: conv.name || '',
      initials,
      isGroup: conv.isGroup === 1,
      lastMessage: lastMsg[0]?.content || '',
      lastTime: lastMsg[0]?.createdAt || '',
      unread: 0,
      messages: [],
    };
  }));

  return c.json(result);
});

communicationRoutes.get('/chat/conversations/:id/messages', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const convId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '50');

  const msgs = await db
    .select({
      id: chatMessages.id,
      senderId: chatMessages.senderId,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
      senderFirstName: users.firstName,
      senderLastName: users.lastName,
    })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.senderId, users.id))
    .where(eq(chatMessages.conversationId, convId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  const result = msgs.reverse().map((m) => ({
    id: m.id,
    senderId: m.senderId,
    senderName: `${m.senderFirstName} ${m.senderLastName}`,
    senderInitials: `${(m.senderFirstName || '')[0] || ''}${(m.senderLastName || '')[0] || ''}`.toUpperCase(),
    text: m.content,
    timestamp: m.createdAt || '',
    isOwn: m.senderId === user.id,
  }));

  return c.json({ messages: result, has_more: msgs.length === limit });
});
