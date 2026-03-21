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
  Select,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { signUp } from '~/core/auth/auth.client';
import { getSessionUser } from '~/core/auth/auth.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getSessionUser(request, context.cloudflare.env as any);
  if (user) return redirect('/');
  return null;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      orgName: '',
      orgType: 'sport',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
    validate: {
      orgName: (v) => (v.length >= 2 ? null : 'Vereinsname muss mindestens 2 Zeichen lang sein'),
      firstName: (v) => (v.length >= 1 ? null : 'Vorname ist erforderlich'),
      lastName: (v) => (v.length >= 1 ? null : 'Nachname ist erforderlich'),
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Ungültige E-Mail-Adresse'),
      password: (v) => (v.length >= 8 ? null : 'Passwort muss mindestens 8 Zeichen lang sein'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signUp.email({
        email: values.email,
        password: values.password,
        name: `${values.firstName} ${values.lastName}`,
      });
      if (result.error) {
        setError(result.error.message || 'Registrierung fehlgeschlagen');
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
        Verein registrieren
      </Title>
      <Text c="dimmed" size="sm" ta="center" mb="lg">
        Erstelle deinen Vereins-Account
      </Text>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          {error}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Vereinsname"
            placeholder="Mein Sportverein e.V."
            required
            {...form.getInputProps('orgName')}
          />
          <Select
            label="Vereinstyp"
            data={[
              { value: 'sport', label: 'Sportverein' },
              { value: 'music', label: 'Musikverein' },
              { value: 'culture', label: 'Kulturverein' },
              { value: 'other', label: 'Sonstiger Verein' },
            ]}
            {...form.getInputProps('orgType')}
          />
          <TextInput
            label="Vorname"
            placeholder="Max"
            required
            {...form.getInputProps('firstName')}
          />
          <TextInput
            label="Nachname"
            placeholder="Mustermann"
            required
            {...form.getInputProps('lastName')}
          />
          <TextInput
            label="E-Mail"
            placeholder="deine@email.de"
            required
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Passwort"
            placeholder="Mindestens 8 Zeichen"
            required
            {...form.getInputProps('password')}
          />
          <Button type="submit" fullWidth loading={loading}>
            Registrieren
          </Button>
        </Stack>
      </form>

      <Text ta="center" mt="md" size="sm">
        Bereits registriert?{' '}
        <Anchor component="a" href="/login" size="sm">
          Anmelden
        </Anchor>
      </Text>
    </Paper>
  );
}
