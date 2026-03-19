import { useActionData, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import {
  createDiscountGroupUseCase,
  deleteDiscountGroupUseCase,
  deleteMembershipTypeUseCase,
  deleteTarifUseCase,
  getContractSettingsUseCase,
  listDiscountGroupsUseCase,
  listMembershipTypesUseCase,
  listTarifsUseCase,
  saveContractSettingsUseCase,
  saveMembershipTypeUseCase,
  saveTarifUseCase,
} from "@/modules/contracts/use-cases/contract-settings.use-cases";
import { createGroupUseCase } from "@/modules/groups/use-cases/create-group.use-case";
import { deleteGroupUseCase } from "@/modules/groups/use-cases/delete-group.use-case";
import { listGroupsUseCase } from "@/modules/groups/use-cases/list-groups.use-case";
import ContractSettingsPage from "@/modules/contracts/web/ContractSettingsPage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const [settings, mtData, tarifData, dgData, groupsResult] = await Promise.all([
    getContractSettingsUseCase(env, user.orgId),
    listMembershipTypesUseCase(env, user.orgId),
    listTarifsUseCase(env, user.orgId),
    listDiscountGroupsUseCase(env, user.orgId),
    listGroupsUseCase(env, user.orgId),
  ]);
  const groupData = { data: groupsResult.groups };
  return { settings, mtData, tarifData, dgData, groupData };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const id = String(formData.get("id") || "");
  const payload = String(formData.get("payload") || "");
  const parsedPayload = payload ? JSON.parse(payload) as Record<string, unknown> : {};

  try {
    if (intent === "save-settings") {
      await saveContractSettingsUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        ...parsedPayload,
      });
      return { success: true, intent };
    }
    if (intent === "save-membership-type") {
      await saveMembershipTypeUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        id: id || undefined,
        payload: parsedPayload,
      });
      return { success: true, intent };
    }
    if (intent === "delete-membership-type") {
      await deleteMembershipTypeUseCase(env, { orgId: user.orgId, actorUserId: user.id, id });
      return { success: true, intent };
    }
    if (intent === "save-tarif") {
      await saveTarifUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        id: id || undefined,
        payload: parsedPayload,
      });
      return { success: true, intent };
    }
    if (intent === "delete-tarif") {
      await deleteTarifUseCase(env, { orgId: user.orgId, actorUserId: user.id, id });
      return { success: true, intent };
    }
    if (intent === "create-discount-group") {
      await createDiscountGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, name: String(formData.get("name") || "") });
      return { success: true, intent };
    }
    if (intent === "delete-discount-group") {
      await deleteDiscountGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, id });
      return { success: true, intent };
    }
    if (intent === "create-group") {
      await createGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, name: String(formData.get("name") || "") });
      return { success: true, intent };
    }
    if (intent === "delete-group") {
      await deleteGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId: id });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : "Speichern fehlgeschlagen" };
  }

  return { success: false, error: "Unbekannte Aktion" };
}

export default function ContractSettingsRoute() {
  return <ContractSettingsPage {...useLoaderData<typeof loader>()} actionData={useActionData<typeof action>()} />;
}
