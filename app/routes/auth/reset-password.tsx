import { useState } from "react";
import { Anchor, Button, Card, PasswordInput, Text } from "@mantine/core";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Form, Link, useActionData, useSearchParams } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { sendBetterAuthRequest } from "@/core/auth/better-auth.server";
import { getEnv } from "@/core/auth/session.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { success: false, error: "Der Link ist ungültig oder abgelaufen." };
  }

  if (newPassword.length < 8) {
    return { success: false, error: "Passwort muss mindestens 8 Zeichen lang sein." };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "Die Passwörter stimmen nicht überein." };
  }

  const response = await sendBetterAuthRequest(request, env, "/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token,
      newPassword,
    }).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null) as { message?: string } | null;
    return { success: false, error: errorData?.message ?? "Passwort konnte nicht zurückgesetzt werden." };
  }

  return { success: true };
}

export default function ResetPassword() {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const token = searchParams.get("token") ?? "";

  const missingToken = !token;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md" shadow="sm" p="xl">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-3">
            {actionData?.success ? <CheckCircle2 size={24} /> : <KeyRound size={24} />}
          </div>
          <Text size="xl" fw={600}>
            {actionData?.success ? "Passwort aktualisiert" : "Neues Passwort setzen"}
          </Text>
          <Text size="sm" c="dimmed">
            {actionData?.success
              ? "Du kannst dich jetzt mit deinem neuen Passwort anmelden."
              : "Vergib ein neues Passwort für dein Konto."}
          </Text>
        </div>

        {actionData?.success ? (
          <Button component={Link} to="/login" fullWidth>
            Zum Login
          </Button>
        ) : missingToken ? (
          <>
            <Text size="sm" c="red" mb="md">
              Der Link ist ungültig oder abgelaufen.
            </Text>
            <Button component={Link} to="/forgot-password" variant="outline" fullWidth>
              Neuen Link anfordern
            </Button>
          </>
        ) : (
          <Form method="post">
            <input type="hidden" name="token" value={token} />
            <PasswordInput
              id="newPassword"
              name="newPassword"
              label="Neues Passwort"
              required
              mb="sm"
              visible={showPassword}
              onVisibilityChange={setShowPassword}
            />
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              label="Passwort wiederholen"
              required
              mb="sm"
              visible={showConfirmPassword}
              onVisibilityChange={setShowConfirmPassword}
              error={actionData?.success === false ? actionData.error : undefined}
            />
            <Button type="submit" fullWidth mb="sm">
              Passwort speichern
            </Button>
            <Anchor component={Link} to="/login" size="sm" ta="center" display="block">
              Zurück zum Login
            </Anchor>
          </Form>
        )}
      </Card>
    </div>
  );
}
