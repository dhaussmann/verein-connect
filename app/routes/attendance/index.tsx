import { Link, useLoaderData, useSearchParams } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, Button, Badge, Select, Progress, Text, Group } from '@mantine/core';
import { Clock, MapPin } from 'lucide-react';
import { RoutePendingOverlay } from '@/components/ui/route-pending-overlay';
import { useRoutePending } from '@/hooks/use-route-pending';
import { buildSearchParams } from '@/lib/search-params';
import { requireRouteData } from '@/core/runtime/route';
import { listAttendanceEventsUseCase } from '@/modules/attendance/use-cases/attendance.use-cases';

function getDateRange(range: string) {
  const start = new Date();
  const end = new Date(start);

  if (range === 'week') end.setDate(end.getDate() + 6);
  if (range === 'month') end.setMonth(end.getMonth() + 1);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: range === 'today' ? undefined : end.toISOString().slice(0, 10),
  };
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const url = new URL(request.url);
  const range = url.searchParams.get('range') || 'today';
  const eventsData = await listAttendanceEventsUseCase(env, user.orgId, getDateRange(range));
  return { eventsData };
}

export default function AttendanceIndexRoute() {
  const { eventsData } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateFilter = searchParams.get('range') || 'today';
  const { isSearchPending } = useRoutePending();
  const attendanceEvents = eventsData?.data ?? [];

  return (
    <div>
      <PageHeader title="Anwesenheit">
        <div className="mt-4">
          <Select
            value={dateFilter}
            onChange={(v) => setSearchParams(buildSearchParams(searchParams, { range: v ?? 'today' }, { resetPageOnChange: false }))}
            w={192}
            data={[
              { value: 'today', label: 'Heute' },
              { value: 'week', label: 'Diese Woche' },
              { value: 'month', label: 'Diesen Monat' },
            ]}
          />
        </div>
      </PageHeader>

      {attendanceEvents.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          {dateFilter === 'today' ? 'Heute keine Termine vorhanden.' : 'Keine Termine im gewählten Zeitraum vorhanden.'}
        </Text>
      )}

      <div className="relative mb-8">
        <RoutePendingOverlay visible={isSearchPending} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {attendanceEvents.map((event) => {
          const pct = event.maxParticipants > 0 ? (event.participants / event.maxParticipants) * 100 : 0;
          return (
            <Card key={event.id} withBorder>
              <div className="space-y-3">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text fw={600}>{event.title}</Text>
                    <Text size="sm" c="dimmed" className="flex items-center gap-2 mt-1">
                      <Clock className="h-3.5 w-3.5 inline" /> {event.timeStart}–{event.timeEnd}
                    </Text>
                    <Text size="sm" c="dimmed" className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 inline" /> {event.location}
                    </Text>
                  </div>
                  <Badge variant="light">{event.status}</Badge>
                </Group>
                <div>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm" c="dimmed">Teilnehmer</Text>
                    <Text size="sm" fw={500}>{event.participants}/{event.maxParticipants}</Text>
                  </Group>
                  <Progress value={pct} size="sm" />
                </div>
                <Button fullWidth component={Link} to={`/attendance/${event.id}`}>
                  Check-In starten
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      </div>

      {/* Statistics placeholder */}
      <Card withBorder>
        <Text fw={600} mb="sm">Statistiken</Text>
        <Text c="dimmed" size="sm" ta="center" py="xl">
          Anwesenheitsstatistiken werden bei ausreichend erfassten Daten angezeigt.
        </Text>
      </Card>
    </div>
  );
}
