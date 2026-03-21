import { ActionIcon, Badge, Button, Card, Group, Stack, TextInput } from '@mantine/core';
import { Text } from '@mantine/core';
import { Copy, Link2 } from 'lucide-react';

export default function SettingsIntegrationsRoute() {
  return (
    <Stack gap="md">
      <Card>
        <Group justify="space-between">
          <Group gap="sm">
            <div
              style={{
                padding: 8,
                borderRadius: 8,
                background: 'var(--mantine-color-blue-0)',
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
          {['Terminkalender', 'Kursanmeldung', 'Mitglieder-Login', 'Nachrichten-Feed'].map((widget) => (
            <div key={widget}>
              <Text size="sm" fw={500} mb={4}>
                {widget}
              </Text>
              <Group gap="xs">
                <TextInput
                  readOnly
                  value={`<script src="https://app.clubboard.de/widget/${widget
                    .toLowerCase()
                    .replace(/[^a-z]/g, '-')}.js"></script>`}
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
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
