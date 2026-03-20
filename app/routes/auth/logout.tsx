import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { destroyUserSession, getEnv } from "@/lib/session.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  const cookieHeader = await destroyUserSession(request, env.COOKIE_SECRET);
  return redirect("/login", {
    headers: { "Set-Cookie": cookieHeader },
  });
}

export async function loader() {
  return redirect("/login");
}
