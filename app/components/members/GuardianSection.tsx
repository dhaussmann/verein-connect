import { useState } from 'react';
import { ActionIcon, Button, Card, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useFetcherNotify } from '@/hooks/use-fetcher-notify';

type Guardian = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
};

type Props = {
  guardians: Guardian[];
};

// editingId: null = modal closed, '' = add new, '<id>' = edit existing
export function GuardianSection({ guardians }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetcher = useFetcherNotify(
    {
      'create-guardian': 'Erziehungsberechtigter gespeichert',
      'update-guardian': 'Erziehungsberechtigter gespeichert',
      'delete-guardian': 'Erziehungsberechtigter gelöscht',
    },
    { onSuccess: (data) => { if (data.intent !== 'delete-guardian') setEditingId(null); } },
  );

  // undefined = closed, null = add new, Guardian = edit existing
  const editing = editingId !== null
    ? (guardians.find((g) => g.id === editingId) ?? null)
    : undefined;

  return (
    <Card shadow="sm">
      <Card.Section p="md">
        <Group justify="space-between" mb="md">
          <Text fw={600} size="sm">Erziehungsberechtigte</Text>
          <Button size="xs" leftSection={<Plus size={14} />} onClick={() => setEditingId('')}>
            Hinzufügen
          </Button>
        </Group>

        {guardians.length === 0 ? (
          <Text size="sm" c="dimmed">Keine Erziehungsberechtigten vorhanden.</Text>
        ) : (
          <Stack gap="sm">
            {guardians.map((g) => (
              <Card key={g.id} withBorder padding="sm">
                <Group justify="space-between">
                  <div>
                    <Text size="sm" fw={500}>{g.firstName} {g.lastName}</Text>
                    {g.email && <Text size="xs" c="dimmed">{g.email}</Text>}
                    {g.phone && <Text size="xs" c="dimmed">{g.phone}</Text>}
                    {(g.street || g.city) && (
                      <Text size="xs" c="dimmed">{[g.street, g.zip, g.city].filter(Boolean).join(', ')}</Text>
                    )}
                  </div>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" onClick={() => setEditingId(g.id)}>
                      <Pencil size={14} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => {
                        if (confirm('Erziehungsberechtigten löschen?')) {
                          fetcher.submit({ intent: 'delete-guardian', guardianId: g.id }, { method: 'post' });
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Card.Section>

      <Modal
        opened={editingId !== null}
        onClose={() => setEditingId(null)}
        title={editing ? 'Erziehungsberechtigten bearbeiten' : 'Erziehungsberechtigten hinzufügen'}
      >
        <fetcher.Form method="post" key={editingId ?? 'new'}>
          <input type="hidden" name="intent" value={editing ? 'update-guardian' : 'create-guardian'} />
          {editing && <input type="hidden" name="guardianId" value={editing.id} />}
          <Stack>
            <div className="grid grid-cols-2 gap-4">
              <TextInput name="firstName" label="Vorname *" defaultValue={editing?.firstName ?? ''} />
              <TextInput name="lastName" label="Nachname *" defaultValue={editing?.lastName ?? ''} />
              <TextInput name="email" label="E-Mail" defaultValue={editing?.email ?? ''} />
              <TextInput name="phone" label="Telefon" defaultValue={editing?.phone ?? ''} />
              <TextInput name="street" label="Straße" defaultValue={editing?.street ?? ''} />
              <TextInput name="zip" label="PLZ" defaultValue={editing?.zip ?? ''} />
              <TextInput name="city" label="Stadt" className="col-span-2" defaultValue={editing?.city ?? ''} />
            </div>
            <Group justify="flex-end">
              <Button variant="outline" type="button" onClick={() => setEditingId(null)}>Abbrechen</Button>
              <Button type="submit" loading={fetcher.state !== 'idle'}>Speichern</Button>
            </Group>
          </Stack>
        </fetcher.Form>
      </Modal>
    </Card>
  );
}
