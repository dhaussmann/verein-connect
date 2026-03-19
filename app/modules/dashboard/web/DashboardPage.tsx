import { useLocation, useNavigate, useNavigation } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, Text, Group } from '@mantine/core';
import { Users, GraduationCap, Calendar, Receipt, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type DashboardEvent = {
  id: string;
  title: string;
  startDate: string;
  timeStart: string;
  eventType: string;
  participants: number;
  maxParticipants: number;
};

type AuditActivity = {
  id: string;
  action: string;
  user: string;
  timestamp: string;
};

export default function Dashboard({
  membersData,
  eventsData,
  auditData,
}: {
  membersData: { meta?: { total?: number } };
  eventsData: { data?: DashboardEvent[]; meta?: { total?: number } };
  auditData: { data?: AuditActivity[] };
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const totalMembers = membersData?.meta?.total ?? null;
  const events = eventsData?.data ?? [];
  const activities = auditData?.data ?? [];
  const isLoading = navigation.state === 'loading' && navigation.location?.pathname === location.pathname;

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          <>
            <DashboardKpiSkeleton />
            <DashboardKpiSkeleton />
            <DashboardKpiSkeleton />
            <DashboardKpiSkeleton />
          </>
        ) : (
          kpis.map((k) => (
            <Card key={k.label} shadow="sm" className={k.highlight ? 'bg-primary-lightest' : 'bg-popover'}>
              <Card.Section inheritPadding py="sm">
                <Group justify="space-between" align="flex-start">
                  <div className="space-y-1">
                    <Text size="sm" c="dimmed">{k.label}</Text>
                    <Text size="xl" fw={600}>{k.value}</Text>
                    <Text size="xs" c={k.trend ? 'green' : 'dimmed'} className="flex items-center gap-1">
                      {k.trend && <TrendingUp className="h-3 w-3 inline" />}
                      {k.sub}
                    </Text>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-popover/80 flex items-center justify-center">
                    <k.icon className="h-5 w-5 text-primary" />
                  </div>
                </Group>
              </Card.Section>
            </Card>
          ))
        )}
      </div>

      {/* Middle: Events + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Upcoming Events */}
        <Card shadow="sm" className="lg:col-span-2 bg-popover">
          <Text fw={600} mb="sm">Kommende Termine</Text>
          {isLoading ? (
            <DashboardEventsSkeleton />
          ) : events.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">Keine kommenden Termine.</Text>
          ) : (
            <div className="divide-y divide-border">
              {events.map((ev) => {
                const d = new Date(ev.startDate);
                const day = String(d.getDate()).padStart(2, '0');
                const month = d.getMonth() + 1;
                return (
                  <div key={ev.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/events/${ev.id}`)}>
                    <div className="w-12 h-12 rounded-lg bg-accent flex flex-col items-center justify-center shrink-0">
                      <span className="text-sm font-semibold leading-none text-primary">{day}</span>
                      <span className="text-xs text-primary/70">{monthNames[month]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">{ev.timeStart} Uhr · {ev.eventType}</p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {ev.participants}/{ev.maxParticipants}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Activity Feed */}
        <Card shadow="sm" className="bg-popover">
          <Text fw={600} mb="sm">Letzte Aktivitäten</Text>
          {isLoading ? (
            <DashboardActivitySkeleton />
          ) : activities.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">Keine Aktivitäten vorhanden.</Text>
          ) : (
            <div className="divide-y divide-border">
              {activities.map((a) => {
                const initials = a.user ? a.user.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '??';
                const timeAgo = a.timestamp ? new Date(a.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-primary-foreground text-xs font-semibold">{initials}</span>
                    </div>
                    <div className="min-w-0">
                      <Text size="sm">
                        <span className="font-medium">{a.user}</span>{' '}
                        <span className="text-muted-foreground">{a.action}</span>
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

function DashboardKpiSkeleton() {
  return (
    <Card shadow="sm" className="bg-popover">
      <Card.Section inheritPadding py="sm">
        <Group justify="space-between" align="flex-start">
          <div style={{ flex: 1 }}>
            <Skeleton h={14} w="55%" mb={8} />
            <Skeleton h={28} w="35%" mb={8} />
            <Skeleton h={12} w="70%" />
          </div>
          <Skeleton h={40} w={40} radius="md" />
        </Group>
      </Card.Section>
    </Card>
  );
}

function DashboardEventsSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3">
          <Skeleton h={48} w={48} radius="md" />
          <div className="flex-1 min-w-0">
            <Skeleton h={12} w="58%" mb={8} />
            <Skeleton h={10} w="42%" />
          </div>
          <Skeleton h={12} w={44} />
        </div>
      ))}
    </div>
  );
}

function DashboardActivitySkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 px-4 py-3">
          <Skeleton h={32} w={32} radius="xl" />
          <div className="min-w-0 flex-1">
            <Skeleton h={12} w="80%" mb={8} />
            <Skeleton h={10} w="38%" />
          </div>
        </div>
      ))}
    </div>
  );
}
