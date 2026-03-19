import { PageHeader } from '@/components/layout/PageHeader';
import { Card, Badge, Table, Text, Group } from '@mantine/core';
import { ClipboardCheck, TrendingUp } from 'lucide-react';

type AttendanceRecord = {
  id: string;
  date?: string;
  eventTitle: string;
  status: string;
};

type AttendanceStats = {
  total: number;
  present: number;
  rate: number;
};

type AttendanceOverview = {
  stats: AttendanceStats;
  records: AttendanceRecord[];
};

export default function MyEvents({ data }: { data: AttendanceOverview }) {
  const statusColor = (s: string): string => {
    const map: Record<string, string> = {
      'Anwesend': 'green',
      'Abwesend': 'red',
      'Entschuldigt': 'yellow',
    };
    return map[s] || 'gray';
  };

  return (
    <div>
      <PageHeader title="Meine Anwesenheit" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card withBorder>
              <Card.Section p="md">
                <Group gap="md">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <Text size="xl" fw={700}>{data?.stats.total ?? 0}</Text>
                    <Text size="sm" c="dimmed">Erfasste Termine</Text>
                  </div>
                </Group>
              </Card.Section>
            </Card>
            <Card withBorder>
              <Card.Section p="md">
                <Group gap="md">
                  <div className="p-3 rounded-xl bg-success/10">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <Text size="xl" fw={700}>{data?.stats.present ?? 0}</Text>
                    <Text size="sm" c="dimmed">Anwesend</Text>
                  </div>
                </Group>
              </Card.Section>
            </Card>
            <Card withBorder>
              <Card.Section p="md">
                <Group gap="md">
                  <div className="p-3 rounded-xl bg-warning/10">
                    <ClipboardCheck className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <Text size="xl" fw={700}>{data?.stats.rate ?? 0}%</Text>
                    <Text size="sm" c="dimmed">Anwesenheitsquote</Text>
                  </div>
                </Group>
              </Card.Section>
            </Card>
      </div>

      {/* Attendance Records */}
      <Card withBorder>
            <Card.Section p="md">
              <Text fw={600} size="sm" mb="sm">Anwesenheits-Verlauf</Text>
              {(!data?.records || data.records.length === 0) ? (
                <Text c="dimmed" size="sm" ta="center" py="md">Noch keine Anwesenheitseinträge vorhanden.</Text>
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Datum</Table.Th>
                      <Table.Th>Veranstaltung</Table.Th>
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.records.map((record, i) => (
                      <Table.Tr key={record.id} bg={i % 2 === 1 ? 'var(--mantine-color-default-hover)' : undefined}>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {record.date ? new Date(record.date).toLocaleDateString('de-DE') : '–'}
                          </Text>
                        </Table.Td>
                        <Table.Td><Text fw={500}>{record.eventTitle}</Text></Table.Td>
                        <Table.Td>
                          <Badge variant="outline" color={statusColor(record.status)}>{record.status}</Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card.Section>
      </Card>
    </div>
  );
}
