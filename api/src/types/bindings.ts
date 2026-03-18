export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  KV: KVNamespace;
  CHAT_ROOM: DurableObjectNamespace;
  EVENT_STATS: DurableObjectNamespace;
  FRONTEND_URL: string;
  JWT_ISSUER: string;
  JWT_PRIVATE_KEY: string;
  JWT_PUBLIC_KEY: string;
  STRIPE_SECRET_KEY: string;
  RESEND_API_KEY: string;
}

export interface JwtPayload {
  sub: string;
  org: string;
  roles: string[];
  permissions: string[];
  iss: string;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  orgId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}
