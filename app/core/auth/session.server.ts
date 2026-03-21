import type { Env as ServerEnv } from "@/core/types/bindings";

export type Env = Partial<Pick<ServerEnv, "DB" | "KV" | "FRONTEND_URL" | "RESEND_API_KEY" | "SYSTEM_API_KEY">> & {
  BETTER_AUTH_SECRET: string;
  API_BASE_URL?: string;
};

export function getEnv(context: { cloudflare?: { env?: Env } }): Env {
  return (context.cloudflare?.env ?? {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    API_BASE_URL: process.env.API_BASE_URL,
  }) as Env;
}

export function getApiBaseUrl(request: Request, env?: Pick<Env, "API_BASE_URL">): string {
  return env?.API_BASE_URL ?? new URL("/api", request.url).toString();
}
