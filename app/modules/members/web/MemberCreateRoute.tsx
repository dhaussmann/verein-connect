import { useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation, useNavigate } from "react-router";
import { Button, Card, Select, Checkbox, Divider, TextInput, Group, Text } from "@mantine/core";
import { Calendar as CalIcon, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import type { MemberCreateLoaderData, MemberRouteActionData } from "../types/member.types";

export default function MemberCreateRoute() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const actionData = useActionData<MemberRouteActionData>();
  const { roles, groups, profileFields } = useLoaderData<MemberCreateLoaderData>();
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
