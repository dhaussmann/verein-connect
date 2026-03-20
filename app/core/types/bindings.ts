export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  KV: KVNamespace;
  FRONTEND_URL: string;
  SYSTEM_API_KEY?: string;
  STRIPE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  BETTER_AUTH_SECRET: string;
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
