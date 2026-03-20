/* eslint-disable react-refresh/only-export-components */
import { Link, useLoaderData, useSearchParams } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button, Card, Badge, TextInput, Select, Table, Avatar, Progress, Text, Group,
} from '@mantine/core';
import { Plus, Search, LayoutGrid, List, Clock, MapPin, Users, AlertCircle } from 'lucide-react';
import { RoutePendingOverlay } from '@/components/ui/route-pending-overlay';
import { useRoutePending } from '@/hooks/use-route-pending';
import { buildSearchParams } from '@/lib/search-params';
import type { Event } from '@/modules/courses/types/courses.types';
import { requireRouteData } from '@/core/runtime/route';
import { listEventsUseCase } from '@/modules/events/use-cases/events.use-cases';

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

function participantPercent(c: Event) {
  return c.maxParticipants > 0 ? Math.round((c.participants / c.maxParticipants) * 100) : 0;
}

function progressColor(c: Event): string {
  const p = participantPercent(c);
  if (p >= 100) return 'red';
  if (p >= 80) return 'yellow';
  return 'green';
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || undefined;
  const category = url.searchParams.get('category') || 'all';
  const status = url.searchParams.get('status') || 'all';
  const eventsData = await listEventsUseCase(env, user.orgId, {
    event_type: "course",
    per_page: "200",
    search,
    category,
    status,
  });

  return {
    eventsData,
    filters: {
      search: search || '',
      category,
      status,
      view: url.searchParams.get('view') || 'grid',
    },
  };
}

export default function CoursesIndexRoute() {
  const { eventsData, filters } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSearchPending } = useRoutePending();

  const courses: Event[] = eventsData?.data ?? [];
  const view = filters.view === 'list' ? 'list' : 'grid';

  const updateFilter = (key: string, value: string) => {
    setSearchParams(buildSearchParams(searchParams, { [key]: value }));
  };

  return (
    <div>
      <PageHeader
        title="Kurse"
        action={(
          <Button component={Link} to="/courses/new" leftSection={<Plus size={16} />}>
            Neuer Kurs
          </Button>
        )}
      />

      <Group wrap="wrap" gap="sm" mb="lg">
        <TextInput
          placeholder="Kurs oder Kursleiter suchen..."
          value={filters.search}
          onChange={e => updateFilter('search', e.target.value)}
          leftSection={<Search size={16} />}
          style={{ flex: 1, minWidth: 200, maxWidth: 340 }}
        />
        <Select
          value={filters.category}
          onChange={(v) => updateFilter('category', v ?? 'all')}
          placeholder="Kategorie"
          w={160}
          data={[
            { value: 'all', label: 'Alle Kategorien' },
            ...['Training', 'Wettkampf', 'Lager', 'Workshop', 'Freizeit'].map(c => ({ value: c, label: c })),
          ]}
        />
        <Select
          value={filters.status}
          onChange={(v) => updateFilter('status', v ?? 'all')}
          placeholder="Status"
          w={160}
          data={[
            { value: 'all', label: 'Alle Status' },
            { value: 'Aktiv', label: 'Aktiv' },
            { value: 'Entwurf', label: 'Entwurf' },
            { value: 'Abgeschlossen', label: 'Abgeschlossen' },
            { value: 'Abgesagt', label: 'Abgesagt' },
          ]}
        />
        <Group
          gap={0}
          ml="auto"
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-sm)',
            overflow: 'hidden',
          }}
        >
          <Button
            variant={view === 'grid' ? 'filled' : 'subtle'}
            size="sm"
            onClick={() => updateFilter('view', 'grid')}
            style={{ borderRadius: 0 }}
            px="sm"
          >
            <LayoutGrid size={16} />
          </Button>
          <Button
            variant={view === 'list' ? 'filled' : 'subtle'}
            size="sm"
            onClick={() => updateFilter('view', 'list')}
            style={{ borderRadius: 0 }}
            px="sm"
          >
            <List size={16} />
          </Button>
        </Group>
      </Group>

      {view === 'grid' ? (
        <div className="relative">
          <RoutePendingOverlay visible={isSearchPending} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      ) : (
        <Card style={{ overflow: 'hidden' }} p={0} className="relative">
          <RoutePendingOverlay visible={isSearchPending} />
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Kurs</Table.Th>
                <Table.Th>Kategorie</Table.Th>
                <Table.Th>Kursleiter</Table.Th>
                <Table.Th>Zeitplan</Table.Th>
                <Table.Th>Teilnehmer</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Preis</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {courses.map((course) => (
                <Table.Tr key={course.id}>
                  <Table.Td fw={500}><Link to={`/courses/${course.id}`}>{course.title}</Link></Table.Td>
                  <Table.Td>
                    <Badge variant="outline" color={categoryColor[course.category] || 'gray'} size="xs">
                      {course.category}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{course.instructorName}</Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{course.schedule}</Text></Table.Td>
                  <Table.Td>{course.participants}/{course.maxParticipants}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={statusColor[course.status] || 'gray'} size="xs">
                      {course.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{course.price ? `${course.price},00 €` : 'Kostenlos'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      {courses.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">Keine Kurse gefunden.</Text>
      )}
    </div>
  );
}

function CourseCard({ course: c }: { course: Event }) {
  const pct = participantPercent(c);

  return (
    <Card
      component={Link}
      to={`/courses/${c.id}`}
      style={{ overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
      withBorder
    >
      <div
        style={{
          height: 4,
          backgroundColor: `var(--mantine-color-${categoryColor[c.category] || 'blue'}-6)`,
          margin: 'calc(var(--mantine-spacing-md) * -1)',
          marginBottom: 'var(--mantine-spacing-md)',
        }}
      />
      <Group justify="space-between" mb="xs">
        <Badge variant="outline" color={categoryColor[c.category] || 'gray'} size="xs">{c.category}</Badge>
        <Badge variant="light" color={statusColor[c.status] || 'gray'} size="xs">{c.status}</Badge>
      </Group>
      <Text fw={600} truncate mb="sm">{c.title}</Text>

      <Group gap="xs" mb="xs">
        <Avatar size={24} color="blue">{c.instructorInitials}</Avatar>
        <Text size="sm" c="dimmed">{c.instructorName}</Text>
      </Group>
      <Text size="sm" c="dimmed" mb="xs" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Clock size={14} />{c.schedule}
      </Text>
      <Text size="sm" c="dimmed" mb="sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <MapPin size={14} />{c.location}
      </Text>

      <div style={{ marginTop: 'auto' }}>
        <Group justify="space-between" mb={4}>
          <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={14} />{c.participants}/{c.maxParticipants} Plätze
          </Text>
          <Text size="xs" c="dimmed">{pct}%</Text>
        </Group>
        <Progress value={Math.min(pct, 100)} color={progressColor(c)} size="sm" />
        {c.waitlist > 0 && (
          <Text size="xs" c="yellow" mt={4} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={12} />{c.waitlist} auf Warteliste
          </Text>
        )}
      </div>

      <Group justify="space-between" mt="md" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Button variant="subtle" size="sm">
          Details
        </Button>
        {c.price
          ? <Badge variant="light" color="blue">{c.price},00 €</Badge>
          : <Text size="xs" c="dimmed">Kostenlos</Text>}
      </Group>
    </Card>
  );
}
