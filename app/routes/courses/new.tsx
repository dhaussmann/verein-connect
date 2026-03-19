import { useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { listMembersUseCase } from "@/modules/members/use-cases/list-members.use-case";
import { createEventUseCase } from "@/modules/events/use-cases/events.use-cases";
import CourseNewPage from "@/modules/courses/web/CourseNewPage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const memberResult = await listMembersUseCase(env, user.orgId, { perPage: 200, page: 1 });
  const membersData = { data: memberResult.members };
  return { membersData };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  try {
    await createEventUseCase(env, {
      orgId: user.orgId,
      actorUserId: user.id,
      payload: JSON.parse(String(formData.get("payload") || "{}")),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erstellen fehlgeschlagen" };
  }
}

export default function CourseNewRoute() {
  const { membersData } = useLoaderData<typeof loader>();
  return (
    <CourseNewPage
      membersData={membersData}
      actionData={useActionData<typeof action>()}
      navigationState={useNavigation().state}
    />
  );
}
