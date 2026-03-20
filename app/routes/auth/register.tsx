import { useState } from "react";
import { Link, useActionData, Form } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { Button, Card, TextInput, Select, Checkbox, Text, Group, Anchor } from "@mantine/core";
import { Check } from "lucide-react";
import { getSessionTokens, commitSessionTokens, getEnv } from "@/lib/session";
import { registerFormSchema } from "@/core/schemas/auth";
import { registerOrganizationWithAdmin } from "@/core/auth/auth.service";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  const { user } = await getSessionTokens(request, env.COOKIE_SECRET);
  if (user) return redirect("/");
  return null;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  const formData = await request.formData();
  const parsed = registerFormSchema.safeParse({
    clubName: formData.get("clubName"),
    clubType: formData.get("clubType"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      error:
        fieldErrors.clubName?.[0] ??
        fieldErrors.clubType?.[0] ??
        fieldErrors.firstName?.[0] ??
        fieldErrors.lastName?.[0] ??
        fieldErrors.email?.[0] ??
        fieldErrors.password?.[0] ??
        fieldErrors.passwordConfirm?.[0] ??
        "Registrierung fehlgeschlagen",
    };
  }
  const { clubName, clubType, firstName, lastName, email, password } = parsed.data;

  if (!env.DB) return { error: "DB-Binding fehlt. Bitte die App über Wrangler starten." };

  let data;
  try {
    data = await registerOrganizationWithAdmin(env as Required<Pick<typeof env, "DB">>, {
      org_name: clubName,
      org_type: clubType,
      first_name: firstName,
      last_name: lastName,
      email,
      password,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Registrierung fehlgeschlagen" };
  }

  const cookieHeader = await commitSessionTokens(
    request,
    env.COOKIE_SECRET,
    data,
  );

  return redirect("/dashboard", { headers: { "Set-Cookie": cookieHeader } });
}

const steps = ["Verein", "Admin-Account", "Bestätigung"];

const pwStrengthColor = (pw: string) =>
  pw.length >= 12 ? "green" : pw.length >= 8 ? "yellow" : "red";
const pwStrengthLabel = (pw: string) =>
  pw.length >= 12 ? "Stark" : pw.length >= 8 ? "Mittel" : "Schwach";

export default function Register() {
  const actionData = useActionData<typeof action>();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    clubName: "", clubType: "", website: "",
    firstName: "", lastName: "", email: "", password: "", passwordConfirm: "",
    dsgvo: false,
  });

  const update = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg" shadow="sm" p="xl">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-3">
            <span className="text-primary-foreground font-bold text-lg">CB</span>
          </div>
          <Text size="xl" fw={600}>Verein registrieren</Text>
          <Group justify="center" gap="xs" mt="sm">
            {steps.map((s, i) => (
              <Group key={s} gap="xs">
                <div
                  style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500,
                    background: i < step ? 'var(--mantine-color-green-6)' : i === step ? 'var(--mantine-color-blue-7)' : 'var(--mantine-color-gray-2)',
                    color: i <= step ? 'white' : 'var(--mantine-color-gray-6)',
                  }}
                >
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: 32, height: 2, background: i < step ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-gray-3)' }} />
                )}
              </Group>
            ))}
          </Group>
        </div>

        {step === 0 && (
          <div>
            <TextInput
              label="Vereinsname *"
              placeholder="z.B. TSV Musterstadt"
              value={form.clubName}
              onChange={(e) => update("clubName", e.target.value)}
              mb="sm"
            />
            <Select
              label="Vereinstyp *"
              placeholder="Typ wählen"
              value={form.clubType}
              onChange={(v) => update("clubType", v ?? "")}
              data={[
                { value: "sport", label: "Sportverein" },
                { value: "kultur", label: "Kulturverein" },
                { value: "sonstig", label: "Sonstiger Verein" },
              ]}
              mb="sm"
            />
            <TextInput
              label="Website (optional)"
              placeholder="https://www.verein.de"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              mb="md"
            />
            <Button fullWidth onClick={() => setStep(1)} disabled={!form.clubName || !form.clubType}>
              Weiter
            </Button>
          </div>
        )}

        {step === 1 && (
          <div>
            <Group grow mb="sm">
              <TextInput label="Vorname *" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
              <TextInput label="Nachname *" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
            </Group>
            <TextInput
              label="E-Mail *"
              type="email"
              placeholder="name@verein.de"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              mb="sm"
            />
            <TextInput
              label="Passwort *"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              mb={4}
            />
            {form.password && (
              <Group gap="xs" mb="sm">
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: `var(--mantine-color-${pwStrengthColor(form.password)}-5)` }} />
                <Text size="xs" c="dimmed">{pwStrengthLabel(form.password)}</Text>
              </Group>
            )}
            <TextInput
              label="Passwort bestätigen *"
              type="password"
              value={form.passwordConfirm}
              onChange={(e) => update("passwordConfirm", e.target.value)}
              mb="md"
            />
            <Group grow>
              <Button variant="outline" onClick={() => setStep(0)}>Zurück</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!form.firstName || !form.lastName || !form.email || !form.password || form.password !== form.passwordConfirm}
              >
                Weiter
              </Button>
            </Group>
          </div>
        )}

        {step === 2 && (
          <Form method="post">
            <input type="hidden" name="clubName" value={form.clubName} />
            <input type="hidden" name="clubType" value={form.clubType} />
            <input type="hidden" name="firstName" value={form.firstName} />
            <input type="hidden" name="lastName" value={form.lastName} />
            <input type="hidden" name="email" value={form.email} />
            <input type="hidden" name="password" value={form.password} />
            <input type="hidden" name="passwordConfirm" value={form.passwordConfirm} />

            <Card withBorder mb="md" p="sm">
              <Text size="sm"><Text span c="dimmed">Verein: </Text>{form.clubName}</Text>
              <Text size="sm"><Text span c="dimmed">Typ: </Text>{form.clubType === "sport" ? "Sportverein" : form.clubType === "kultur" ? "Kulturverein" : "Sonstiger"}</Text>
              <Text size="sm"><Text span c="dimmed">Admin: </Text>{form.firstName} {form.lastName}</Text>
              <Text size="sm"><Text span c="dimmed">E-Mail: </Text>{form.email}</Text>
            </Card>

            <Checkbox
              id="dsgvo"
              checked={form.dsgvo}
              onChange={(e) => update("dsgvo", e.currentTarget.checked)}
              label={
                <Text size="sm">
                  Ich akzeptiere die <Anchor href="#">Datenschutzerklärung</Anchor> und die <Anchor href="#">Nutzungsbedingungen</Anchor>.
                </Text>
              }
              mb="sm"
            />
            {actionData?.error && (
              <Text size="sm" c="red" mb="sm" p="xs" style={{ background: 'var(--mantine-color-red-0)', borderRadius: 4 }}>
                {actionData.error}
              </Text>
            )}
            <Group grow>
              <Button variant="outline" type="button" onClick={() => setStep(1)}>Zurück</Button>
              <Button type="submit" disabled={!form.dsgvo}>Verein erstellen</Button>
            </Group>
          </Form>
        )}

        <Text size="sm" ta="center" mt="md" c="dimmed">
          Bereits registriert?{" "}
          <Anchor component={Link} to="/login" fw={500}>Anmelden</Anchor>
        </Text>
      </Card>
    </div>
  );
}
