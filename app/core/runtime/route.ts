import { requireAuth } from "@/lib/auth.server";
import { getEnv, type Env } from "@/lib/session.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

type RouteContext = LoaderFunctionArgs["context"] | ActionFunctionArgs["context"];

export type RouteEnv = Env & { DB: D1Database };

export function getRouteEnv(context: RouteContext): Env {
  return getEnv(context as { cloudflare?: { env?: Env } });
}

export async function requireRouteData(request: Request, context: RouteContext) {
  const env = getRouteEnv(context);
  const { user } = await requireAuth(request, env);
  if (!env.DB) {
    throw new Error("DB-Binding fehlt");
  }

  return {
    env: env as RouteEnv,
    user,
  };
}
