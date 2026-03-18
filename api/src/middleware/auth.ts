import { createMiddleware } from 'hono/factory';
import type { Env, AuthUser } from '../types/bindings';
import { verifyAccessToken } from '../lib/jwt';
import { UnauthorizedError } from '../lib/errors';

type Variables = {
  user: AuthUser;
};

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Fehlender oder ungültiger Authorization-Header');
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAccessToken(
      token,
      c.env.JWT_PUBLIC_KEY,
      c.env.JWT_ISSUER,
    );

    const user: AuthUser = {
      id: payload.sub,
      orgId: payload.org,
      email: '',
      firstName: '',
      lastName: '',
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };

    c.set('user', user);
    await next();
  } catch {
    throw new UnauthorizedError('Ungültiger oder abgelaufener Token');
  }
});

export function requirePermission(...requiredPermissions: string[]) {
  return createMiddleware<{
    Bindings: Env;
    Variables: Variables;
  }>(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      throw new UnauthorizedError();
    }

    const hasWildcard = user.permissions.includes('*');
    if (!hasWildcard) {
      const hasAll = requiredPermissions.every((p) => user.permissions.includes(p));
      if (!hasAll) {
        throw new UnauthorizedError('Keine Berechtigung für diese Aktion');
      }
    }

    await next();
  });
}
