import { useActionData, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { cancelContractUseCase, createContractInvoiceUseCase, listContractsUseCase } from "@/modules/contracts/use-cases/contracts.use-cases";
import ContractsPage from "@/modules/contracts/web/ContractsPage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const url = new URL(request.url);
  const data = await listContractsUseCase(env, user.orgId, Object.fromEntries(url.searchParams.entries()));
  return { data };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const id = String(formData.get("id") || "");

  try {
    if (intent === "cancel") {
      await cancelContractUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        contractId: id,
        cancellationDate: String(formData.get("cancellationDate") || ""),
      });
      return { success: true, intent };
    }
    if (intent === "create-invoice") {
      await createContractInvoiceUseCase(env, { orgId: user.orgId, actorUserId: user.id, contractId: id });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Aktion fehlgeschlagen" };
  }

  return { success: false, error: "Unbekannte Aktion" };
}

export default function ContractsIndexRoute() {
  const { data } = useLoaderData<typeof loader>();
  return <ContractsPage data={data} actionData={useActionData<typeof action>()} />;
}
