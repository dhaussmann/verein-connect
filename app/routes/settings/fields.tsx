/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { Form, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { Check, Edit, GripVertical, Plus, Search, Trash2, X } from 'lucide-react';
import { z } from 'zod';
import { requireRouteData } from '@/core/runtime/route';
import {
  createOrUpdateProfileFieldUseCase,
  deleteProfileFieldUseCase,
  getSettingsProfileFieldsUseCase,
} from '@/modules/settings/use-cases/settings.use-cases';

const fieldSchema = z.object({
  name: z.string().trim().min(1, 'Interner Name ist erforderlich'),
  label: z.string().trim().min(1, 'Anzeigename ist erforderlich'),
  type: z.enum(['text', 'number', 'date', 'select', 'checkbox', 'url']),
  gdprRetentionDays: z.coerce.number().min(0, 'DSGVO-Tage müssen 0 oder größer sein'),
});

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const fields = await getSettingsProfileFieldsUseCase(env, user.orgId);
  return { fields };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get('intent') || '');
  const requestId = String(formData.get('requestId') || '');

  try {
    if (intent === 'save-field') {
      const parsed = fieldSchema.safeParse({
        name: formData.get('name'),
        label: formData.get('label'),
        type: formData.get('type'),
        gdprRetentionDays: formData.get('gdprRetentionDays'),
      });
      if (!parsed.success) {
        return { success: false, intent, error: parsed.error.issues[0]?.message || 'Bitte Eingaben prüfen' };
      }

      await createOrUpdateProfileFieldUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        fieldId: String(formData.get('fieldId') || '') || undefined,
        name: parsed.data.name,
        label: parsed.data.label,
        type: parsed.data.type,
        required: formData.get('required') === 'on',
        searchable: formData.get('searchable') === 'on',
        visibleRegistration: formData.get('visibleRegistration') === 'on',
        gdprRetentionDays: parsed.data.gdprRetentionDays,
      });

      return { success: true, intent, requestId };
    }

    if (intent === 'delete-field') {
      const fieldId = String(formData.get('fieldId') || '');
      if (!fieldId) return { success: false, intent, error: 'Feld fehlt' };
      await deleteProfileFieldUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        fieldId,
      });
      return { success: true, intent, requestId };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : 'Speichern fehlgeschlagen', requestId };
  }

  return { success: false, error: 'Unbekannte Aktion', requestId };
}

export default function SettingsFieldsRoute() {
  const { fields } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [fieldEditorOpen, setFieldEditorOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editorRequestId, setEditorRequestId] = useState(() => crypto.randomUUID());
  const isFieldSaved = actionData?.success
    && actionData.intent === 'save-field'
    && actionData.requestId === editorRequestId;

  const editingField = fields.find((field) => field.id === editingFieldId) || null;

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">
          Profilfelder
        </Text>
        <Button
          onClick={() => {
            setEditingFieldId(null);
            setEditorRequestId(crypto.randomUUID());
            setFieldEditorOpen(true);
          }}
          leftSection={<Plus size={16} />}
        >
          Neues Feld
        </Button>
      </Group>

      {actionData?.error && (
        <Text c="red" size="sm" mb="sm">
          {actionData.error}
        </Text>
      )}
      {actionData?.success && (
        <Text c="green" size="sm" mb="sm">
          Profilfelder wurden aktualisiert.
        </Text>
      )}

      <Card>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 32 }} />
              <Table.Th>Feldname</Table.Th>
              <Table.Th>Anzeigename</Table.Th>
              <Table.Th>Typ</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Pflicht</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Suchbar</Table.Th>
              <Table.Th style={{ width: 96 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {fields.map((field) => (
              <Table.Tr key={field.id}>
                <Table.Td>
                  <GripVertical size={16} style={{ color: 'var(--mantine-color-dimmed)', cursor: 'grab' }} />
                </Table.Td>
                <Table.Td>
                  <Text ff="monospace" size="sm">
                    {field.name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text fw={500}>{field.label}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light">{field.type}</Badge>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  {field.required ? <Check size={16} color="green" style={{ margin: '0 auto' }} /> : <X size={16} color="gray" style={{ margin: '0 auto' }} />}
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  {field.searchable ? <Search size={16} color="blue" style={{ margin: '0 auto' }} /> : <X size={16} color="gray" style={{ margin: '0 auto' }} />}
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => {
                        setEditingFieldId(field.id);
                        setEditorRequestId(crypto.randomUUID());
                        setFieldEditorOpen(true);
                      }}
                    >
                      <Edit size={14} />
                    </ActionIcon>
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete-field" />
                      <input type="hidden" name="fieldId" value={field.id} />
                      <ActionIcon variant="subtle" color="red" size="sm" type="submit">
                        <Trash2 size={14} />
                      </ActionIcon>
                    </Form>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {fields.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text ta="center" py="xl" c="dimmed">
                    Keine Profilfelder vorhanden.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal opened={fieldEditorOpen && !isFieldSaved} onClose={() => setFieldEditorOpen(false)} title={editingField ? 'Profilfeld bearbeiten' : 'Neues Profilfeld'}>
        <Form method="post">
          <input type="hidden" name="intent" value="save-field" />
          <input type="hidden" name="fieldId" value={editingField?.id || ''} />
          <input type="hidden" name="requestId" value={editorRequestId} />
          <Stack gap="md">
            <TextInput label="Interner Name" name="name" placeholder="z.B. shoeSize" defaultValue={editingField?.name || ''} />
            <TextInput label="Anzeigename" name="label" placeholder="z.B. Schuhgröße" defaultValue={editingField?.label || ''} />
            <Select
              label="Feldtyp"
              name="type"
              placeholder="Typ wählen"
              defaultValue={editingField?.type || 'text'}
              data={[
                { value: 'text', label: 'Text' },
                { value: 'number', label: 'Zahl' },
                { value: 'date', label: 'Datum' },
                { value: 'select', label: 'Auswahl' },
                { value: 'checkbox', label: 'Checkbox' },
                { value: 'url', label: 'URL' },
              ]}
            />
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Pflichtfeld
              </Text>
              <Switch name="required" defaultChecked={editingField?.required} />
            </Group>
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Durchsuchbar
              </Text>
              <Switch name="searchable" defaultChecked={editingField?.searchable ?? true} />
            </Group>
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Im Anmeldeformular anzeigen
              </Text>
              <Switch name="visibleRegistration" defaultChecked={editingField?.visibleRegistration} />
            </Group>
            <TextInput
              label="DSGVO Auto-Löschung (Tage, 0=nie)"
              name="gdprRetentionDays"
              type="number"
              defaultValue={String(editingField?.gdprRetentionDays ?? 0)}
            />
          </Stack>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setFieldEditorOpen(false)} type="button">
              Abbrechen
            </Button>
            <Button type="submit" disabled={navigation.state === 'submitting'}>
              Speichern
            </Button>
          </Group>
        </Form>
      </Modal>
    </>
  );
}
