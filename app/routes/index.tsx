import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getAuthenticatedHomePath, requireAuth } from "@/core/auth/auth.server";
import { getEnv } from "@/core/auth/session.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  const { user, refreshedCookieHeader } = await requireAuth(request, env);
  return redirect(getAuthenticatedHomePath(user), refreshedCookieHeader
    ? { headers: { "Set-Cookie": refreshedCookieHeader } }
    : undefined);
}

export default function Index() {
  return null;
}
