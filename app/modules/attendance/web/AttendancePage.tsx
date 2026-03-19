import { useState } from 'react';
import { useLocation, useNavigate, useNavigation } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, Button, Badge, Select, Progress, Text, Group } from '@mantine/core';
import { Clock, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type AttendanceEvent = {
  id: string;
  title: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  status: string;
  participants: number;
  maxParticipants: number;
};

export default function Attendance({ eventsData }: { eventsData: { data?: AttendanceEvent[] } }) {
  const [dateFilter, setDateFilter] = useState('today');
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();

  const isLoading = navigation.state === 'loading' && navigation.location?.pathname === location.pathname;
  const todayEvents = eventsData?.data ?? [];

  return (
    <div>
      <PageHeader title="Anwesenheit">
        <div className="mt-4">
          <Select
            value={dateFilter}
            onChange={(v) => setDateFilter(v ?? 'today')}
            w={192}
            data={[
              { value: 'today', label: 'Heute' },
              { value: 'week', label: 'Diese Woche' },
              { value: 'month', label: 'Diesen Monat' },
            ]}
          />
        </div>
      </PageHeader>

      {!isLoading && todayEvents.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">Heute keine Termine vorhanden.</Text>
      )}

      {/* Today's Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {(isLoading ? Array.from({ length: 6 }) : todayEvents).map((event, index) => {
          if (isLoading) {
            return <AttendanceCardSkeleton key={index} />;
          }
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
                <Button fullWidth onClick={() => navigate(`/attendance/${event.id}`)}>
                  Check-In starten
                </Button>
              </div>
            </Card>
          );
        })}
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

function AttendanceCardSkeleton() {
  return (
    <Card withBorder>
      <div className="space-y-3">
        <Group justify="space-between" align="flex-start">
          <div style={{ flex: 1 }}>
            <Skeleton h={16} w="60%" mb={8} />
            <Skeleton h={12} w="52%" mb={6} />
            <Skeleton h={12} w="48%" />
          </div>
          <Skeleton h={20} w={74} radius="xl" />
        </Group>
        <div>
          <Group justify="space-between" mb={4}>
            <Skeleton h={12} w="32%" />
            <Skeleton h={12} w={44} />
          </Group>
          <Skeleton h={8} radius="xl" />
        </div>
        <Skeleton h={36} radius="sm" />
      </div>
    </Card>
  );
}
