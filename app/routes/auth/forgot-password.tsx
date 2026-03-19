/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { Link, Form, useActionData } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { Button, Card, TextInput, Text, Anchor } from "@mantine/core";
import { ArrowLeft, Mail } from "lucide-react";
import { getEnv } from "@/lib/session";
import { forgotPasswordFormSchema } from "@/core/schemas/auth";
import { requestPasswordReset } from "@/core/auth/auth.service";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  const formData = await request.formData();
  const parsed = forgotPasswordFormSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      sent: false,
      error: parsed.error.flatten().fieldErrors.email?.[0] ?? "Bitte eine gültige E-Mail-Adresse eingeben",
    };
  }

  if (!env.DB || !env.KV || !env.FRONTEND_URL) {
    return {
      sent: false,
      error: "Bindings fehlen. Bitte die App über Wrangler starten.",
    };
  }

  try {
    await requestPasswordReset(
      env as Required<Pick<typeof env, "DB" | "KV" | "FRONTEND_URL">> & Pick<typeof env, "RESEND_API_KEY">,
      parsed.data.email,
    );
  } catch {
    // Always show success to not leak email existence
  }

  return { sent: true };
}

export default function ForgotPassword() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md" shadow="sm" p="xl">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-3">
            <span className="text-primary-foreground font-bold text-lg">CB</span>
          </div>
          <Text size="xl" fw={600}>
            {actionData?.sent ? "E-Mail gesendet" : "Passwort zurücksetzen"}
          </Text>
          <Text size="sm" c="dimmed">
            {actionData?.sent ? "Prüfe dein Postfach für weitere Anweisungen." : "Gib deine E-Mail-Adresse ein."}
          </Text>
        </div>
        {actionData?.sent ? (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <Button component={Link} to="/login" variant="outline" fullWidth leftSection={<ArrowLeft size={16} />}>
              Zurück zum Login
            </Button>
          </div>
        ) : (
          <Form method="post">
            <TextInput
              id="email"
              name="email"
              type="email"
              label="E-Mail"
              placeholder="name@verein.de"
              required
              mb="sm"
              error={actionData?.error}
            />
            <Button type="submit" fullWidth mb="sm">
              Link senden
            </Button>
            <Anchor component={Link} to="/login" size="sm" ta="center" display="block">
              <ArrowLeft size={12} style={{ display: 'inline', marginRight: 4 }} />
              Zurück zum Login
            </Anchor>
          </Form>
        )}
      </Card>
    </div>
  );
}
