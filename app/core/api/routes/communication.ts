import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, count } from 'drizzle-orm';
import type { Env, AuthUser } from '../../types/env';
import { messages, messageRecipients, messageTemplates, users } from '../../db/schema';
import { parsePagination, buildMeta } from '../../lib/pagination';
import { NotFoundError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const communicationRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Messages ───────────────────────────────────────────────────────────────
communicationRoutes.get('/messages', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const conditions: any[] = [eq(messages.orgId, user.orgId)];
  if (query.channel) conditions.push(eq(messages.channel, query.channel));
  if (query.status) conditions.push(eq(messages.status, query.status));

  const whereClause = and(...conditions);
  const totalResult = await db.select({ count: count() }).from(messages).where(whereClause);
  const total = totalResult[0]?.count || 0;

  const rows = await db.select().from(messages).where(whereClause)
    .orderBy(desc(messages.createdAt)).limit(perPage).offset(offset);

  return c.json({ data: rows, meta: buildMeta(total, page, perPage) });
});

communicationRoutes.get('/messages/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(messages).where(and(eq(messages.id, id), eq(messages.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Nachricht', id);

  const recipients = await db.select().from(messageRecipients).where(eq(messageRecipients.messageId, id));
  return c.json({ ...rows[0], recipients });
});

communicationRoutes.post('/messages', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const msg = await db.insert(messages).values({
    orgId: user.orgId,
    senderId: user.id,
    channel: body.channel || 'email',
    subject: body.subject || null,
    body: body.body,
    templateId: body.template_id || null,
    status: body.status || 'draft',
    scheduledAt: body.scheduled_at || null,
  }).returning();

  // Add recipients
  if (body.recipient_ids && Array.isArray(body.recipient_ids)) {
    for (const rid of body.recipient_ids) {
      await db.insert(messageRecipients).values({
        messageId: msg[0].id,
        recipientType: 'user',
        recipientId: rid,
      });
    }
  }
  if (body.recipient_roles && Array.isArray(body.recipient_roles)) {
    for (const roleId of body.recipient_roles) {
      await db.insert(messageRecipients).values({
        messageId: msg[0].id,
        recipientType: 'role',
        recipientId: roleId,
      });
    }
  }
  if (body.recipient_groups && Array.isArray(body.recipient_groups)) {
    for (const groupId of body.recipient_groups) {
      await db.insert(messageRecipients).values({
        messageId: msg[0].id,
        recipientType: 'group',
        recipientId: groupId,
      });
    }
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Nachricht erstellt', 'message', msg[0].id);
  return c.json({ id: msg[0].id }, 201);
});

communicationRoutes.post('/messages/:id/send', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(messages).where(and(eq(messages.id, id), eq(messages.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Nachricht', id);

  // TODO: Implement actual email/push sending via Resend API
  await db.update(messages).set({ status: 'sent', sentAt: new Date().toISOString() }).where(eq(messages.id, id));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Nachricht gesendet', 'message', id);
  return c.json({ success: true });
});

communicationRoutes.delete('/messages/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  await db.delete(messageRecipients).where(eq(messageRecipients.messageId, id));
  await db.delete(messages).where(and(eq(messages.id, id), eq(messages.orgId, user.orgId)));
  return c.json({ success: true });
});

// ─── Templates ──────────────────────────────────────────────────────────────
communicationRoutes.get('/templates', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(messageTemplates).where(eq(messageTemplates.orgId, user.orgId));
  return c.json(rows);
});

communicationRoutes.post('/templates', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const tpl = await db.insert(messageTemplates).values({
    orgId: user.orgId,
    name: body.name,
    channel: body.channel || 'email',
    subject: body.subject || null,
    body: body.body,
    signature: body.signature || null,
  }).returning();

  return c.json({ id: tpl[0].id }, 201);
});

communicationRoutes.put('/templates/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const u: Record<string, any> = {};
  if (body.name !== undefined) u.name = body.name;
  if (body.subject !== undefined) u.subject = body.subject;
  if (body.body !== undefined) u.body = body.body;
  if (body.signature !== undefined) u.signature = body.signature;

  await db.update(messageTemplates).set(u).where(and(eq(messageTemplates.id, id), eq(messageTemplates.orgId, user.orgId)));
  return c.json({ success: true });
});

communicationRoutes.delete('/templates/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  await db.delete(messageTemplates).where(and(eq(messageTemplates.id, id), eq(messageTemplates.orgId, user.orgId)));
  return c.json({ success: true });
});
