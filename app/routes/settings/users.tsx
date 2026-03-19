import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createUserFormSchema } from "@/core/schemas/forms";
import { getFirstFieldError } from "@/lib/forms";
import { requireRouteData } from "@/core/runtime/route";
import { createSettingsUserUseCase, getSettingsRolesUseCase, getSettingsUsersUseCase, toggleOrgAdminRoleUseCase } from "@/modules/settings/use-cases/settings.use-cases";
import SettingsUsersRoute from "@/modules/settings/web/SettingsUsersRoute";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const [users, roles] = await Promise.all([
    getSettingsUsersUseCase(env, user.orgId),
    getSettingsRolesUseCase(env, user.orgId),
  ]);
  return { users, roles };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  try {
    if (intent === "create-user") {
      const roleIds = formData.getAll("role_ids").map(String);
      const parsed = createUserFormSchema.safeParse({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        password: formData.get("password"),
        role_ids: roleIds,
      });
      if (!parsed.success) return { success: false, intent, error: getFirstFieldError(parsed.error.issues) || "Bitte die Eingaben prüfen" };
      await createSettingsUserUseCase(env, { orgId: user.orgId, actorUserId: user.id, firstName: parsed.data.firstName, lastName: parsed.data.lastName, email: parsed.data.email, password: parsed.data.password, roleIds: parsed.data.role_ids });
      return { success: true, intent };
    }
    if (intent === "toggle-admin") {
      const targetUserId = String(formData.get("userId") || "");
      if (!targetUserId) return { success: false, intent, error: "Benutzer fehlt" };
      const result = await toggleOrgAdminRoleUseCase(env, { orgId: user.orgId, actorUserId: user.id, targetUserId });
      return { success: true, intent, isAdmin: result.isAdmin };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : "Speichern fehlgeschlagen" };
  }
  return { success: false, error: "Unbekannte Aktion" };
}

export default SettingsUsersRoute;
