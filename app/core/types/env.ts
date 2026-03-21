export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  KV: KVNamespace;
  CHAT_ROOM: DurableObjectNamespace;
  EVENT_STATS: DurableObjectNamespace;
  BETTER_AUTH_SECRET: string;
  RESEND_API_KEY: string;
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
