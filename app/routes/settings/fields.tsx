import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { requireRouteData } from "@/core/runtime/route";
import { createOrUpdateProfileFieldUseCase, deleteProfileFieldUseCase, getSettingsProfileFieldsUseCase } from "@/modules/settings/use-cases/settings.use-cases";
import SettingsFieldsRoute from "@/modules/settings/web/SettingsFieldsRoute";

const fieldSchema = z.object({
  name: z.string().trim().min(1, "Interner Name ist erforderlich"),
  label: z.string().trim().min(1, "Anzeigename ist erforderlich"),
  type: z.enum(["text", "number", "date", "select", "checkbox", "url"]),
  gdprRetentionDays: z.coerce.number().min(0, "DSGVO-Tage müssen 0 oder größer sein"),
});

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const fields = await getSettingsProfileFieldsUseCase(env, user.orgId);
  return { fields };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  try {
    if (intent === "save-field") {
      const parsed = fieldSchema.safeParse({
        name: formData.get("name"),
        label: formData.get("label"),
        type: formData.get("type"),
        gdprRetentionDays: formData.get("gdprRetentionDays"),
      });
      if (!parsed.success) return { success: false, intent, error: parsed.error.issues[0]?.message || "Bitte Eingaben prüfen" };
      await createOrUpdateProfileFieldUseCase(env, { orgId: user.orgId, actorUserId: user.id, fieldId: String(formData.get("fieldId") || "") || undefined, name: parsed.data.name, label: parsed.data.label, type: parsed.data.type, required: formData.get("required") === "on", searchable: formData.get("searchable") === "on", visibleRegistration: formData.get("visibleRegistration") === "on", gdprRetentionDays: parsed.data.gdprRetentionDays });
      return { success: true, intent };
    }
    if (intent === "delete-field") {
      const fieldId = String(formData.get("fieldId") || "");
      if (!fieldId) return { success: false, intent, error: "Feld fehlt" };
      await deleteProfileFieldUseCase(env, { orgId: user.orgId, actorUserId: user.id, fieldId });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : "Speichern fehlgeschlagen" };
  }
  return { success: false, error: "Unbekannte Aktion" };
}

export default SettingsFieldsRoute;
