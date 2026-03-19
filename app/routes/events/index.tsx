import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { listCalendarEventsUseCase } from "@/modules/events/use-cases/events.use-cases";
import EventsPage from "@/modules/events/web/EventsPage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const apiCalendarEvents = await listCalendarEventsUseCase(env, user.orgId, { perPage: 200 });
  return { apiCalendarEvents };
}

export default function EventsIndexRoute() {
  return <EventsPage {...useLoaderData<typeof loader>()} />;
}
