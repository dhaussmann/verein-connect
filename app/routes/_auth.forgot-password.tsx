import { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  Anchor,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { authClient } from '~/core/auth/auth.client';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    initialValues: { email: '' },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Ungültige E-Mail-Adresse'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    try {
      await authClient.requestPasswordReset({ email: values.email, redirectTo: '/reset-password' });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper radius="md" p="xl" withBorder shadow="md">
      <Title order={2} ta="center" mb="md">
        Passwort zurücksetzen
      </Title>

      {success ? (
        <Alert icon={<IconCheck size={16} />} color="green">
          Falls die E-Mail-Adresse existiert, wurde eine Nachricht zum Zurücksetzen gesendet.
        </Alert>
      ) : (
        <>
          <Text c="dimmed" size="sm" ta="center" mb="lg">
            Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
          </Text>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
              {error}
            </Alert>
          )}

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <TextInput
                label="E-Mail"
                placeholder="deine@email.de"
                required
                {...form.getInputProps('email')}
              />
              <Button type="submit" fullWidth loading={loading}>
                Link senden
              </Button>
            </Stack>
          </form>
        </>
      )}

      <Text ta="center" mt="md" size="sm">
        <Anchor component="a" href="/login" size="sm">
          Zurück zum Login
        </Anchor>
      </Text>
    </Paper>
  );
}
