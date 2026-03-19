import { useActionData, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import {
  cancelContractUseCase,
  createContractInvoiceUseCase,
  deleteContractUseCase,
  getContractDetailUseCase,
  pauseContractUseCase,
} from "@/modules/contracts/use-cases/contracts.use-cases";
import ContractDetailPage from "@/modules/contracts/web/ContractDetailPage";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  if (!params.id) throw new Response("Not Found", { status: 404 });
  const contract = await getContractDetailUseCase(env, { orgId: user.orgId, contractId: params.id });
  return { contract };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  if (!params.id) throw new Response("Not Found", { status: 404 });
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  try {
    if (intent === "cancel") {
      await cancelContractUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        contractId: params.id,
        cancellationDate: String(formData.get("cancellationDate") || ""),
      });
      return { success: true, intent };
    }
    if (intent === "pause") {
      await pauseContractUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        contractId: params.id,
        pauseFrom: String(formData.get("pauseFrom") || ""),
        pauseUntil: String(formData.get("pauseUntil") || ""),
        reason: String(formData.get("pauseReason") || ""),
      });
      return { success: true, intent };
    }
    if (intent === "create-invoice") {
      await createContractInvoiceUseCase(env, { orgId: user.orgId, actorUserId: user.id, contractId: params.id });
      return { success: true, intent };
    }
    if (intent === "delete") {
      await deleteContractUseCase(env, { orgId: user.orgId, actorUserId: user.id, contractId: params.id });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : "Aktion fehlgeschlagen" };
  }

  return { success: false, error: "Unbekannte Aktion" };
}

export default function ContractDetailRoute() {
  const { contract } = useLoaderData<typeof loader>();
  return <ContractDetailPage contract={contract} actionData={useActionData<typeof action>()} />;
}
