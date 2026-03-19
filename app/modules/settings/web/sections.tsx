import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { Copy, FileDown, Link2, Upload } from "lucide-react";
import type { SettingsAuditEntry, OrganizationSettingsData } from "@/modules/settings/types/settings.types";

const retentionPolicies = [
  { dataType: "Kontaktdaten", days: 90, description: "Nach Austritt" },
  { dataType: "Finanzdaten", days: 3650, description: "10 Jahre gesetzlich" },
  { dataType: "Gesundheitsdaten", days: 365, description: "Nach Austritt" },
  { dataType: "Kommunikation", days: 180, description: "Nach letzter Aktivität" },
  { dataType: "Anwesenheitsdaten", days: 730, description: "2 Jahre" },
  { dataType: "Fotos/Medien", days: 365, description: "Nach Austritt" },
];

export function GeneralSettingsSection({ organization }: { organization: OrganizationSettingsData }) {
  const settings = organization.settings || {};

  return (
    <Card>
      <Text fw={600} mb="md">
        Vereinsdaten
      </Text>
      <Stack gap="md">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <TextInput label="Vereinsname" name="name" defaultValue={organization.name} />
          <TextInput
            label="Website"
            name="website"
            defaultValue={String(settings.website || "")}
          />
        </div>
        <div>
          <Text size="sm" fw={500} mb="xs">
            Logo
          </Text>
          <div
            style={{
              border: "2px dashed var(--mantine-color-gray-4)",
              borderRadius: 8,
              padding: "1.5rem",
              textAlign: "center",
              cursor: "not-allowed",
            }}
          >
            <Upload style={{ margin: "0 auto 8px" }} size={32} />
            <Text size="sm" c="dimmed">
              Logo-Upload folgt in einem eigenen Action-Flow
            </Text>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <TextInput
            label="Zeitzone"
            name="timezone"
            defaultValue={String(settings.timezone || "Europe/Berlin")}
          />
          <TextInput
            label="Sprache"
            name="language"
            defaultValue={String(settings.language || "de")}
          />
        </div>
        <Card bg="gray.0">
          <Group justify="space-between">
            <div>
              <Text fw={500}>{organization.plan?.toUpperCase() || "FREE"} Plan</Text>
              <Text size="sm" c="dimmed">
                Vereins-Slug: {organization.slug}
              </Text>
            </div>
            <Badge variant="outline" color="green">
              Aktiv
            </Badge>
          </Group>
        </Card>
        <Button type="submit" style={{ alignSelf: "flex-start" }}>
          Änderungen speichern
        </Button>
      </Stack>
    </Card>
  );
}

export function NotificationSettingsSection() {
  return (
    <Stack gap="md">
      <Card>
        <Text fw={600} mb="md">
          E-Mail-Einstellungen
        </Text>
        <Stack gap="md">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <TextInput label="Absendername" defaultValue="TSV Beispielverein" />
            <TextInput label="Absender-E-Mail" defaultValue="info@tsv-beispiel.de" />
          </div>
          <Textarea
            label="Signatur"
            rows={3}
            defaultValue={"Mit sportlichen Grüßen,\nTSV Beispielverein 1900 e.V."}
          />
          <Button style={{ alignSelf: "flex-start" }}>Speichern</Button>
        </Stack>
      </Card>
    </Stack>
  );
}

export function IntegrationSettingsSection() {
  return (
    <Stack gap="md">
      <Card>
        <Group justify="space-between">
          <Group gap="sm">
            <div
              style={{
                padding: 8,
                borderRadius: 8,
                background: "var(--mantine-color-blue-0)",
              }}
            >
              <Link2 size={20} color="var(--mantine-color-blue-6)" />
            </div>
            <div>
              <Text fw={500}>Stripe</Text>
              <Text size="sm" c="dimmed">
                Zahlungsabwicklung
              </Text>
            </div>
          </Group>
          <Group gap="sm">
            <Badge variant="outline" color="red">
              Nicht verbunden
            </Badge>
            <Button variant="outline" size="sm">
              Verbinden
            </Button>
          </Group>
        </Group>
      </Card>
      <Card>
        <Text fw={600} mb="xs">
          Homepage-Widget
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Betten Sie Clubboard-Widgets auf Ihrer Homepage ein:
        </Text>
        <Stack gap="sm">
          {["Terminkalender", "Kursanmeldung", "Mitglieder-Login", "Nachrichten-Feed"].map((widget) => (
            <div key={widget}>
              <Text size="sm" fw={500} mb={4}>
                {widget}
              </Text>
              <Group gap="xs">
                <TextInput
                  readOnly
                  value={`<script src="https://app.clubboard.de/widget/${widget
                    .toLowerCase()
                    .replace(/[^a-z]/g, "-")}.js"></script>`}
                  style={{ flex: 1, fontFamily: "monospace", fontSize: 12 }}
                />
                <ActionIcon variant="outline">
                  <Copy size={16} />
                </ActionIcon>
              </Group>
            </div>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}

export function GdprSettingsSection({ auditLog }: { auditLog: SettingsAuditEntry[] }) {
  return (
    <Stack gap="lg">
      <Card>
        <Text fw={600} mb="md">
          Datenschutzerklärung
        </Text>
        <Stack gap="sm">
          <TextInput defaultValue="https://www.tsv-beispiel.de/datenschutz" />
          <Textarea rows={4} placeholder="Oder Text direkt eingeben..." />
          <Button style={{ alignSelf: "flex-start" }}>Speichern</Button>
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
                <Table.Td>{policy.days === 0 ? "Unbegrenzt" : policy.days}</Table.Td>
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
            {auditLog.map((entry) => {
              const initials = entry.user
                .split(" ")
                .map((word) => word[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <Table.Tr key={entry.id}>
                  <Table.Td>
                    <Text c="dimmed" size="xs" style={{ whiteSpace: "nowrap" }}>
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
                      {entry.details || "–"}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              );
            })}
            {auditLog.length === 0 && (
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
