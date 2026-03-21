import { Link, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, Text, Group } from '@mantine/core';
import { Users, GraduationCap, Calendar, Receipt, TrendingUp } from 'lucide-react';
import { RoutePendingOverlay } from '@/components/ui/route-pending-overlay';
import { useRoutePending } from '@/hooks/use-route-pending';
import { requireRouteData } from '@/core/runtime/route';
import { getDashboardDataUseCase } from '@/modules/dashboard/use-cases/get-dashboard-data.use-case';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  return getDashboardDataUseCase(env, user.orgId);
}

export default function DashboardIndexRoute() {
  const { membersData, eventsData, auditData } = useLoaderData<typeof loader>();
  const { isPending } = useRoutePending();
  const totalMembers = membersData?.meta?.total ?? null;
  const events = eventsData?.data ?? [];
  const activities = auditData?.data ?? [];

  const kpis = [
    { label: 'Aktive Mitglieder', value: totalMembers !== null ? String(totalMembers) : '–', sub: 'Aus der Datenbank', icon: Users, trend: true, highlight: true },
    { label: 'Kurse / Events', value: String(eventsData?.meta?.total ?? '–'), sub: 'Gesamt', icon: GraduationCap },
    { label: 'Nächster Termin', value: events.length > 0 ? new Date(events[0].startDate).toLocaleDateString('de-DE') : '–', sub: events.length > 0 ? events[0].title : 'Keine Termine', icon: Calendar },
    { label: 'Letzte Aktion', value: activities.length > 0 ? activities[0].action.slice(0, 20) : '–', sub: activities.length > 0 ? activities[0].user : '', icon: Receipt },
  ];

  const monthNames = ['', 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="relative mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RoutePendingOverlay visible={isPending} />
        {kpis.map((kpi) => (
          <Card key={kpi.label} shadow="sm" className={kpi.highlight ? 'bg-primary-lightest' : 'bg-popover'}>
            <Card.Section inheritPadding py="sm">
              <Group justify="space-between" align="flex-start">
                <div className="space-y-1">
                  <Text size="sm" c="dimmed">{kpi.label}</Text>
                  <Text size="xl" fw={600}>{kpi.value}</Text>
                  <Text size="xs" c={kpi.trend ? 'green' : 'dimmed'} className="flex items-center gap-1">
                    {kpi.trend && <TrendingUp className="h-3 w-3 inline" />}
                    {kpi.sub}
                  </Text>
                </div>
                <div className="w-10 h-10 rounded-lg bg-popover/80 flex items-center justify-center">
                  <kpi.icon className="h-5 w-5 text-primary" />
                </div>
              </Group>
            </Card.Section>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card shadow="sm" className="relative lg:col-span-2 bg-popover">
          <RoutePendingOverlay visible={isPending} />
          <Text fw={600} mb="sm">Kommende Termine</Text>
          {events.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">Keine kommenden Termine.</Text>
          ) : (
            <div className="divide-y divide-border">
              {events.map((event) => {
                const d = new Date(event.startDate);
                const day = String(d.getDate()).padStart(2, '0');
                const month = d.getMonth() + 1;
                return (
                  <Link key={event.id} to={`/events/${event.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-accent flex flex-col items-center justify-center shrink-0">
                      <span className="text-sm font-semibold leading-none text-primary">{day}</span>
                      <span className="text-xs text-primary/70">{monthNames[month]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.timeStart} Uhr · {event.eventType}</p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {event.participants}/{event.maxParticipants}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card shadow="sm" className="relative bg-popover">
          <RoutePendingOverlay visible={isPending} />
          <Text fw={600} mb="sm">Letzte Aktivitäten</Text>
          {activities.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">Keine Aktivitäten vorhanden.</Text>
          ) : (
            <div className="divide-y divide-border">
              {activities.map((activity) => {
                const initials = activity.user ? activity.user.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase() : '??';
                const timeAgo = activity.timestamp
                  ? new Date(activity.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : '';
                return (
                  <div key={activity.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-primary-foreground text-xs font-semibold">{initials}</span>
                    </div>
                    <div className="min-w-0">
                      <Text size="sm">
                        <span className="font-medium">{activity.user}</span>{' '}
                        <span className="text-muted-foreground">{activity.action}</span>
                      </Text>
                      <Text size="xs" c="dimmed" mt={2}>{timeAgo}</Text>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
