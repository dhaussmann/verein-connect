import { Link, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, Badge, Text, Group, Stack } from '@mantine/core';
import { ArrowLeft, Clock, MapPin, Users, Edit } from 'lucide-react';
import type { Event } from '@/lib/api';
import { requireRouteData } from '@/core/runtime/route';
import { getEventDetailUseCase } from '@/modules/events/use-cases/events.use-cases';

const categoryBgClasses: Record<string, string> = {
  Training: 'bg-primary text-primary-foreground',
  Wettkampf: 'bg-destructive text-destructive-foreground',
  Lager: 'bg-success text-success-foreground',
  Workshop: 'bg-warning text-warning-foreground',
  Freizeit: 'bg-primary-light text-primary-foreground',
};

const statusColor: Record<string, string> = {
  Offen: 'green',
  Voll: 'yellow',
  Abgesagt: 'red',
};

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  if (!params.id) throw new Response("Not Found", { status: 404 });
  const event = await getEventDetailUseCase(env, { orgId: user.orgId, eventId: params.id });
  return { event };
}

export default function EventDetailRoute() {
  const { event } = useLoaderData<typeof loader>();

  if (!event) {
    return (
      <Text c="dimmed" ta="center" py="xl">Termin nicht gefunden.</Text>
    );
  }

  const ev = event as Event;

  return (
    <div>
      <PageHeader title="Termin" />
      <Button variant="subtle" mb="md" c="dimmed" component={Link} to="/events" leftSection={<ArrowLeft size={16} />}>
        Zurück zu Termine
      </Button>

      <Card p="lg">
        <Group align="flex-start" justify="space-between" wrap="wrap" gap="md">
          <Stack gap="sm">
            <Group gap="xs" wrap="wrap">
              <Text size="xl" fw={700}>{ev.title}</Text>
              <Badge className={categoryBgClasses[ev.category]}>{ev.category}</Badge>
              <Badge variant="light" color={statusColor[ev.status] || 'gray'}>{ev.status}</Badge>
            </Group>
            <Group gap="lg" wrap="wrap">
              <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={16} />{ev.startDate}, {ev.timeStart}–{ev.timeEnd}
              </Text>
              <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={16} />{ev.location}
              </Text>
              <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={16} />{ev.participants}/{ev.maxParticipants} Teilnehmer
              </Text>
            </Group>
            {ev.description && (
              <Text c="dimmed" mt="xs">{ev.description}</Text>
            )}
          </Stack>
          <Group gap="xs">
            {ev.status === 'Offen' && <Button>Anmelden</Button>}
            <Button variant="outline" leftSection={<Edit size={16} />}>Bearbeiten</Button>
          </Group>
        </Group>
      </Card>
    </div>
  );
}
