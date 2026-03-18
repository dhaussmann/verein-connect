import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, AuthUser } from './types/bindings';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { memberRoutes } from './routes/members';
import { bankAccountRoutes } from './routes/bank-accounts';
import { roleRoutes } from './routes/roles';
import { eventRoutes } from './routes/events';
import { attendanceRoutes } from './routes/attendance';
import { communicationRoutes } from './routes/communication';
import { financeRoutes } from './routes/finance';
import { shopRoutes } from './routes/shop';
import { fileRoutes } from './routes/files';
import { settingsRoutes } from './routes/settings';
import { portalRoutes } from './routes/portal';
import { contractRoutes } from './routes/contracts';
import { membershipTypeRoutes } from './routes/membership-types';
import { tarifRoutes } from './routes/tarifs';
import { discountGroupRoutes } from './routes/discount-groups';
import { groupRoutes } from './routes/groups';
import { billingRoutes } from './routes/billing';
import { contractSettingsRoutes } from './routes/contract-settings';
import { selfRegistrationRoutes } from './routes/self-registration';
import { applicationRoutes } from './routes/applications';
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
app.route('/public/self-registration', selfRegistrationRoutes);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() }));

// ─── Protected Routes ────────────────────────────────────────────────────────
app.use('/v1/*', authMiddleware);

app.route('/v1/members', memberRoutes);
app.route('/v1/members', bankAccountRoutes);
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
app.route('/v1/contracts', contractRoutes);
app.route('/v1/membership-types', membershipTypeRoutes);
app.route('/v1/tarifs', tarifRoutes);
app.route('/v1/discount-groups', discountGroupRoutes);
app.route('/v1/groups', groupRoutes);
app.route('/v1/billing', billingRoutes);
app.route('/v1/contract-settings', contractSettingsRoutes);
app.route('/v1/contract-applications', applicationRoutes);

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
      // Daily 02:00: GDPR data cleanup + Contract auto-renewal
      console.log('[CRON] GDPR data cleanup...');
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

      // Auto-renew contracts
      console.log('[CRON] Contract auto-renewal...');
      const todayStr = new Date().toISOString().slice(0, 10);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const cutoff = thirtyDaysFromNow.toISOString().slice(0, 10);

      await db.prepare(`
        UPDATE contracts SET
          end_date = date(end_date, '+' || renewal_duration_months || ' months'),
          updated_at = datetime('now')
        WHERE auto_renew = 1
          AND status = 'ACTIVE'
          AND end_date IS NOT NULL
          AND end_date <= ?
          AND cancellation_date IS NULL
          AND renewal_duration_months IS NOT NULL
      `).bind(cutoff).run();
    }

    if (cron === '0 3 * * *') {
      // Daily 03:00: Billing engine — expire ended contracts
      console.log('[CRON] Contract expiration check...');
      const db = env.DB;
      const today = new Date().toISOString().slice(0, 10);

      // Expire contracts past their cancellation_effective_date
      await db.prepare(`
        UPDATE contracts SET status = 'CANCELLED', updated_at = datetime('now')
        WHERE status = 'ACTIVE'
          AND cancellation_effective_date IS NOT NULL
          AND cancellation_effective_date <= ?
      `).bind(today).run();

      // Expire ONCE/FIXED contracts past end_date without auto_renew
      await db.prepare(`
        UPDATE contracts SET status = 'EXPIRED', updated_at = datetime('now')
        WHERE status = 'ACTIVE'
          AND auto_renew = 0
          AND end_date IS NOT NULL
          AND end_date < ?
          AND cancellation_date IS NULL
      `).bind(today).run();
    }

    if (cron === '0 0 1 * *') {
      // Monthly: Generate membership invoices (placeholder)
      console.log('[CRON] Monthly membership invoice generation...');
    }
  },
};

export { ChatRoomDO } from './durable-objects/chat-room';
export { EventStatsDO } from './durable-objects/live-stats';
