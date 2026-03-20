import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getSessionTokens, getEnv } from "@/lib/session.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  const { user } = await getSessionTokens(request, env.COOKIE_SECRET);

  if (!user) return redirect("/login");

  if (user.roles?.includes("org_admin") || user.roles?.includes("trainer")) {
    return redirect("/dashboard");
  }
  return redirect("/portal");
}

export default function Index() {
  return null;
}
