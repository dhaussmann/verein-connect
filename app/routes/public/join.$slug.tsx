import { useMemo, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Alert, Badge, Button, Card, Checkbox, Group, Select, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { z } from "zod";
import { getRouteEnv } from "@/core/runtime/route";
import { getFirstFieldError } from "@/lib/forms";
import { getHockeyAgeBand, getSuggestedGroupIdsForAgeBand, isMinorByBirthDate } from "@/modules/hockey/age-band";
import { groupMemberRoleOptions } from "@/modules/hockey/hockey-options";
import { getPublicApplicationFormUseCase, submitPublicApplicationUseCase } from "@/modules/applications/use-cases/applications.use-cases";

const applicationSchema = z.object({
  firstName: z.string().trim().min(1, "Vorname ist erforderlich"),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich"),
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben"),
  phone: z.string().trim().optional().default(""),
  address: z.string().trim().optional().default(""),
  dateOfBirth: z.string().trim().optional().default(""),
  plan: z.string().trim().min(1, "Bitte ein Beitrittsmodell wählen"),
});

export async function loader({ context, params }: LoaderFunctionArgs) {
  const env = getRouteEnv(context);
  if (!env.DB) throw new Error("DB-Binding fehlt");
  const slug = params.slug;
  if (!slug) throw new Error("Vereins-Slug fehlt");
  return getPublicApplicationFormUseCase(env as typeof env & { DB: D1Database }, { orgSlug: slug });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const env = getRouteEnv(context);
  if (!env.DB) return { success: false, error: "DB-Binding fehlt" };
  const slug = params.slug;
  if (!slug) return { success: false, error: "Vereins-Slug fehlt" };

  const formData = await request.formData();
  const parsed = applicationSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    dateOfBirth: formData.get("dateOfBirth"),
    plan: formData.get("plan"),
  });
  if (!parsed.success) {
    return { success: false, error: getFirstFieldError(parsed.error.issues) || "Bitte Eingaben prüfen" };
  }
  if (formData.get("privacy") !== "on") {
    return { success: false, error: "Bitte Datenschutz und Antrag bestätigen" };
  }

  const [planType, planId] = parsed.data.plan.split(":");
  const profileFields = Object.fromEntries(
    Array.from(formData.entries())
      .filter(([key]) => key.startsWith("pf_"))
      .map(([key, value]) => [key.replace(/^pf_/, ""), String(value)]),
  );

  const guardians = [{
    firstName: String(formData.get("guardianFirstName") || ""),
    lastName: String(formData.get("guardianLastName") || ""),
    phone: String(formData.get("guardianPhone") || ""),
    email: String(formData.get("guardianEmail") || ""),
    street: String(formData.get("guardianStreet") || ""),
    zip: String(formData.get("guardianZip") || ""),
    city: String(formData.get("guardianCity") || ""),
  }].filter((guardian) => guardian.firstName || guardian.lastName || guardian.phone || guardian.email || guardian.street || guardian.zip || guardian.city);

  if (isMinorByBirthDate(parsed.data.dateOfBirth)) {
    const primaryGuardian = guardians[0];
    if (!primaryGuardian?.firstName || !primaryGuardian?.lastName || (!primaryGuardian.phone && !primaryGuardian.email)) {
      return {
        success: false,
        error: "Für Minderjährige sind Vorname, Nachname und Telefon oder E-Mail eines Erziehungsberechtigten erforderlich",
      };
    }
  }

  const plan = planType === "membership"
    ? (await getPublicApplicationFormUseCase(env as typeof env & { DB: D1Database }, { orgSlug: slug })).membershipTypes.find((item) => item.id === planId)
    : (await getPublicApplicationFormUseCase(env as typeof env & { DB: D1Database }, { orgSlug: slug })).tarifs.find((item) => item.id === planId);
  const requirements = Array.isArray(plan?.applicationRequirements) ? plan.applicationRequirements : [];
  const selectedGroupIds = formData.getAll("groupIds").map(String).filter(Boolean);
  const sportProfileKeys = ["position", "shoots", "jersey_number", "player_pass_number", "player_pass_status", "medical_clearance_until"];
  const hasSportProfile = sportProfileKeys.some((key) => {
    const value = profileFields[key];
    return typeof value === "string" && value.trim() !== "";
  });
  if (requirements.includes("guardian")) {
    const primaryGuardian = guardians[0];
    if (!primaryGuardian?.firstName || !primaryGuardian?.lastName || (!primaryGuardian.phone && !primaryGuardian.email)) {
      return { success: false, error: "Dieses Beitrittsmodell erfordert vollständige Angaben zu einem Erziehungsberechtigten" };
    }
  }
  if (requirements.includes("group") && selectedGroupIds.length === 0) {
    return { success: false, error: "Dieses Beitrittsmodell erfordert mindestens eine Team- oder Gruppenauswahl" };
  }
  if (requirements.includes("sport_profile") && !hasSportProfile) {
    return { success: false, error: "Dieses Beitrittsmodell erfordert ein ausgefülltes Sportprofil" };
  }
  if (requirements.includes("medical_clearance")) {
    const clearance = profileFields.medical_clearance_until;
    if (!clearance || !String(clearance).trim()) {
      return { success: false, error: "Für dieses Beitrittsmodell ist eine Sportfreigabe / Medical Clearance erforderlich" };
    }
  }

  try {
    await submitPublicApplicationUseCase(env as typeof env & { DB: D1Database }, {
      orgSlug: slug,
      membershipTypeId: planType === "membership" ? planId : null,
      tarifId: planType === "tarif" ? planId : null,
      billingPeriod: String(formData.get("billingPeriod") || "") || null,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      dateOfBirth: parsed.data.dateOfBirth || null,
      additionalData: {
        groupIds: formData.getAll("groupIds").map(String).filter(Boolean),
        groupMemberRole: String(formData.get("groupMemberRole") || "") || "Spieler",
        profileFields,
        guardians,
      },
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Antrag konnte nicht gesendet werden" };
  }

  return { success: true };
}

export default function PublicJoinRoute() {
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const data = useLoaderData<typeof loader>();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [groupMemberRole, setGroupMemberRole] = useState("Spieler");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const planOptions = useMemo(() => [
    ...data.membershipTypes.map((item) => ({ value: `membership:${item.id}`, label: `${item.name} · Mitgliedschaft` })),
    ...data.tarifs.map((item) => ({ value: `tarif:${item.id}`, label: `${item.name} · Tarif` })),
  ], [data.membershipTypes, data.tarifs]);

  const selectedPlanItem = useMemo(() => {
    if (!selectedPlan) return null;
    const [type, id] = selectedPlan.split(":");
    return type === "membership"
      ? data.membershipTypes.find((item) => item.id === id)
      : data.tarifs.find((item) => item.id === id);
  }, [data.membershipTypes, data.tarifs, selectedPlan]);
  const minor = useMemo(() => isMinorByBirthDate(dateOfBirth), [dateOfBirth]);
  const suggestedAgeBand = useMemo(() => getHockeyAgeBand(dateOfBirth), [dateOfBirth]);
  const planRequirements = Array.isArray(selectedPlanItem?.applicationRequirements)
    ? selectedPlanItem.applicationRequirements
    : [];
  const suggestedGroupIds = useMemo(
    () => getSuggestedGroupIdsForAgeBand(data.groups, suggestedAgeBand),
    [data.groups, suggestedAgeBand],
  );

  if (actionData?.success) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Card shadow="sm" p="xl">
            <Stack gap="md">
              <Badge w="fit-content" color="green">Antrag eingegangen</Badge>
              <Text size="xl" fw={700}>Danke für deinen Beitrittsantrag bei {data.organization.name}</Text>
              <Text c="dimmed">
                {data.settings?.confirmationPageText || "Wir prüfen deine Angaben und melden uns nach der internen Freigabe mit den nächsten Schritten."}
              </Text>
            </Stack>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <Stack gap="lg">
          <div>
            <Badge mb="sm" variant="outline">Beitrittsantrag</Badge>
            <Text size="2rem" fw={800}>{data.organization.name}</Text>
            <Text c="dimmed">
              {data.settings?.welcomePageText || "Bitte fülle den Antrag vollständig aus. Sportprofil, Teamwunsch und Notfallangaben helfen uns bei der schnellen Einordnung."}
            </Text>
          </div>

          {data.settings?.selfRegistrationEnabled !== 1 && (
            <Alert color="yellow" title="Selbstregistrierung ist deaktiviert">
              Dieses Formular ist aktuell nicht freigeschaltet.
            </Alert>
          )}

          <Form method="post">
            <Stack gap="lg">
              <Card shadow="sm" p="lg">
                <Text fw={600} mb="md">Beitrittsmodell</Text>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Mitgliedschaft / Tarif *"
                    name="plan"
                    value={selectedPlan}
                    onChange={setSelectedPlan}
                    data={planOptions}
                    placeholder="Bitte wählen"
                    required
                  />
                  <Select
                    label="Abrechnungszeitraum"
                    name="billingPeriod"
                    defaultValue="MONTHLY"
                    data={[
                      { value: "MONTHLY", label: "Monatlich" },
                      { value: "QUARTERLY", label: "Quartalsweise" },
                      { value: "HALF_YEARLY", label: "Halbjährlich" },
                      { value: "YEARLY", label: "Jährlich" },
                    ]}
                  />
                </div>
                {selectedPlanItem && (
                  <>
                    <Text size="sm" c="dimmed" mt="sm">
                      {selectedPlanItem.shortDescription || selectedPlanItem.description || "Bitte später im Antrag das gewünschte Team und Hockey-Profil ergänzen."}
                    </Text>
                    {planRequirements.length > 0 && (
                      <Group gap="xs" mt="sm">
                        {planRequirements.map((requirement) => (
                          <Badge key={requirement} variant="outline" color="orange">
                            Pflicht: {requirement}
                          </Badge>
                        ))}
                      </Group>
                    )}
                  </>
                )}
              </Card>

              <Card shadow="sm" p="lg">
                <Text fw={600} mb="md">Persönliche Daten</Text>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput name="firstName" label="Vorname *" required />
                  <TextInput name="lastName" label="Nachname *" required />
                  <TextInput name="email" type="email" label="E-Mail *" required />
                  <TextInput name="phone" label="Telefon / Mobil" />
                  <TextInput name="dateOfBirth" type="date" label="Geburtsdatum" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
                  <div />
                  <Textarea name="address" label="Adresse" className="md:col-span-2" minRows={2} />
                </div>
                {minor && (
                  <Alert color="blue" mt="md" title="Minderjähriger Antrag">
                    Für Mitglieder unter 18 Jahren sind Angaben zu einem Erziehungsberechtigten erforderlich.
                  </Alert>
                )}
              </Card>

              <Card shadow="sm" p="lg">
                <Text fw={600} mb="md">Teamwunsch & Sportprofil</Text>
                {suggestedAgeBand && (
                  <Alert color="blue" mb="md" title="Altersklasse erkannt">
                    Basierend auf dem Geburtsdatum wurde {suggestedAgeBand} erkannt.
                    {suggestedGroupIds.length > 0 ? " Passende Nachwuchsgruppen sind bereits vorausgewählt." : " Es wurde noch keine exakt passende öffentliche Gruppe gefunden."}
                  </Alert>
                )}
                {planRequirements.includes("group") && (
                  <Alert color="orange" mb="md" title="Teamwahl erforderlich">
                    Für das gewählte Beitrittsmodell muss mindestens eine passende Gruppe ausgewählt werden.
                  </Alert>
                )}
                <Stack gap="sm">
                  {data.groups.map((group) => (
                    <Checkbox
                      key={group.id}
                      name="groupIds"
                      value={group.id}
                      defaultChecked={suggestedGroupIds.includes(group.id)}
                      label={[group.name, group.ageBand, group.season].filter(Boolean).join(" · ")}
                      description={[group.league, group.location].filter(Boolean).join(" · ") || undefined}
                    />
                  ))}
                </Stack>
                <div className="mt-4 max-w-sm">
                  <Select
                    name="groupMemberRole"
                    label="Funktion im Team"
                    value={groupMemberRole}
                    onChange={(value) => setGroupMemberRole(value ?? "Spieler")}
                    data={groupMemberRoleOptions}
                  />
                </div>
                {data.profileFields.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {data.profileFields.map((field) => (
                      <div key={field.id}>
                        {field.type === "text" && (
                          <TextInput name={`pf_${field.name}`} label={field.label} required={field.required} />
                        )}
                        {field.type === "select" && (
                          <Select
                            name={`pf_${field.name}`}
                            label={field.label}
                            data={field.options.map((option: string) => ({ value: option, label: option }))}
                            required={field.required}
                          />
                        )}
                        {field.type === "checkbox" && (
                          <Checkbox name={`pf_${field.name}`} label={field.label} mt="sm" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {planRequirements.includes("sport_profile") && (
                  <Text size="sm" c="dimmed" mt="sm">
                    Für dieses Modell muss mindestens ein Sportprofil-Feld wie Position, Schusshand, Rückennummer oder Spielerpass ausgefüllt werden.
                  </Text>
                )}
                {planRequirements.includes("medical_clearance") && (
                  <Text size="sm" c="dimmed" mt="sm">
                    Für dieses Modell ist das Feld "Sportfreigabe gültig bis" erforderlich.
                  </Text>
                )}
              </Card>

              <Card shadow="sm" p="lg">
                <Group justify="space-between" mb="md">
                  <Text fw={600}>Erziehungsberechtigte / Vertragspartner</Text>
                  {minor && <Badge color="blue">Pflicht bei U18</Badge>}
                </Group>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput name="guardianFirstName" label={minor ? "Vorname *" : "Vorname"} required={minor} />
                  <TextInput name="guardianLastName" label={minor ? "Nachname *" : "Nachname"} required={minor} />
                  <TextInput name="guardianEmail" label="E-Mail" />
                  <TextInput name="guardianPhone" label={minor ? "Telefon *" : "Telefon"} />
                  <TextInput name="guardianStreet" label="Straße" />
                  <TextInput name="guardianZip" label="PLZ" />
                  <TextInput name="guardianCity" label="Ort" className="md:col-span-2" />
                </div>
                {planRequirements.includes("guardian") && (
                  <Text size="sm" c="dimmed" mt="sm">
                    Dieses Modell verlangt die Kontaktdaten eines Erziehungsberechtigten oder Vertragspartners.
                  </Text>
                )}
              </Card>

              {actionData?.error && (
                <Alert color="red" title="Antrag konnte nicht gesendet werden">
                  {actionData.error}
                </Alert>
              )}

              <Card shadow="sm" p="lg">
                <Stack gap="md">
                  <Checkbox
                    name="privacy"
                    label="Ich bestätige die Richtigkeit meiner Angaben und akzeptiere die Datenschutzverarbeitung."
                    required
                  />
                  <Group justify="flex-end">
                    <Button type="submit" disabled={navigation.state === "submitting" || data.settings?.selfRegistrationEnabled !== 1}>
                      {navigation.state === "submitting" ? "Wird gesendet..." : "Beitrittsantrag senden"}
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Stack>
          </Form>
        </Stack>
      </div>
    </div>
  );
}
