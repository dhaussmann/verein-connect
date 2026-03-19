import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { requireRouteData } from "@/core/runtime/route";
import { createOrUpdateRoleUseCase, deleteRoleUseCase, getSettingsRolesUseCase } from "@/modules/settings/use-cases/settings.use-cases";
import SettingsRolesRoute from "@/modules/settings/web/SettingsRolesRoute";

const roleSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich"),
  description: z.string().trim().optional(),
  category: z.enum(["general", "team", "department", "system"]),
});

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const roles = await getSettingsRolesUseCase(env, user.orgId);
  return { roles };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  try {
    if (intent === "save-role") {
      const parsed = roleSchema.safeParse({
        name: formData.get("name"),
        description: formData.get("description"),
        category: formData.get("category"),
      });
      if (!parsed.success) return { success: false, intent, error: parsed.error.issues[0]?.message || "Bitte Eingaben prüfen" };
      const permissions = formData.getAll("permissions").map(String);
      await createOrUpdateRoleUseCase(env, { orgId: user.orgId, actorUserId: user.id, roleId: String(formData.get("roleId") || "") || undefined, name: parsed.data.name, description: parsed.data.description, category: parsed.data.category, permissions });
      return { success: true, intent };
    }
    if (intent === "delete-role") {
      const roleId = String(formData.get("roleId") || "");
      if (!roleId) return { success: false, intent, error: "Rolle fehlt" };
      await deleteRoleUseCase(env, { orgId: user.orgId, actorUserId: user.id, roleId });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : "Speichern fehlgeschlagen" };
  }
  return { success: false, error: "Unbekannte Aktion" };
}

export default SettingsRolesRoute;
