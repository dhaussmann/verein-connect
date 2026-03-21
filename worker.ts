import { createRequestHandler } from 'react-router';
import { api } from './app/core/api';

declare module 'react-router' {
  export interface AppLoadContext {
    cloudflare: {
      env: {
        DB: D1Database;
        FILES: R2Bucket;
        KV: KVNamespace;
        CHAT_ROOM: DurableObjectNamespace;
        EVENT_STATS: DurableObjectNamespace;
        BETTER_AUTH_SECRET: string;
        RESEND_API_KEY: string;
      };
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  // @ts-expect-error - virtual module provided by React Router at build time
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Route /api/v1/* requests to the Hono API
    if (url.pathname.startsWith('/api/v1')) {
      return api.fetch(request, env, ctx);
    }

    // Everything else goes to React Router SSR
    return requestHandler(request, {
      cloudflare: { env: env as any, ctx },
    });
  },
} satisfies ExportedHandler;

// Stub Durable Object classes (required by wrangler even if unused)
export class ChatRoomDO {
  constructor(private state: DurableObjectState) {}
  async fetch(request: Request) {
    return new Response('Not implemented', { status: 501 });
  }
}

export class EventStatsDO {
  constructor(private state: DurableObjectState) {}
  async fetch(request: Request) {
    return new Response('Not implemented', { status: 501 });
  }
}
