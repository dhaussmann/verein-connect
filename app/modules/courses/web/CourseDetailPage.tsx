import { useNavigate } from 'react-router';
import { useState } from 'react';
import { Button, Badge, Card, Avatar, Tabs, Menu, ActionIcon, Group, Stack, Text } from '@mantine/core';
import { ArrowLeft, Clock, MapPin, Users, Euro, Edit, MoreHorizontal, UserPlus } from 'lucide-react';
import type { Event } from '@/modules/courses/types/courses.types';

const categoryColor: Record<string, string> = {
  Training: 'blue',
  Wettkampf: 'red',
  Lager: 'green',
  Workshop: 'yellow',
  Freizeit: 'indigo',
};

const statusColor: Record<string, string> = {
  Aktiv: 'green',
  Entwurf: 'gray',
  Abgeschlossen: 'blue',
  Abgesagt: 'red',
};

const participantStatusColor: Record<string, string> = {
  Angemeldet: 'green',
  Warteliste: 'yellow',
  Abgesagt: 'red',
};

export default function CourseDetail({ course }: { course: Event | null }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('info');

  if (!course) {
    return <div className="text-center py-12 text-muted-foreground">Kurs nicht gefunden.</div>;
  }

  const pct = course.maxParticipants > 0 ? Math.round((course.participants / course.maxParticipants) * 100) : 0;
  const isFull = pct >= 100;

  return (
    <div>
      <Button variant="subtle" mb="md" leftSection={<ArrowLeft size={16} />} onClick={() => navigate('/courses')}>
        Zurück zu Kurse
      </Button>

      {/* Hero */}
      <Card withBorder mb="lg">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <Stack gap="xs">
            <Group gap="xs" wrap="wrap">
              <Text size="xl" fw={700}>{course.title}</Text>
              <Badge color={categoryColor[course.category] ?? 'blue'}>{course.category}</Badge>
              <Badge variant="outline" color={statusColor[course.status] ?? 'gray'}>{course.status}</Badge>
            </Group>
            <Group gap="xs">
              <Avatar radius="xl" size="sm">{course.instructorInitials}</Avatar>
              <div>
                <Text size="sm" fw={500}>{course.instructorName}</Text>
                <Text size="xs" c="dimmed">Kursleiter</Text>
              </div>
            </Group>
            <Group gap="md" wrap="wrap">
              <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={16} />{course.schedule}
              </Text>
              <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={16} />{course.location}
              </Text>
              <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={16} />{course.participants}/{course.maxParticipants}
              </Text>
              {course.price && (
                <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Euro size={16} />{course.price},00 €
                </Text>
              )}
            </Group>
          </Stack>
          <Group gap="xs" wrap="wrap">
            {isFull ? (
              <Button variant="outline" color="yellow" leftSection={<UserPlus size={16} />}>Auf Warteliste</Button>
            ) : (
              <Button leftSection={<UserPlus size={16} />}>Anmelden</Button>
            )}
            <Button variant="outline" leftSection={<Edit size={16} />}>Bearbeiten</Button>
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="outline"><MoreHorizontal size={16} /></ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item>Kurs duplizieren</Menu.Item>
                <Menu.Item color="red">Kurs absagen</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onChange={(val) => setTab(val ?? 'info')}>
        <Tabs.List mb="md">
          <Tabs.Tab value="info">Info</Tabs.Tab>
          <Tabs.Tab value="participants">Teilnehmer</Tabs.Tab>
          <Tabs.Tab value="attendance">Anwesenheit</Tabs.Tab>
          <Tabs.Tab value="stats">Statistiken</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="info" pt="xs">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card withBorder className="lg:col-span-2">
              <Text fw={600} mb="xs">Beschreibung</Text>
              <Text c="dimmed" style={{ lineHeight: 1.7 }}>{course.description}</Text>
            </Card>
            <Card withBorder>
              <Text fw={600} mb="xs">Details</Text>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Beginn</Text>
                  <Text size="sm" fw={500}>{course.startDate}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Ende</Text>
                  <Text size="sm" fw={500}>{course.endDate}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Ort</Text>
                  <Text size="sm" fw={500}>{course.location}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Öffentlich</Text>
                  <Text size="sm" fw={500}>{course.isPublic ? 'Ja' : 'Nein'}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Auto-Rechnung</Text>
                  <Text size="sm" fw={500}>{course.autoInvoice ? 'Ja' : 'Nein'}</Text>
                </Group>
                {course.weekdays && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Tage</Text>
                    <Text size="sm" fw={500}>{course.weekdays.join(', ')}</Text>
                  </Group>
                )}
              </Stack>
            </Card>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="participants" pt="xs">
          <Card withBorder>
            <Text fw={600} mb="xs">Teilnehmer</Text>
            <Text c="dimmed" size="sm" ta="center" py="xl">Teilnehmerdaten werden über die Anmeldungen verwaltet.</Text>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="attendance" pt="xs">
          <Card withBorder>
            <Text fw={600} mb="xs">Anwesenheitsmatrix</Text>
            <Text c="dimmed" size="sm" ta="center" py="xl">Anwesenheitsdaten werden über den Anwesenheits-Bereich erfasst.</Text>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="stats" pt="xs">
          <Card withBorder>
            <Text fw={600} mb="xs">Statistiken</Text>
            <Text c="dimmed" size="sm" ta="center" py="xl">Statistiken werden bei ausreichend Daten automatisch angezeigt.</Text>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
