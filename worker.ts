import { createRequestHandler } from "@react-router/cloudflare";
import * as build from "./build/server";
import { scheduledHandler } from "./app/core/system/scheduler";
import type { Env } from "./app/core/types/bindings";

const handler = createRequestHandler({ build });
type HandlerContext = Parameters<typeof handler>[0];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const context: HandlerContext = {
      request: request as HandlerContext["request"],
      functionPath: "/",
      waitUntil: ctx.waitUntil.bind(ctx),
      passThroughOnException: ctx.passThroughOnException.bind(ctx),
      next: async () => new Response("Not Found", { status: 404 }),
      env: {
        ...env,
        ASSETS: { fetch },
      },
      params: {},
      data: {},
    };

    return handler(context);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    return scheduledHandler(event, env);
  },
};
