/* eslint-disable react-refresh/only-export-components */
import { Link, useLoaderData, useRouteLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, Badge, Button, Text, Group } from '@mantine/core';
import { Calendar, GraduationCap, ClipboardCheck, MapPin, Clock, ChevronRight } from 'lucide-react';
import type { RootLoaderData } from '@/root';
import { requireRouteData } from '@/core/runtime/route';
import { getPortalDashboardUseCase } from '@/modules/portal/use-cases/portal.use-cases';

type PortalDashboardEvent = {
  id: string;
  title: string;
  startDate?: string;
  timeStart?: string;
  timeEnd?: string;
  location?: string;
};

type PortalDashboardData = {
  registeredEvents?: number;
  attendanceRate?: number;
  upcomingEvents?: PortalDashboardEvent[];
  roles?: string[];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  return getPortalDashboardUseCase(env, user.id);
}

export default function PortalIndexRoute() {
  const loaderData = useLoaderData<typeof loader>() as { data: PortalDashboardData };
  const { data } = loaderData;
  const { user } = (useRouteLoaderData('root') as RootLoaderData) ?? {};

  const roleLabel = (r: string) => {
    const map: Record<string, string> = { org_admin: 'Admin', trainer: 'Trainer', member: 'Mitglied' };
    return map[r] || r;
  };

  return (
    <div>
      <PageHeader title={`Willkommen, ${user?.firstName || ''}!`} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card withBorder component={Link} to="/portal/courses" style={{ cursor: 'pointer' }}>
          <Card.Section p="md">
            <Group gap="md">
              <div className="p-3 rounded-xl bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <Text size="xl" fw={700}>{data?.registeredEvents ?? 0}</Text>
                <Text size="sm" c="dimmed">Meine Kurse</Text>
              </div>
            </Group>
          </Card.Section>
        </Card>
        <Card withBorder>
          <Card.Section p="md">
            <Group gap="md">
              <div className="p-3 rounded-xl bg-success/10">
                <ClipboardCheck className="h-6 w-6 text-success" />
              </div>
              <div>
                <Text size="xl" fw={700}>{data?.attendanceRate ?? 0}%</Text>
                <Text size="sm" c="dimmed">Anwesenheitsquote</Text>
              </div>
            </Group>
          </Card.Section>
        </Card>
        <Card withBorder>
          <Card.Section p="md">
            <Group gap="md">
              <div className="p-3 rounded-xl bg-warning/10">
                <Calendar className="h-6 w-6 text-warning" />
              </div>
              <div>
                <Text size="xl" fw={700}>{data?.upcomingEvents?.length ?? 0}</Text>
                <Text size="sm" c="dimmed">Nächste Termine</Text>
              </div>
            </Group>
          </Card.Section>
        </Card>
      </div>

      {/* Roles */}
      {data?.roles && data.roles.length > 0 && (
        <Group gap="xs" mb="md">
          <Text size="sm" c="dimmed">Deine Rollen:</Text>
          {data.roles.map((r) => (
            <Badge key={r} variant="outline" color={r === 'org_admin' ? 'blue' : 'gray'}>
              {roleLabel(r)}
            </Badge>
          ))}
        </Group>
      )}

      {/* Upcoming Events */}
      <Card withBorder>
        <Card.Section p="md">
          <Group justify="space-between" mb="sm">
            <Text fw={600} size="sm">Nächste Termine</Text>
            <Button variant="subtle" size="sm" rightSection={<ChevronRight size={16} />} component={Link} to="/portal/attendance">
              Alle anzeigen
            </Button>
          </Group>
          {(!data?.upcomingEvents || data.upcomingEvents.length === 0) ? (
            <Text c="dimmed" size="sm" ta="center" py="md">Keine anstehenden Termine.</Text>
          ) : (
            <div className="space-y-3">
              {data.upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Text fw={500} truncate>{event.title}</Text>
                    <Group gap="md" mt={2}>
                      <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={14} />
                        {event.startDate ? new Date(event.startDate).toLocaleDateString('de-DE') : ''} {event.timeStart && `· ${event.timeStart}`}{event.timeEnd && ` – ${event.timeEnd}`}
                      </Text>
                      {event.location && (
                        <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={14} /> {event.location}
                        </Text>
                      )}
                    </Group>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Section>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <Button variant="outline" style={{ height: 'auto', paddingTop: 16, paddingBottom: 16, justifyContent: 'flex-start' }} component={Link} to="/portal/profile">
          <div className="text-left">
            <Text fw={500}>Mein Profil</Text>
            <Text size="xs" c="dimmed">Persönliche Daten einsehen &amp; bearbeiten</Text>
          </div>
        </Button>
        <Button variant="outline" style={{ height: 'auto', paddingTop: 16, paddingBottom: 16, justifyContent: 'flex-start' }} component={Link} to="/portal/courses">
          <div className="text-left">
            <Text fw={500}>Meine Kurse</Text>
            <Text size="xs" c="dimmed">Angemeldete Kurse &amp; Termine</Text>
          </div>
        </Button>
      </div>
    </div>
  );
}
