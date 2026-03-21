import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getBetterAuth } from "@/core/auth/better-auth.server";
import { getEnv } from "@/core/auth/session.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  return getBetterAuth(request, env).handler(request);
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  return getBetterAuth(request, env).handler(request);
}
