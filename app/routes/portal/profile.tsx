import { useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireRouteData } from "@/core/runtime/route";
import { getPortalProfileUseCase, updatePortalProfileUseCase } from "@/modules/portal/use-cases/portal.use-cases";
import MyProfilePage from "@/modules/portal/web/MyProfilePage";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const profile = await getPortalProfileUseCase(env, user.id);
  return { profile };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  try {
    if (intent === "save-profile") {
      await updatePortalProfileUseCase(env, {
        orgId: user.orgId,
        userId: user.id,
        phone: String(formData.get("phone") || ""),
        mobile: String(formData.get("mobile") || ""),
        street: String(formData.get("street") || ""),
        zip: String(formData.get("zip") || ""),
        city: String(formData.get("city") || ""),
      });
      return { success: true, intent };
    }
    if (intent === "change-password") {
      const newPassword = String(formData.get("new_password") || "");
      const confirmPassword = String(formData.get("confirm_password") || "");
      if (newPassword !== confirmPassword) {
        return { success: false, intent, error: "Passwörter stimmen nicht überein" };
      }
      await updatePortalProfileUseCase(env, {
        orgId: user.orgId,
        userId: user.id,
        currentPassword: String(formData.get("current_password") || ""),
        newPassword,
      });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : "Speichern fehlgeschlagen" };
  }

  return { success: false, error: "Unbekannte Aktion" };
}

export default function PortalProfileRoute() {
  const { profile } = useLoaderData<typeof loader>();
  return (
    <MyProfilePage
      profile={profile}
      actionData={useActionData<typeof action>()}
      navigationState={useNavigation().state}
    />
  );
}
