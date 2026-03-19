/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useMemo } from 'react';
import { useLocation, useNavigate, useNavigation } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button, Card, Badge, TextInput, Select, Table, Avatar, Progress, Text, Group, Stack,
} from '@mantine/core';
import { Plus, Search, LayoutGrid, List, Clock, MapPin, Users, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Event } from '@/modules/courses/types/courses.types';

const categoryBgClasses: Record<string, string> = {
  Training: 'bg-primary text-primary-foreground',
  Wettkampf: 'bg-destructive text-destructive-foreground',
  Lager: 'bg-success text-success-foreground',
  Workshop: 'bg-warning text-warning-foreground',
  Freizeit: 'bg-primary-light text-primary-foreground',
};

const statusStyles: Record<string, string> = {
  Aktiv: 'bg-success/10 text-success border-success/20',
  Entwurf: 'bg-muted text-muted-foreground border-border',
  Abgeschlossen: 'bg-primary-lightest text-primary border-primary/20',
  Abgesagt: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusColor: Record<string, string> = {
  Aktiv: 'green',
  Entwurf: 'gray',
  Abgeschlossen: 'blue',
  Abgesagt: 'red',
};

const categoryColor: Record<string, string> = {
  Training: 'blue',
  Wettkampf: 'red',
  Lager: 'green',
  Workshop: 'yellow',
  Freizeit: 'indigo',
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

export default function Courses({ eventsData }: { eventsData: { data?: Event[] } }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const courses: Event[] = eventsData?.data ?? [];
  const isLoading = navigation.state === 'loading' && navigation.location?.pathname === location.pathname;
  const error = null;

  const filtered = useMemo(() => {
    return courses.filter(c => {
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.instructorName.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === 'all' || c.category === catFilter;
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [search, catFilter, statusFilter, courses]);

  return (
    <div>
      <PageHeader
        title="Kurse"
        action={
          <Button onClick={() => navigate('/courses/new')} leftSection={<Plus size={16} />}>
            Neuer Kurs
          </Button>
        }
      />

      {/* Filter bar */}
      <Group wrap="wrap" gap="sm" mb="lg">
        <TextInput
          placeholder="Kurs oder Kursleiter suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftSection={<Search size={16} />}
          style={{ flex: 1, minWidth: 200, maxWidth: 340 }}
        />
        <Select
          value={catFilter}
          onChange={(v) => setCatFilter(v ?? 'all')}
          placeholder="Kategorie"
          w={160}
          data={[
            { value: 'all', label: 'Alle Kategorien' },
            ...['Training', 'Wettkampf', 'Lager', 'Workshop', 'Freizeit'].map(c => ({ value: c, label: c })),
          ]}
        />
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v ?? 'all')}
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
            onClick={() => setView('grid')}
            style={{ borderRadius: 0 }}
            px="sm"
          >
            <LayoutGrid size={16} />
          </Button>
          <Button
            variant={view === 'list' ? 'filled' : 'subtle'}
            size="sm"
            onClick={() => setView('list')}
            style={{ borderRadius: 0 }}
            px="sm"
          >
            <List size={16} />
          </Button>
        </Group>
      </Group>

      {view === 'grid' ? (
        isLoading ? (
          <CourseGridSkeleton />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map(c => (
              <CourseCard key={c.id} course={c} onClick={() => navigate(`/courses/${c.id}`)} />
            ))}
          </div>
        )
      ) : (
        <Card style={{ overflow: 'hidden' }} p={0}>
          {isLoading ? <CoursesTableSkeleton /> : (
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
                {filtered.map((c) => (
                  <Table.Tr
                    key={c.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/courses/${c.id}`)}
                  >
                    <Table.Td fw={500}>{c.title}</Table.Td>
                    <Table.Td>
                      <Badge variant="outline" color={categoryColor[c.category] || 'gray'} size="xs">
                        {c.category}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{c.instructorName}</Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{c.schedule}</Text></Table.Td>
                    <Table.Td>{c.participants}/{c.maxParticipants}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={statusColor[c.status] || 'gray'} size="xs">
                        {c.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{c.price ? `${c.price},00 €` : 'Kostenlos'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      )}

      {error && (
        <Text c="red" ta="center" py="xl">Fehler beim Laden: {error.message}</Text>
      )}
      {!isLoading && !error && filtered.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">Keine Kurse gefunden.</Text>
      )}
    </div>
  );
}

function CourseGridSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }} withBorder>
          <Skeleton h={4} style={{ margin: 'calc(var(--mantine-spacing-md) * -1)', marginBottom: 'var(--mantine-spacing-md)' }} />
          <Group justify="space-between" mb="xs">
            <Skeleton h={20} w={86} radius="xl" />
            <Skeleton h={20} w={72} radius="xl" />
          </Group>
          <Skeleton h={18} w="70%" mb="md" />
          <Group gap="xs" mb="xs">
            <Skeleton h={24} w={24} radius="xl" />
            <Skeleton h={12} w="45%" />
          </Group>
          <Skeleton h={12} w="80%" mb="xs" />
          <Skeleton h={12} w="65%" mb="md" />
          <div style={{ marginTop: 'auto' }}>
            <Group justify="space-between" mb={4}>
              <Skeleton h={12} w="42%" />
              <Skeleton h={10} w={32} />
            </Group>
            <Skeleton h={8} radius="xl" />
          </div>
          <Group justify="space-between" mt="md" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            <Skeleton h={28} w={64} radius="sm" />
            <Skeleton h={20} w={72} radius="xl" />
          </Group>
        </Card>
      ))}
    </div>
  );
}

function CoursesTableSkeleton() {
  return (
    <Table>
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
        {Array.from({ length: 6 }).map((_, index) => (
          <Table.Tr key={index}>
            <Table.Td><Skeleton h={12} w="70%" /></Table.Td>
            <Table.Td><Skeleton h={20} w={84} radius="xl" /></Table.Td>
            <Table.Td><Skeleton h={12} w="60%" /></Table.Td>
            <Table.Td><Skeleton h={12} w="80%" /></Table.Td>
            <Table.Td><Skeleton h={12} w={54} /></Table.Td>
            <Table.Td><Skeleton h={20} w={72} radius="xl" /></Table.Td>
            <Table.Td><Skeleton h={12} w={68} /></Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function CourseCard({ course: c, onClick }: { course: Event; onClick: () => void }) {
  const pct = participantPercent(c);

  return (
    <Card
      style={{ overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
      onClick={onClick}
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
        <Button
          variant="subtle"
          size="sm"
          onClick={e => { e.stopPropagation(); onClick(); }}
        >
          Details
        </Button>
        {c.price
          ? <Badge variant="light" color="blue">{c.price},00 €</Badge>
          : <Text size="xs" c="dimmed">Kostenlos</Text>
        }
      </Group>
    </Card>
  );
}
