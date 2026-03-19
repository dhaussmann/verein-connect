import { data } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { getEnv } from "@/lib/session";
import { resolveScheduledCron, runScheduledJob } from "@/core/system/scheduler";

function readBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    throw data({ error: "Method Not Allowed" }, { status: 405 });
  }

  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  if (!env.SYSTEM_API_KEY) {
    throw data({ error: "SYSTEM_API_KEY fehlt" }, { status: 503 });
  }

  const token = readBearerToken(request);
  if (!token || token !== env.SYSTEM_API_KEY) {
    throw data({ error: "Nicht autorisiert" }, { status: 401 });
  }

  let value = "";
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    value = String(body.job || body.cron || "");
  } else {
    const formData = await request.formData();
    value = String(formData.get("job") || formData.get("cron") || "");
  }

  const cron = resolveScheduledCron(value);
  const result = await runScheduledJob(env, cron);
  return Response.json({ success: true, ...result });
}

export async function loader() {
  throw data({ error: "Method Not Allowed" }, { status: 405 });
}
