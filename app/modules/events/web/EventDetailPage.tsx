import { useNavigate } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, Badge, Text, Group, Stack } from '@mantine/core';
import { ArrowLeft, Clock, MapPin, Users, Edit } from 'lucide-react';
import type { Event } from '@/lib/api';

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

export default function EventDetail({ event }: { event: Event | null }) {
  const navigate = useNavigate();
  if (!event) {
    return (
      <Text c="dimmed" ta="center" py="xl">Termin nicht gefunden.</Text>
    );
  }

  return (
    <div>
      <PageHeader title="Termin" />
      <Button variant="subtle" mb="md" c="dimmed" onClick={() => navigate('/events')} leftSection={<ArrowLeft size={16} />}>
        Zurück zu Termine
      </Button>

      <Card p="lg">
        <Group align="flex-start" justify="space-between" wrap="wrap" gap="md">
          <Stack gap="sm">
            <Group gap="xs" wrap="wrap">
              <Text size="xl" fw={700}>{event.title}</Text>
              <Badge className={categoryBgClasses[event.category]}>{event.category}</Badge>
              <Badge variant="light" color={statusColor[event.status] || 'gray'}>{event.status}</Badge>
            </Group>
            <Group gap="lg" wrap="wrap">
              <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={16} />{event.startDate}, {event.timeStart}–{event.timeEnd}
              </Text>
              <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={16} />{event.location}
              </Text>
              <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={16} />{event.participants}/{event.maxParticipants} Teilnehmer
              </Text>
            </Group>
            {event.description && (
              <Text c="dimmed" mt="xs">{event.description}</Text>
            )}
          </Stack>
          <Group gap="xs">
            {event.status === 'Offen' && <Button>Anmelden</Button>}
            <Button variant="outline" leftSection={<Edit size={16} />}>Bearbeiten</Button>
          </Group>
        </Group>
      </Card>
    </div>
  );
}
