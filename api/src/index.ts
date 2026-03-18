import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, AuthUser } from './types/bindings';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { memberRoutes } from './routes/members';
import { roleRoutes } from './routes/roles';
import { eventRoutes } from './routes/events';
import { attendanceRoutes } from './routes/attendance';
import { communicationRoutes } from './routes/communication';
import { financeRoutes } from './routes/finance';
import { shopRoutes } from './routes/shop';
import { fileRoutes } from './routes/files';
import { settingsRoutes } from './routes/settings';
import { portalRoutes } from './routes/portal';
import { AppError } from './lib/errors';

type Variables = { user: AuthUser };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Global Middleware ───────────────────────────────────────────────────────
app.use('*', logger());

app.use('*', cors({
  origin: (origin, c) => {
    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';
    if (!origin) return frontendUrl;
    // Allow configured URL, localhost, and Cloudflare Pages previews
    if (
      origin === frontendUrl ||
      origin.startsWith('http://localhost:') ||
      origin.endsWith('.verein-connect.pages.dev') ||
      origin === 'https://verein-connect.pages.dev'
    ) {
      return origin;
    }
    return frontendUrl;
  },
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
}));

// ─── Public Routes (no auth) ─────────────────────────────────────────────────
app.route('/auth', authRoutes);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() }));

// ─── Protected Routes ────────────────────────────────────────────────────────
app.use('/v1/*', authMiddleware);

app.route('/v1/members', memberRoutes);
app.route('/v1/roles', roleRoutes);
app.route('/v1/events', eventRoutes);
app.route('/v1/courses', eventRoutes);
app.route('/v1/attendance', attendanceRoutes);
app.route('/v1', communicationRoutes);
app.route('/v1', financeRoutes);
app.route('/v1/shop', shopRoutes);
app.route('/v1/files', fileRoutes);
app.route('/v1/settings', settingsRoutes);
app.route('/v1/me', portalRoutes);

// ─── WebSocket Routes (Chat & Live Stats) ────────────────────────────────────
app.get('/v1/chat/ws/:conversation_id', async (c) => {
  const conversationId = c.req.param('conversation_id');
  const id = c.env.CHAT_ROOM.idFromName(conversationId);
  const stub = c.env.CHAT_ROOM.get(id);
  const url = new URL(c.req.url);
  url.pathname = '/websocket';
  return stub.fetch(new Request(url.toString(), c.req.raw));
});

app.get('/v1/events/:id/live-stats', async (c) => {
  const eventId = c.req.param('id');
  const id = c.env.EVENT_STATS.idFromName(eventId);
  const stub = c.env.EVENT_STATS.get(id);
  const url = new URL(c.req.url);
  url.pathname = '/websocket';
  return stub.fetch(new Request(url.toString(), c.req.raw));
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Endpunkt nicht gefunden', code: 'NOT_FOUND' }, 404));

// ─── Error Handler ───────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error(`[ERROR] ${err.message}`, err.stack);

  if (err instanceof AppError) {
    return c.json({
      error: err.message,
      code: err.code,
      ...(('details' in err && (err as any).details) ? { details: (err as any).details } : {}),
    }, err.status as any);
  }

  return c.json({ error: 'Interner Serverfehler', code: 'INTERNAL_ERROR' }, 500);
});

// ─── Cron Triggers ───────────────────────────────────────────────────────────
export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const cron = event.cron;

    if (cron === '0 8 * * 1') {
      // Monday 08:00: Mark overdue invoices
      console.log('[CRON] Marking overdue invoices...');
      const db = env.DB;
      const today = new Date().toISOString().slice(0, 10);
      await db.prepare(
        `UPDATE invoices SET status = 'overdue' WHERE status = 'sent' AND due_date < ?`
      ).bind(today).run();
    }

    if (cron === '0 2 * * *') {
      // Daily 02:00: GDPR data cleanup
      console.log('[CRON] GDPR data cleanup...');
      // Check profile_field_definitions with gdpr_retention_days and delete expired values
      const db = env.DB;
      await db.prepare(`
        DELETE FROM profile_field_values WHERE field_id IN (
          SELECT id FROM profile_field_definitions 
          WHERE gdpr_retention_days IS NOT NULL 
          AND gdpr_retention_days > 0
        ) AND datetime(updated_at, '+' || (
          SELECT gdpr_retention_days FROM profile_field_definitions WHERE id = field_id
        ) || ' days') < datetime('now')
      `).run();
    }

    if (cron === '0 0 1 * *') {
      // Monthly: Generate membership invoices (placeholder)
      console.log('[CRON] Monthly membership invoice generation...');
    }
  },
};

export { ChatRoomDO } from './durable-objects/chat-room';
export { EventStatsDO } from './durable-objects/live-stats';
