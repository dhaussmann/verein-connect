import { useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import {
  Avatar, Badge, Button, Card, Group, Stack, Table, Textarea, TextInput,
} from '@mantine/core';
import { Text } from '@mantine/core';
import { FileDown } from 'lucide-react';
import type { SettingsAuditEntry } from '@/modules/settings/types/settings.types';
import { requireRouteData } from '@/core/runtime/route';
import { getSettingsAuditLogUseCase } from '@/modules/settings/use-cases/settings.use-cases';

const retentionPolicies = [
  { dataType: 'Kontaktdaten', days: 90, description: 'Nach Austritt' },
  { dataType: 'Finanzdaten', days: 3650, description: '10 Jahre gesetzlich' },
  { dataType: 'Gesundheitsdaten', days: 365, description: 'Nach Austritt' },
  { dataType: 'Kommunikation', days: 180, description: 'Nach letzter Aktivität' },
  { dataType: 'Anwesenheitsdaten', days: 730, description: '2 Jahre' },
  { dataType: 'Fotos/Medien', days: 365, description: 'Nach Austritt' },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const auditLog = await getSettingsAuditLogUseCase(env, user.orgId, 50);
  return { auditLog };
}

export default function SettingsGdprRoute() {
  const { auditLog } = useLoaderData<typeof loader>();
  const entries = (auditLog as SettingsAuditEntry[]) ?? [];

  return (
    <Stack gap="lg">
      <Card>
        <Text fw={600} mb="md">
          Datenschutzerklärung
        </Text>
        <Stack gap="sm">
          <TextInput defaultValue="https://www.tsv-beispiel.de/datenschutz" />
          <Textarea rows={4} placeholder="Oder Text direkt eingeben..." />
          <Button style={{ alignSelf: 'flex-start' }}>Speichern</Button>
        </Stack>
      </Card>

      <Card>
        <Text fw={600} mb="md">
          Datenaufbewahrungsfristen
        </Text>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Datentyp</Table.Th>
              <Table.Th>Aufbewahrung (Tage)</Table.Th>
              <Table.Th>Beschreibung</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {retentionPolicies.map((policy) => (
              <Table.Tr key={policy.dataType}>
                <Table.Td>
                  <Text fw={500}>{policy.dataType}</Text>
                </Table.Td>
                <Table.Td>{policy.days === 0 ? 'Unbegrenzt' : policy.days}</Table.Td>
                <Table.Td>
                  <Text c="dimmed">{policy.description}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Card>
        <Group justify="space-between" mb="md">
          <Text fw={600}>Audit-Log</Text>
          <Button variant="outline" size="sm" leftSection={<FileDown size={16} />}>
            Exportieren
          </Button>
        </Group>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Zeitpunkt</Table.Th>
              <Table.Th>Benutzer</Table.Th>
              <Table.Th>Aktion</Table.Th>
              <Table.Th>Details</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {entries.map((entry) => {
              const initials = entry.user
                .split(' ')
                .map((word) => word[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <Table.Tr key={entry.id}>
                  <Table.Td>
                    <Text c="dimmed" size="xs" style={{ whiteSpace: 'nowrap' }}>
                      {entry.timestamp}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Avatar size="xs" color="blue">
                        {initials}
                      </Avatar>
                      <Text size="sm">{entry.user}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" size="xs">
                      {entry.action}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {entry.details || '–'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              );
            })}
            {entries.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text ta="center" py="xl" c="dimmed">
                    Keine Audit-Log-Einträge vorhanden.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}
