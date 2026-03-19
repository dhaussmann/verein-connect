import { useActionData, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { acceptApplicationUseCase, listApplicationsUseCase, rejectApplicationUseCase } from "@/modules/applications/use-cases/applications.use-cases";
import ApplicationsPage from "@/modules/applications/web/ApplicationsPage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const url = new URL(request.url);
  const data = await listApplicationsUseCase(env, {
    orgId: user.orgId,
    page: Number(url.searchParams.get("page") || 1),
    perPage: Number(url.searchParams.get("per_page") || 25),
    status: url.searchParams.get("status") || undefined,
  });
  return { data };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const id = String(formData.get("id") || "");

  try {
    if (intent === "accept") {
      await acceptApplicationUseCase(env, { orgId: user.orgId, actorUserId: user.id, applicationId: id });
      return { success: true, intent };
    }
    if (intent === "reject") {
      await rejectApplicationUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        applicationId: id,
        reviewNotes: String(formData.get("reviewNotes") || ""),
      });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Aktion fehlgeschlagen" };
  }

  return { success: false, error: "Unbekannte Aktion" };
}

export default function ApplicationsIndexRoute() {
  const { data } = useLoaderData<typeof loader>();
  return <ApplicationsPage data={data} actionData={useActionData<typeof action>()} />;
}
