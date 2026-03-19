import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Text } from "@mantine/core";
import { requireRouteData } from "@/core/runtime/route";
import { GeneralSettingsSection } from "@/modules/settings/web/sections";
import { getOrganizationSettingsUseCase, updateOrganizationSettingsUseCase } from "@/modules/settings/use-cases/settings.use-cases";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const organization = await getOrganizationSettingsUseCase(env, user.orgId);
  if (!organization) throw new Error("Organisation nicht gefunden");
  return { organization };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const name = String(formData.get("name") || "").trim();
  const timezone = String(formData.get("timezone") || "").trim();
  const language = String(formData.get("language") || "").trim();
  const website = String(formData.get("website") || "").trim();
  if (!name) return { success: false, error: "Vereinsname ist erforderlich" };
  if (!timezone) return { success: false, error: "Zeitzone ist erforderlich" };
  if (!language) return { success: false, error: "Sprache ist erforderlich" };
  await updateOrganizationSettingsUseCase(env, { orgId: user.orgId, actorUserId: user.id, name, timezone, language, website });
  return { success: true };
}

export default function SettingsIndexRoute() {
  const { organization } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  return (
    <Form method="post">
      {actionData?.error && <Text c="red" size="sm" mb="sm">{actionData.error}</Text>}
      {actionData?.success && <Text c="green" size="sm" mb="sm">Einstellungen gespeichert.</Text>}
      <fieldset disabled={navigation.state === "submitting"} style={{ border: 0, padding: 0, margin: 0 }}>
        <GeneralSettingsSection organization={organization} />
      </fieldset>
    </Form>
  );
}
