/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation, useNavigate } from "react-router";
import { redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Button, Card, Select, Checkbox, Divider, TextInput, Group, Text } from "@mantine/core";
import { Calendar as CalIcon, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireRouteData } from "@/core/runtime/route";
import { getFirstFieldError } from "@/lib/forms";
import { getMemberFormOptionsUseCase } from "@/modules/members/use-cases/get-member-form-options.use-case";
import { createMemberUseCase } from "@/modules/members/use-cases/create-member.use-case";
import { createMemberFormSchema } from "@/modules/members/schemas/create-member.schema";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  return getMemberFormOptionsUseCase(env, user.orgId);
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const parsed = createMemberFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    mobile: formData.get("mobile"),
    birthDate: formData.get("birthDate"),
    gender: formData.get("gender"),
    street: formData.get("street"),
    zip: formData.get("zip"),
    city: formData.get("city"),
    status: formData.get("status") || "Aktiv",
  });

  if (!parsed.success) return { error: getFirstFieldError(parsed.error.issues) || "Bitte die Eingaben prüfen" };
  if (formData.get("dsgvo") !== "on") return { error: "Die Datenschutzerklärung muss akzeptiert werden" };

  const profileFields = Object.fromEntries(
    Array.from(formData.entries())
      .filter(([key]) => key.startsWith("custom_"))
      .map(([key, value]) => [key.replace(/^custom_/, ""), String(value)]),
  );

  try {
    await createMemberUseCase(env, {
      orgId: user.orgId,
      actorUserId: user.id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      mobile: parsed.data.mobile,
      birthDate: parsed.data.birthDate,
      gender: parsed.data.gender,
      street: parsed.data.street,
      zip: parsed.data.zip,
      city: parsed.data.city,
      status: parsed.data.status === "Aktiv" ? "active" : parsed.data.status === "Inaktiv" ? "inactive" : "pending",
      roleId: String(formData.get("roleId") || "") || undefined,
      groupId: String(formData.get("groupId") || "") || undefined,
      profileFields,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Fehler beim Erstellen" };
  }

  return redirect("/members");
}

export default function MemberCreateRoute() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const { roles, groups, profileFields } = useLoaderData<typeof loader>();
  const [dsgvo, setDsgvo] = useState(false);

  return (
    <div>
      <PageHeader title="Neues Mitglied" />

      <Form method="post">
        <Card shadow="sm" className="bg-popover">
          <div className="p-6 space-y-6">
            <div>
              <Text fw={600} mb="md">Persönliche Daten</Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput name="firstName" label="Vorname *" placeholder="Vorname" required />
                <TextInput name="lastName" label="Nachname *" placeholder="Nachname" required />
                <div className="relative">
                  <TextInput
                    name="birthDate"
                    label="Geburtsdatum"
                    placeholder="TT.MM.JJJJ"
                    rightSection={<CalIcon className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
                <Select
                  name="gender"
                  label="Geschlecht"
                  placeholder="Bitte wählen"
                  data={[
                    { value: "männlich", label: "Männlich" },
                    { value: "weiblich", label: "Weiblich" },
                    { value: "divers", label: "Divers" },
                  ]}
                />
                <div className="md:col-span-2">
                  <Text size="sm" fw={500} mb={4}>Foto</Text>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Foto hierher ziehen oder klicken zum Hochladen</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG (max. 5 MB)</p>
                  </div>
                </div>
              </div>
            </div>

            <Divider />

            <div>
              <Text fw={600} mb="md">Kontaktdaten</Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput name="email" type="email" label="E-Mail *" placeholder="name@example.de" required />
                <TextInput name="phone" label="Telefon" placeholder="z.B. 089 123456" />
                <TextInput name="mobile" label="Mobiltelefon" placeholder="z.B. 0171 1234567" />
                <div />
                <div className="md:col-span-2">
                  <TextInput name="street" label="Straße" placeholder="Straße und Hausnummer" />
                </div>
                <TextInput name="zip" label="PLZ" placeholder="z.B. 80331" />
                <TextInput name="city" label="Ort" placeholder="z.B. München" />
              </div>
            </div>

            <Divider />

            <div>
              <Text fw={600} mb="md">Vereinsdaten</Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <TextInput
                    label="Beitrittsdatum"
                    placeholder="TT.MM.JJJJ"
                    defaultValue="19.03.2026"
                    rightSection={<CalIcon className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
                <Select
                  name="status"
                  label="Status"
                  defaultValue="Aktiv"
                  data={[
                    { value: "Aktiv", label: "Aktiv" },
                    { value: "Inaktiv", label: "Inaktiv" },
                    { value: "Ausstehend", label: "Ausstehend" },
                  ]}
                />
                <Select
                  name="roleId"
                  label="Rolle"
                  placeholder="Bitte wählen"
                  data={roles.map((role) => ({ value: role.id, label: role.name }))}
                />
                <Select
                  name="groupId"
                  label="Mannschaft / Gruppe"
                  placeholder="Bitte wählen"
                  data={groups.map((group) => ({ value: group.id, label: group.name }))}
                />
              </div>
            </div>

            {actionData?.error && (
              <Text c="red" size="sm">{actionData.error}</Text>
            )}

            <Divider />

            <div>
              <Text fw={600} mb="md">Zusatzfelder</Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileFields.map((field) => (
                  <div key={field.id}>
                    {field.type === "text" && (
                      <TextInput name={`custom_${field.name}`} label={field.label} />
                    )}
                    {field.type === "select" && (
                      <Select
                        name={`custom_${field.name}`}
                        label={field.label}
                        placeholder="Bitte wählen"
                        data={field.options.map((option) => ({ value: option, label: option }))}
                      />
                    )}
                    {field.type === "checkbox" && (
                      <Checkbox name={`custom_${field.name}`} label={field.label} mt="sm" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Divider />

            <Checkbox
              name="dsgvo"
              id="dsgvo"
              checked={dsgvo}
              onChange={(event) => setDsgvo(event.currentTarget.checked)}
              required
              label={
                <span className="text-sm leading-tight">
                  Die <span className="text-primary-light hover:underline cursor-pointer">Datenschutzerklärung</span> wurde akzeptiert. *
                </span>
              }
            />

            <Group justify="flex-end" gap="xs" pt="xs">
              <Button type="button" variant="subtle" onClick={() => navigate("/members")}>Abbrechen</Button>
              <Button type="submit" disabled={!dsgvo || navigation.state === "submitting"}>
                {navigation.state === "submitting" ? "Wird angelegt..." : "Mitglied anlegen"}
              </Button>
            </Group>
          </div>
        </Card>
      </Form>
    </div>
  );
}
