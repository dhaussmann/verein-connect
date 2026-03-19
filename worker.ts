import { createRequestHandler } from "@react-router/cloudflare";
import * as build from "./build/server";
import { scheduledHandler } from "./app/core/system/scheduler";
import type { Env } from "./app/core/types/bindings";

const handler = createRequestHandler({ build });

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handler({
      request,
      env,
      waitUntil: ctx.waitUntil.bind(ctx),
      passThroughOnException: ctx.passThroughOnException.bind(ctx),
    });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    return scheduledHandler(event, env);
  },
};
