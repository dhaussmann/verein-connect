import { useNavigate, type ActionFunctionArgs } from 'react-router';
import { redirect } from 'react-router';
import { useState } from 'react';
import {
  Title,
  Paper,
  TextInput,
  Select,
  Button,
  Stack,
  Group,
  Grid,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconArrowLeft, IconAlertCircle } from '@tabler/icons-react';
import { requireAuth } from '~/core/auth/auth.server';
import { drizzle } from 'drizzle-orm/d1';
import { users } from '~/core/db/schema';

export async function action({ request, context }: ActionFunctionArgs) {
  const user = await requireAuth(request, context.cloudflare.env as any);
  const db = drizzle(context.cloudflare.env.DB);
  const formData = await request.formData();

  await db.insert(users).values({
    orgId: user.orgId,
    email: formData.get('email') as string,
    firstName: formData.get('firstName') as string,
    lastName: formData.get('lastName') as string,
    phone: (formData.get('phone') as string) || null,
    mobile: (formData.get('mobile') as string) || null,
    birthDate: (formData.get('birthDate') as string) || null,
    gender: (formData.get('gender') as string) || null,
    street: (formData.get('street') as string) || null,
    zip: (formData.get('zip') as string) || null,
    city: (formData.get('city') as string) || null,
    status: 'active',
  });

  return redirect('/members');
}

export default function MemberNewPage() {
  const navigate = useNavigate();

  return (
    <>
      <Group mb="lg">
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/members')}>
          Zurück
        </Button>
        <Title order={2}>Neues Mitglied</Title>
      </Group>

      <Paper withBorder p="lg" radius="md">
        <form method="post">
          <Stack>
            <Grid>
              <Grid.Col span={6}>
                <TextInput label="Vorname" name="firstName" required />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput label="Nachname" name="lastName" required />
              </Grid.Col>
            </Grid>
            <TextInput label="E-Mail" name="email" type="email" required />
            <Grid>
              <Grid.Col span={6}>
                <TextInput label="Telefon" name="phone" />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput label="Mobil" name="mobile" />
              </Grid.Col>
            </Grid>
            <Grid>
              <Grid.Col span={4}>
                <TextInput label="Geburtsdatum" name="birthDate" type="date" />
              </Grid.Col>
              <Grid.Col span={4}>
                <Select
                  label="Geschlecht"
                  name="gender"
                  data={[
                    { value: 'male', label: 'Männlich' },
                    { value: 'female', label: 'Weiblich' },
                    { value: 'diverse', label: 'Divers' },
                  ]}
                />
              </Grid.Col>
            </Grid>
            <TextInput label="Straße" name="street" />
            <Grid>
              <Grid.Col span={4}>
                <TextInput label="PLZ" name="zip" />
              </Grid.Col>
              <Grid.Col span={8}>
                <TextInput label="Ort" name="city" />
              </Grid.Col>
            </Grid>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => navigate('/members')}>
                Abbrechen
              </Button>
              <Button type="submit">Mitglied anlegen</Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </>
  );
}
