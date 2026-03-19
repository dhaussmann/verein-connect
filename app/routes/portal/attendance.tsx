import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { getPortalAttendanceUseCase } from "@/modules/portal/use-cases/portal.use-cases";
import MyEventsPage from "@/modules/portal/web/MyEventsPage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const data = await getPortalAttendanceUseCase(env, user.id);
  return { data };
}

export default function PortalAttendanceRoute() {
  return <MyEventsPage {...useLoaderData<typeof loader>()} />;
}
