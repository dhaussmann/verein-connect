import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { getEventDetailUseCase } from "@/modules/events/use-cases/events.use-cases";
import CourseDetailPage from "@/modules/courses/web/CourseDetailPage";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  if (!params.id) throw new Response("Not Found", { status: 404 });
  const course = await getEventDetailUseCase(env, { orgId: user.orgId, eventId: params.id });
  return { course };
}

export default function CourseDetailRoute() {
  return <CourseDetailPage {...useLoaderData<typeof loader>()} />;
}
