import { createRequestHandler } from '@react-router/cloudflare';
import * as build from './build/server';
import { api } from './app/core/api';
import type { Env } from './app/core/types/env';

const handler = createRequestHandler({ build });
type HandlerContext = Parameters<typeof handler>[0];

// Stub Durable Object classes (required by wrangler even if unused)
export class ChatRoomDO {
  constructor(private state: DurableObjectState) {}
  async fetch(_request: Request) {
    return new Response('Deprecated', { status: 410 });
  }
}

export class EventStatsDO {
  constructor(private state: DurableObjectState) {}
  async fetch(_request: Request) {
    return new Response('Deprecated', { status: 410 });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Route /api/v1/* requests to the Hono API
    if (url.pathname.startsWith('/api/v1')) {
      return api.fetch(request, env, ctx);
    }

    // Everything else goes to React Router SSR
    const context: HandlerContext = {
      request: request as HandlerContext['request'],
      functionPath: '/',
      waitUntil: ctx.waitUntil.bind(ctx),
      passThroughOnException: ctx.passThroughOnException.bind(ctx),
      next: async () => new Response('Not Found', { status: 404 }),
      env: {
        ...env,
        ASSETS: { fetch },
      },
      params: {},
      data: {},
    };

    return handler(context);
  },
};
