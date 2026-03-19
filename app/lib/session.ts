import { createCookieSessionStorage } from "react-router";
import type { Env as ServerEnv } from "@/core/types/bindings";
import type { SessionUser } from "@/core/types/auth";

export type SessionData = {
  user: SessionUser;
};

function getSessionStorage(cookieSecret: string) {
  return createCookieSessionStorage<SessionData>({
    cookie: {
      name: "__session",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      secrets: [cookieSecret],
    },
  });
}

export async function getSession(request: Request, cookieSecret: string) {
  const storage = getSessionStorage(cookieSecret);
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getSessionTokens(request: Request, cookieSecret: string) {
  const session = await getSession(request, cookieSecret);
  const user = session.get("user") ?? null;
  return { user };
}

export async function commitSessionTokens(
  request: Request,
  cookieSecret: string,
  user: SessionUser,
) {
  const storage = getSessionStorage(cookieSecret);
  const session = await storage.getSession(request.headers.get("Cookie"));
  session.set("user", user);
  return storage.commitSession(session);
}

export async function destroyUserSession(request: Request, cookieSecret: string) {
  const storage = getSessionStorage(cookieSecret);
  const session = await storage.getSession(request.headers.get("Cookie"));
  return storage.destroySession(session);
}

export type Env = Partial<Pick<ServerEnv, "DB" | "KV" | "FRONTEND_URL" | "RESEND_API_KEY" | "SYSTEM_API_KEY">> & {
  COOKIE_SECRET: string;
  API_BASE_URL?: string;
};

export function getEnv(context: { cloudflare?: { env?: Env } }): Env {
  return (context.cloudflare?.env ?? {
    COOKIE_SECRET: process.env.COOKIE_SECRET ?? "dev-secret",
    API_BASE_URL: process.env.API_BASE_URL,
  }) as Env;
}

export function getApiBaseUrl(request: Request, env?: Pick<Env, "API_BASE_URL">): string {
  return env?.API_BASE_URL ?? new URL("/api", request.url).toString();
}
