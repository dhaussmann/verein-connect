import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getFirstFieldError } from "@/lib/forms";
import { requireRouteData } from "@/core/runtime/route";
import { listGroupsUseCase } from "@/modules/groups/use-cases/list-groups.use-case";
import { groupFormSchema } from "@/modules/groups/schemas/group.schema";
import { createGroupUseCase } from "@/modules/groups/use-cases/create-group.use-case";
import { updateGroupUseCase } from "@/modules/groups/use-cases/update-group.use-case";
import { deleteGroupUseCase } from "@/modules/groups/use-cases/delete-group.use-case";
import GroupsListRoute from "@/modules/groups/web/GroupsListRoute";
import type { GroupRouteActionData, GroupsListLoaderData } from "@/modules/groups/types/group.types";

export async function loader({ request, context }: LoaderFunctionArgs): Promise<GroupsListLoaderData> {
  const { env, user } = await requireRouteData(request, context);
  return listGroupsUseCase(env, user.orgId);
}

export async function action({ request, context }: ActionFunctionArgs): Promise<GroupRouteActionData> {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  try {
    if (intent === "create-group" || intent === "update-group") {
      const parsed = groupFormSchema.safeParse({
        name: formData.get("name"),
        description: formData.get("description"),
        category: formData.get("category"),
      });
      if (!parsed.success) return { success: false, intent, error: getFirstFieldError(parsed.error.issues) || "Bitte Eingaben prüfen" };

      if (intent === "create-group") {
        await createGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, ...parsed.data });
      } else {
        const groupId = String(formData.get("groupId") || "");
        if (!groupId) return { success: false, intent, error: "Gruppe fehlt" };
        await updateGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId, ...parsed.data });
      }
      return { success: true, intent };
    }

    if (intent === "delete-group") {
      const groupId = String(formData.get("groupId") || "");
      if (!groupId) return { success: false, intent, error: "Gruppe fehlt" };
      await deleteGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : "Fehler" };
  }

  return { success: false, error: "Unbekannte Aktion" };
}

export default GroupsListRoute;
