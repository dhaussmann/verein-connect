import { redirect } from "react-router";
import { getSessionTokens, type Env } from "./session.server";
import { getSessionUserById } from "@/core/auth/auth.service";
import type { SessionUser } from "@/core/types/auth";

export type AuthUser = SessionUser;

export async function requireAuth(
  request: Request,
  env: Env,
) : Promise<{ user: AuthUser; refreshedCookieHeader: string | null }> {
  const { user: sessionUser } = await getSessionTokens(request, env.COOKIE_SECRET);
  if (!sessionUser) {
    throw redirect("/login");
  }

  if (!env.DB) {
    return { user: sessionUser, refreshedCookieHeader: null };
  }

  const freshUser = await getSessionUserById(env as Required<Pick<Env, "DB">>, sessionUser.id);
  if (!freshUser) {
    throw redirect("/login");
  }

  return { user: freshUser, refreshedCookieHeader: null };
}

export async function optionalAuth(
  request: Request,
  env: Env,
): Promise<AuthUser | null> {
  try {
    const { user } = await requireAuth(request, env);
    return user;
  } catch {
    return null;
  }
}
