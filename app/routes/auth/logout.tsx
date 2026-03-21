import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { sendBetterAuthRequest } from "@/core/auth/better-auth.server";
import { getEnv } from "@/core/auth/session.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  const response = await sendBetterAuthRequest(request, env, "/sign-out", {
    method: "POST",
  });
  const cookieHeader = response.headers.get("set-cookie");
  return redirect("/login", {
    headers: cookieHeader ? { "Set-Cookie": cookieHeader } : undefined,
  });
}

export async function loader() {
  return redirect("/login");
}
