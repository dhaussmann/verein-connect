import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, AuthUser } from '../types/env';
import { AppError } from '../lib/errors';
import { authMiddleware } from './middleware';

// Route imports
import { memberRoutes } from './routes/members';
import { guardianRoutes } from './routes/guardians';
import { bankAccountRoutes } from './routes/bank-accounts';
import { eventRoutes } from './routes/events';
import { attendanceRoutes } from './routes/attendance';
import { contractRoutes } from './routes/contracts';
import { billingRoutes } from './routes/billing';
import { applicationRoutes } from './routes/applications';
import { membershipTypeRoutes } from './routes/membership-types';
import { tarifRoutes } from './routes/tarifs';
import { discountGroupRoutes } from './routes/discount-groups';
import { contractSettingsRoutes } from './routes/contract-settings';
import { selfRegistrationRoutes } from './routes/self-registration';
import { familyRoutes } from './routes/families';
import { groupRoutes } from './routes/groups';
import { roleRoutes } from './routes/roles';
import { portalRoutes } from './routes/portal';
import { fileRoutes } from './routes/files';
import { financeRoutes } from './routes/finance';
import { settingsRoutes } from './routes/settings';
import { communicationRoutes } from './routes/communication';
import { shopRoutes } from './routes/shop';

export type ApiEnv = {
  Bindings: Env;
  Variables: { user: AuthUser };
};

const api = new Hono<ApiEnv>().basePath('/api/v1');

// CORS
api.use('/*', cors({
  origin: (origin) => {
    if (!origin) return '*';
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin;
    if (origin.includes('verein-connect')) return origin;
    return '';
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposeHeaders: ['Set-Cookie'],
}));

// Global error handler
api.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({
      error: err.message,
      code: err.code,
      ...(err instanceof AppError && 'details' in err ? { details: (err as any).details } : {}),
    }, err.status as any);
  }
  console.error('API Error:', err);
  return c.json({ error: 'Interner Serverfehler' }, 500);
});

// Public routes (no auth required)
api.route('/registration', selfRegistrationRoutes);

// Auth-protected routes
api.use('/*', authMiddleware);

api.route('/members', memberRoutes);
api.route('/members', guardianRoutes);
api.route('/members', bankAccountRoutes);
api.route('/events', eventRoutes);
api.route('/attendance', attendanceRoutes);
api.route('/contracts', contractRoutes);
api.route('/billing', billingRoutes);
api.route('/applications', applicationRoutes);
api.route('/membership-types', membershipTypeRoutes);
api.route('/tarifs', tarifRoutes);
api.route('/discount-groups', discountGroupRoutes);
api.route('/contract-settings', contractSettingsRoutes);
api.route('/families', familyRoutes);
api.route('/groups', groupRoutes);
api.route('/roles', roleRoutes);
api.route('/me', portalRoutes);
api.route('/files', fileRoutes);
api.route('/finance', financeRoutes);
api.route('/settings', settingsRoutes);
api.route('/communication', communicationRoutes);
api.route('/shop', shopRoutes);

export { api };
