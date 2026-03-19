import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { getDashboardDataUseCase } from "@/modules/dashboard/use-cases/get-dashboard-data.use-case";
import DashboardPage from "@/modules/dashboard/web/DashboardPage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  return getDashboardDataUseCase(env, user.orgId);
}

export default function DashboardIndexRoute() {
  return <DashboardPage {...useLoaderData<typeof loader>()} />;
}
