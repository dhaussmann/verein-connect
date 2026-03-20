import { useState } from "react";
import { Link, useActionData, Form } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { Button, Card, TextInput, Text, Anchor } from "@mantine/core";
import { Eye, EyeOff } from "lucide-react";
import { getAuthenticatedHomePath, requireAnonymous } from "@/lib/auth.server";
import { getSessionUserById } from "@/core/auth/auth.service";
import { sendBetterAuthRequest } from "@/lib/better-auth.server";
import { getEnv } from "@/lib/session.server";
import { loginFormSchema } from "@/core/schemas/auth";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  const anonymousState = await requireAnonymous(request, env);
  if (anonymousState.clearedSession) {
    return Response.json(null, {
      headers: anonymousState.headers,
    });
  }

  return null;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  const formData = await request.formData();
  const parsed = loginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.email?.[0] ?? parsed.error.flatten().fieldErrors.password?.[0] ?? "E-Mail und Passwort erforderlich" };
  }
  const { email, password } = parsed.data;

  if (!env.DB) return { error: "DB-Binding fehlt. Bitte die App über Wrangler starten." };

  const authResponse = await sendBetterAuthRequest(request, env, "/sign-in/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      rememberMe: true,
    }),
  });

  if (!authResponse.ok) {
    const errorData = await authResponse.json().catch(() => null) as { message?: string } | null;
    return { error: errorData?.message ?? "Login fehlgeschlagen" };
  }

  const authData = await authResponse.json() as { user?: { id: string } };
  const cookieHeader = authResponse.headers.get("set-cookie");
  if (!authData.user?.id || !cookieHeader) {
    return { error: "Session konnte nicht erstellt werden" };
  }

  const user = await getSessionUserById(
    env as Required<Pick<typeof env, "DB">>,
    authData.user.id,
  );
  if (!user) {
    return { error: "Benutzer konnte nicht geladen werden" };
  }

  return redirect(getAuthenticatedHomePath(user), {
    headers: { "Set-Cookie": cookieHeader },
  });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md" shadow="sm" p="xl">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-3">
            <span className="text-primary-foreground font-bold text-lg">CB</span>
          </div>
          <Text size="xl" fw={600}>Willkommen zurück</Text>
          <Text size="sm" c="dimmed">Melde dich im Vereinsportal an</Text>
        </div>
        <Form method="post">
          <TextInput
            id="email"
            name="email"
            type="email"
            label="E-Mail"
            placeholder="name@verein.de"
            required
            mb="sm"
          />
          <TextInput
            id="password"
            name="password"
            type={showPw ? "text" : "password"}
            label="Passwort"
            placeholder="••••••••"
            required
            mb={4}
            rightSection={
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <Anchor component={Link} to="/forgot-password" size="sm" mb="md" display="block">
            Passwort vergessen?
          </Anchor>
          {actionData?.error && (
            <Text size="sm" c="red" mb="sm" p="xs" style={{ background: 'var(--mantine-color-red-0)', borderRadius: 4 }}>
              {actionData.error}
            </Text>
          )}
          <Button type="submit" fullWidth>
            Anmelden
          </Button>
        </Form>
        <Text size="sm" ta="center" mt="md" c="dimmed">
          Zugänge werden intern durch die Vereinsverwaltung angelegt.
        </Text>
      </Card>
    </div>
  );
}
