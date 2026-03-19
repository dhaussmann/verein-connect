import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { getGroupDetailUseCase } from "@/modules/groups/use-cases/get-group-detail.use-case";
import { addGroupMemberUseCase } from "@/modules/groups/use-cases/add-group-member.use-case";
import { removeGroupMemberUseCase } from "@/modules/groups/use-cases/remove-group-member.use-case";
import GroupDetailRoute from "@/modules/groups/web/GroupDetailRoute";
import type { GroupDetailLoaderData, GroupRouteActionData } from "@/modules/groups/types/group.types";

export async function loader({ request, context, params }: LoaderFunctionArgs): Promise<GroupDetailLoaderData> {
  const { env, user } = await requireRouteData(request, context);
  const groupId = params.id;
  if (!groupId) throw new Error("Gruppen-ID fehlt");
  return getGroupDetailUseCase(env, { orgId: user.orgId, groupId });
}

export async function action({ request, context, params }: ActionFunctionArgs): Promise<GroupRouteActionData> {
  const { env, user } = await requireRouteData(request, context);
  const groupId = params.id;
  if (!groupId) return { success: false, error: "Gruppen-ID fehlt" };

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  try {
    if (intent === "add-member") {
      const userId = String(formData.get("userId") || "");
      if (!userId) return { success: false, intent, error: "Mitglied fehlt" };
      await addGroupMemberUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId, userId });
      return { success: true, intent };
    }
    if (intent === "remove-member") {
      const userId = String(formData.get("userId") || "");
      if (!userId) return { success: false, intent, error: "Mitglied fehlt" };
      await removeGroupMemberUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId, userId });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : "Fehler" };
  }

  return { success: false, error: "Unbekannte Aktion" };
}

export default GroupDetailRoute;
