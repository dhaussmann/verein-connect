import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { getSettingsAuditLogUseCase } from "@/modules/settings/use-cases/settings.use-cases";
import { GdprSettingsSection } from "@/modules/settings/web/sections";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const auditLog = await getSettingsAuditLogUseCase(env, user.orgId, 50);
  return { auditLog };
}

export default function SettingsGdprRoute() {
  const { auditLog } = useLoaderData<typeof loader>();
  return <GdprSettingsSection auditLog={auditLog} />;
}
