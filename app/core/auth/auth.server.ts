import { redirect } from "react-router";
import { getSessionUserById } from "@/core/auth/auth.service";
import { sendBetterAuthRequest } from "./better-auth.server";
import type { Env } from "./session.server";
import type { SessionUser } from "@/core/types/auth";

export type AuthUser = SessionUser;

type AuthResolution =
  | { status: "anonymous"; clearSessionCookieHeader: null }
  | { status: "authenticated"; user: AuthUser; refreshedCookieHeader: string | null }
  | { status: "stale"; clearSessionCookieHeader: string };

export function getAuthenticatedHomePath(user: Pick<AuthUser, "roles">): string {
  return user.roles?.includes("org_admin") || user.roles?.includes("trainer")
    ? "/dashboard"
    : "/portal";
}

export async function getValidatedSessionUser(
  request: Request,
  env: Env,
): Promise<AuthResolution> {
  if (!env.DB) {
    throw new Error("DB-Binding fehlt. Better Auth benötigt eine Datenbank.");
  }

  const sessionResponse = await sendBetterAuthRequest(request, env, "/get-session");
  const setCookieHeader = sessionResponse.headers.get("set-cookie");

  if (!sessionResponse.ok) {
    throw new Error("Better-Auth-Session konnte nicht geladen werden.");
  }

  const sessionData = await sessionResponse.json() as { user?: { id: string } } | null;
  if (!sessionData?.user?.id) {
    if (setCookieHeader) {
      return { status: "stale", clearSessionCookieHeader: setCookieHeader };
    }
    return { status: "anonymous", clearSessionCookieHeader: null };
  }

  const freshUser = await getSessionUserById(env as Required<Pick<Env, "DB">>, sessionData.user.id);
  if (!freshUser) {
    const signOutResponse = await sendBetterAuthRequest(request, env, "/sign-out", {
      method: "POST",
    });
    const cookieHeader = signOutResponse.headers.get("set-cookie");
    if (!cookieHeader) {
      throw new Error("Better-Auth-Session konnte nicht bereinigt werden.");
    }

    return { status: "stale", clearSessionCookieHeader: cookieHeader };
  }

  return { status: "authenticated", user: freshUser, refreshedCookieHeader: setCookieHeader };
}

export async function requireAnonymous(request: Request, env: Env) {
  const session = await getValidatedSessionUser(request, env);
  if (session.status === "authenticated") {
    throw redirect(
      getAuthenticatedHomePath(session.user),
      session.refreshedCookieHeader
        ? { headers: { "Set-Cookie": session.refreshedCookieHeader } }
        : undefined,
    );
  }

  if (session.status === "stale") {
    return { clearedSession: true, headers: { "Set-Cookie": session.clearSessionCookieHeader } };
  }

  return { clearedSession: false, headers: undefined };
}

export async function requireAuth(
  request: Request,
  env: Env,
) : Promise<{ user: AuthUser; refreshedCookieHeader: string | null }> {
  const session = await getValidatedSessionUser(request, env);
  if (session.status !== "authenticated") {
    throw redirect(
      "/login",
      session.status === "stale"
        ? { headers: { "Set-Cookie": session.clearSessionCookieHeader } }
        : undefined,
    );
  }

  return { user: session.user, refreshedCookieHeader: session.refreshedCookieHeader };
}

export async function optionalAuth(
  request: Request,
  env: Env,
): Promise<AuthUser | null> {
  const session = await getValidatedSessionUser(request, env);
  return session.status === "authenticated" ? session.user : null;
}
