import { useActionData, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { getBillingScheduleUseCase, runBillingUseCase } from "@/modules/billing/use-cases/billing.use-cases";
import BillingPage from "@/modules/billing/web/BillingPage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const data = await getBillingScheduleUseCase(env, user.orgId);
  return { data };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  try {
    const result = await runBillingUseCase(env, { orgId: user.orgId, actorUserId: user.id });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Abrechnungslauf fehlgeschlagen" };
  }
}

export default function BillingIndexRoute() {
  const { data } = useLoaderData<typeof loader>();
  return <BillingPage data={data} actionData={useActionData<typeof action>()} />;
}
