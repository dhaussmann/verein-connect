import { Card, Stack, Textarea, TextInput, Button } from '@mantine/core';
import { Text } from '@mantine/core';

export default function SettingsNotificationsRoute() {
  return (
    <Stack gap="md">
      <Card>
        <Text fw={600} mb="md">
          E-Mail-Einstellungen
        </Text>
        <Stack gap="md">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <TextInput label="Absendername" defaultValue="TSV Beispielverein" />
            <TextInput label="Absender-E-Mail" defaultValue="info@tsv-beispiel.de" />
          </div>
          <Textarea
            label="Signatur"
            rows={3}
            defaultValue={"Mit sportlichen Grüßen,\nTSV Beispielverein 1900 e.V."}
          />
          <Button style={{ alignSelf: 'flex-start' }}>Speichern</Button>
        </Stack>
      </Card>
    </Stack>
  );
}
