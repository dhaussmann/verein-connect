import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { listEventsUseCase } from "@/modules/events/use-cases/events.use-cases";
import CoursesPage from "@/modules/courses/web/CoursesPage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const eventsData = await listEventsUseCase(env, user.orgId, { event_type: "course", per_page: "200" });
  return { eventsData };
}

export default function CoursesIndexRoute() {
  return <CoursesPage {...useLoaderData<typeof loader>()} />;
}
