import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { getPortalEventsUseCase } from "@/modules/portal/use-cases/portal.use-cases";
import MyCoursesPage from "@/modules/portal/web/MyCoursesPage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const events = await getPortalEventsUseCase(env, user.id);
  return { events };
}

export default function PortalCoursesRoute() {
  return <MyCoursesPage {...useLoaderData<typeof loader>()} />;
}
