import { useLoaderData, useNavigate, type LoaderFunctionArgs } from 'react-router';
import {
  Title,
  Text,
  Paper,
  Group,
  Button,
  Badge,
  Avatar,
  Tabs,
  Stack,
  Grid,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { requireAuth } from '~/core/auth/auth.server';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { users } from '~/core/db/schema';

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request, context.cloudflare.env as any);
  const db = drizzle(context.cloudflare.env.DB);

  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, params.id!), eq(users.orgId, user.orgId)));

  if (!member) {
    throw new Response('Mitglied nicht gefunden', { status: 404 });
  }

  return { member };
}

export default function MemberDetailPage() {
  const { member } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <>
      <Group mb="lg">
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/members')}>
          Zurück
        </Button>
      </Group>

      <Paper withBorder p="lg" radius="md" mb="md">
        <Group>
          <Avatar size="xl" color="blue">
            {member.firstName?.[0]}{member.lastName?.[0]}
          </Avatar>
          <div>
            <Title order={3}>{member.firstName} {member.lastName}</Title>
            <Text c="dimmed">{member.email}</Text>
            <Badge color={member.status === 'active' ? 'green' : 'gray'} variant="light" mt="xs">
              {member.status === 'active' ? 'Aktiv' : member.status}
            </Badge>
          </div>
        </Group>
      </Paper>

      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Übersicht</Tabs.Tab>
          <Tabs.Tab value="contact">Kontakt</Tabs.Tab>
          <Tabs.Tab value="courses">Kurse</Tabs.Tab>
          <Tabs.Tab value="contracts">Verträge</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Grid>
            <Grid.Col span={6}>
              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">Mitgliedsnummer</Text>
                  <Text>{member.memberNumber || '–'}</Text>
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={6}>
              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">Beitrittsdatum</Text>
                  <Text>{member.joinDate || '–'}</Text>
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={6}>
              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">Geburtsdatum</Text>
                  <Text>{member.birthDate || '–'}</Text>
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={6}>
              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">Geschlecht</Text>
                  <Text>{member.gender || '–'}</Text>
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="contact" pt="md">
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Group>
                <Text size="sm" c="dimmed" w={120}>Telefon:</Text>
                <Text size="sm">{member.phone || '–'}</Text>
              </Group>
              <Group>
                <Text size="sm" c="dimmed" w={120}>Mobil:</Text>
                <Text size="sm">{member.mobile || '–'}</Text>
              </Group>
              <Group>
                <Text size="sm" c="dimmed" w={120}>Straße:</Text>
                <Text size="sm">{member.street || '–'}</Text>
              </Group>
              <Group>
                <Text size="sm" c="dimmed" w={120}>PLZ / Ort:</Text>
                <Text size="sm">{member.zip || '–'} {member.city || ''}</Text>
              </Group>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="courses" pt="md">
          <Text c="dimmed">Kursübersicht wird hier angezeigt.</Text>
        </Tabs.Panel>

        <Tabs.Panel value="contracts" pt="md">
          <Text c="dimmed">Vertragsübersicht wird hier angezeigt.</Text>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
