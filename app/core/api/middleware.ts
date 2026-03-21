import { createMiddleware } from 'hono/factory';
import type { Env, AuthUser } from '../types/env';
import { getSessionUser } from '../auth/auth.server';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';

type Variables = { user: AuthUser };

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const user = await getSessionUser(c.req.raw, c.env);
  if (!user) {
    throw new UnauthorizedError('Nicht authentifiziert');
  }

  c.set('user', user as AuthUser);
  await next();
});

export const requirePermission = (...requiredPermissions: string[]) => {
  return createMiddleware<{
    Bindings: Env;
    Variables: Variables;
  }>(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      throw new UnauthorizedError('Nicht authentifiziert');
    }

    // Wildcard permission grants access to everything
    if (user.permissions.includes('*')) {
      await next();
      return;
    }

    const hasPermission = requiredPermissions.some((p) =>
      user.permissions.includes(p),
    );
    if (!hasPermission) {
      throw new ForbiddenError('Keine Berechtigung für diese Aktion');
    }

    await next();
  });
};
