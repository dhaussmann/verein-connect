/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { useFetcher, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import {
  ActionIcon, Badge, Button, Card, ColorInput, Group,
  Modal, Stack, Table, Text, TextInput, Textarea,
} from '@mantine/core';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { requireRouteData } from '@/core/runtime/route';
import {
  listMembershipLevelsUseCase,
  createMembershipLevelUseCase,
  updateMembershipLevelUseCase,
  deleteMembershipLevelUseCase,
} from '@/modules/members/use-cases/membership-levels.use-case';
import { notifications } from '@mantine/notifications';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const levels = await listMembershipLevelsUseCase(env, user.orgId);
  return { levels };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get('intent') || '');
  const requestId = String(formData.get('requestId') || '');

  try {
    if (intent === 'create') {
      await createMembershipLevelUseCase(env, {
        orgId: user.orgId,
        name: String(formData.get('name') || ''),
        description: String(formData.get('description') || '') || null,
        color: String(formData.get('color') || '#3b82f6'),
        sortOrder: Number(formData.get('sortOrder') || 0),
      });
      return { success: true, intent, requestId };
    }
    if (intent === 'update') {
      await updateMembershipLevelUseCase(env, {
        orgId: user.orgId,
        levelId: String(formData.get('id') || ''),
        name: String(formData.get('name') || ''),
        description: String(formData.get('description') || '') || null,
        color: String(formData.get('color') || '#3b82f6'),
        sortOrder: Number(formData.get('sortOrder') || 0),
      });
      return { success: true, intent, requestId };
    }
    if (intent === 'delete') {
      await deleteMembershipLevelUseCase(env, {
        orgId: user.orgId,
        levelId: String(formData.get('id') || ''),
      });
      return { success: true, intent, requestId };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : 'Aktion fehlgeschlagen', requestId };
  }

  return { error: 'Unbekannte Aktion', requestId };
}

type Level = { id: string; name: string; description: string | null; color: string | null; sortOrder: number | null; isDefault: number | null };

export default function MembershipLevelsSettings() {
  const { levels } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Level | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#3b82f6', sortOrder: '0' });
  const [editorRequestId, setEditorRequestId] = useState(() => crypto.randomUUID());
  const isLevelSaved = fetcher.data?.success
    && (fetcher.data.intent === 'create' || fetcher.data.intent === 'update')
    && fetcher.data.requestId === editorRequestId;

  function openCreate() {
    setEditing(null);
    setForm({ name: '', description: '', color: '#3b82f6', sortOrder: '0' });
    setEditorRequestId(crypto.randomUUID());
    setModalOpen(true);
  }

  function openEdit(level: Level) {
    setEditing(level);
    setForm({
      name: level.name,
      description: level.description ?? '',
      color: level.color ?? '#3b82f6',
      sortOrder: String(level.sortOrder ?? 0),
    });
    setEditorRequestId(crypto.randomUUID());
    setModalOpen(true);
  }

  function handleSubmit() {
    const data: Record<string, string> = {
      intent: editing ? 'update' : 'create',
      name: form.name,
      description: form.description,
      color: form.color,
      sortOrder: form.sortOrder,
      requestId: editorRequestId,
    };
    if (editing) data.id = editing.id;
    fetcher.submit(data, { method: 'post' });
  }

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">Mitgliedsstufen</Text>
        <Button leftSection={<Plus size={14} />} onClick={openCreate}>Neue Stufe</Button>
      </Group>

      {fetcher.data?.error && (
        <Text c="red" size="sm" mb="sm">{fetcher.data.error}</Text>
      )}
      {fetcher.data?.success && (
        <Text c="green" size="sm" mb="sm">
          {fetcher.data.intent === 'create' ? 'Stufe erstellt.' : fetcher.data.intent === 'update' ? 'Stufe aktualisiert.' : 'Stufe gelöscht.'}
        </Text>
      )}

      <Card shadow="sm">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Beschreibung</Table.Th>
              <Table.Th>Farbe</Table.Th>
              <Table.Th>Sortierung</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {levels.map((level) => (
              <Table.Tr key={level.id}>
                <Table.Td>
                  <Badge color={level.color ?? 'blue'} variant="light">{level.name}</Badge>
                </Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{level.description ?? '–'}</Text></Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: level.color ?? '#3b82f6' }} />
                    <Text size="xs" ff="monospace">{level.color}</Text>
                  </Group>
                </Table.Td>
                <Table.Td><Text size="sm">{level.sortOrder}</Text></Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <ActionIcon variant="subtle" onClick={() => openEdit(level as Level)}><Edit size={14} /></ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => {
                        if (confirm(`Stufe "${level.name}" löschen?`)) {
                          fetcher.submit({ intent: 'delete', id: level.id }, { method: 'post' });
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {levels.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text size="sm" c="dimmed" ta="center">Keine Mitgliedsstufen vorhanden</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal
        opened={modalOpen && !isLevelSaved}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Stufe bearbeiten' : 'Neue Stufe'}
      >
        <Stack>
          <TextInput
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Textarea
            label="Beschreibung"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <ColorInput
            label="Farbe"
            value={form.color}
            onChange={(v) => setForm((f) => ({ ...f, color: v }))}
          />
          <TextInput
            label="Sortierung"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          />
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSubmit} loading={fetcher.state !== 'idle'}>
              {editing ? 'Speichern' : 'Erstellen'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
