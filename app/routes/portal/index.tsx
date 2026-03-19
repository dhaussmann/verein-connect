import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { getPortalDashboardUseCase } from "@/modules/portal/use-cases/portal.use-cases";
import MemberDashboardPage from "@/modules/portal/web/MemberDashboardPage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  return getPortalDashboardUseCase(env, user.id);
}

export default function PortalIndexRoute() {
  return <MemberDashboardPage {...useLoaderData<typeof loader>()} />;
}
