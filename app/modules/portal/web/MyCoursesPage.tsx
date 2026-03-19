import { PageHeader } from '@/components/layout/PageHeader';
import { Card, Badge, Text, Group } from '@mantine/core';
import { GraduationCap, Calendar, MapPin, Clock, Users } from 'lucide-react';

type PortalCourseEvent = {
  id: string;
  eventType: string;
  title: string;
  description?: string;
  startDate?: string;
  timeStart?: string;
  timeEnd?: string;
  location?: string;
  participants?: number;
  maxParticipants?: number;
  status: string;
};

export default function MyCourses({ events }: { events: PortalCourseEvent[] }) {
  const statusColor = (s: string): string => {
    const map: Record<string, string> = {
      'Aktiv': 'green',
      'Entwurf': 'gray',
      'Abgeschlossen': 'gray',
      'Abgesagt': 'red',
    };
    return map[s] || 'gray';
  };

  return (
    <div>
      <PageHeader title="Meine Kurse & Anmeldungen" />

      {!events || events.length === 0 ? (
        <Card withBorder>
          <Card.Section p="xl">
            <div className="text-center">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <Text c="dimmed">Du bist noch für keinen Kurs angemeldet.</Text>
              <Text size="sm" c="dimmed" mt="xs">Sobald du dich für Kurse oder Termine anmeldest, erscheinen sie hier.</Text>
            </div>
          </Card.Section>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id} withBorder>
              <Card.Section p="md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                      {event.eventType === 'course' ? (
                        <GraduationCap className="h-5 w-5 text-primary" />
                      ) : (
                        <Calendar className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <Text fw={600} truncate>{event.title}</Text>
                      {event.description && (
                        <Text size="sm" c="dimmed" mt={2} lineClamp={2}>{event.description}</Text>
                      )}
                      <Group gap="md" mt="xs">
                        <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={14} />
                          {event.startDate ? new Date(event.startDate).toLocaleDateString('de-DE') : ''}
                          {event.timeStart && ` · ${event.timeStart}`}
                          {event.timeEnd && ` – ${event.timeEnd}`}
                        </Text>
                        {event.location && (
                          <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={14} /> {event.location}
                          </Text>
                        )}
                        {event.maxParticipants && (
                          <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={14} /> {event.participants}/{event.maxParticipants}
                          </Text>
                        )}
                      </Group>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" color={statusColor(event.status)}>{event.status}</Badge>
                    <Badge variant="default" size="sm">
                      {event.eventType === 'course' ? 'Kurs' : event.eventType === 'recurring' ? 'Serie' : 'Einzeltermin'}
                    </Badge>
                  </div>
                </div>
              </Card.Section>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
