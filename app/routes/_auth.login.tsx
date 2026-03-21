import { useState } from 'react';
import { useNavigate, type LoaderFunctionArgs } from 'react-router';
import { redirect } from 'react-router';
import {
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Anchor,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { signIn } from '~/core/auth/auth.client';
import { getSessionUser } from '~/core/auth/auth.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getSessionUser(request, context.cloudflare.env as any);
  if (user) return redirect('/');
  return null;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Ungültige E-Mail-Adresse'),
      password: (v) => (v.length >= 1 ? null : 'Passwort ist erforderlich'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signIn.email({
        email: values.email,
        password: values.password,
      });
      if (result.error) {
        setError(result.error.message || 'Ungültige Anmeldedaten');
      } else {
        navigate('/');
      }
    } catch (e: any) {
      setError(e.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper radius="md" p="xl" withBorder shadow="md">
      <Title order={2} ta="center" mb="md">
        Willkommen zurück
      </Title>
      <Text c="dimmed" size="sm" ta="center" mb="lg">
        Melde dich bei deinem Verein an
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
          <PasswordInput
            label="Passwort"
            placeholder="Dein Passwort"
            required
            {...form.getInputProps('password')}
          />
          <Button type="submit" fullWidth loading={loading}>
            Anmelden
          </Button>
        </Stack>
      </form>

      <Text ta="center" mt="md" size="sm">
        Noch kein Konto?{' '}
        <Anchor component="a" href="/register" size="sm">
          Verein registrieren
        </Anchor>
      </Text>
      <Text ta="center" mt="xs" size="sm">
        <Anchor component="a" href="/forgot-password" size="sm">
          Passwort vergessen?
        </Anchor>
      </Text>
    </Paper>
  );
}
