import { useState } from 'react';
import { Form, useActionData, useFetcher, useLoaderData, useNavigation, useSearchParams } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { Search, UserPlus, Users } from 'lucide-react';
import { createUserFormSchema } from '@/core/schemas/forms';
import { getFirstFieldError } from '@/lib/forms';
import { requireRouteData } from '@/core/runtime/route';
import {
  createSettingsUserUseCase,
  getSettingsRolesUseCase,
  getSettingsUsersUseCase,
  toggleOrgAdminRoleUseCase,
} from '@/modules/settings/use-cases/settings.use-cases';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const url = new URL(request.url);
  const search = (url.searchParams.get('search') || '').toLowerCase();
  const [users, roles] = await Promise.all([
    getSettingsUsersUseCase(env, user.orgId, search),
    getSettingsRolesUseCase(env, user.orgId),
  ]);
  return {
    users,
    roles,
    filters: { search: url.searchParams.get('search') || '' },
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get('intent') || '');
  const requestId = String(formData.get('requestId') || '');

  try {
    if (intent === 'create-user') {
      const roleIds = formData.getAll('role_ids').map(String);
      const parsed = createUserFormSchema.safeParse({
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        role_ids: roleIds,
      });
      if (!parsed.success) {
        return {
          success: false,
          intent,
          error: getFirstFieldError(parsed.error.issues) || 'Bitte die Eingaben prüfen',
        };
      }

      await createSettingsUserUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        password: parsed.data.password,
        roleIds: parsed.data.role_ids,
      });
      return { success: true, intent, requestId };
    }

    if (intent === 'toggle-admin') {
      const targetUserId = String(formData.get('userId') || '');
      if (!targetUserId) return { success: false, intent, error: 'Benutzer fehlt' };
      const result = await toggleOrgAdminRoleUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        targetUserId,
      });
      return { success: true, intent, isAdmin: result.isAdmin, requestId };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : 'Speichern fehlgeschlagen', requestId };
  }

  return { success: false, error: 'Unbekannte Aktion', requestId };
}

export default function SettingsUsersRoute() {
  const { users, roles, filters } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const toggleFetcher = useFetcher<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [createUserRequestId, setCreateUserRequestId] = useState(() => crypto.randomUUID());
  const isCreateUserSaved = actionData?.success
    && actionData.intent === 'create-user'
    && actionData.requestId === createUserRequestId;

  return (
    <>
      <Group justify="space-between" align="center" mb="md">
        <Text fw={600} size="lg" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={20} /> Benutzer verwalten
        </Text>
        <Button onClick={() => { setCreateUserRequestId(crypto.randomUUID()); setUserDialogOpen(true); }} leftSection={<UserPlus size={16} />}>
          Neuer Benutzer
        </Button>
      </Group>

      {toggleFetcher.data?.success && toggleFetcher.data.intent === 'toggle-admin' && (
        <Text c="green" size="sm" mb="sm">
          Admin-Rolle aktualisiert.
        </Text>
      )}
      {actionData?.error && (
        <Text c="red" size="sm" mb="sm">
          {actionData.error}
        </Text>
      )}

      <TextInput
        mb="md"
        placeholder="Benutzer suchen..."
        leftSection={<Search size={16} />}
        value={filters.search}
        onChange={(event) => {
          const next = new URLSearchParams(searchParams);
          if (!event.target.value) next.delete('search');
          else next.set('search', event.target.value);
          setSearchParams(next);
        }}
      />

      <Card>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Benutzer</Table.Th>
              <Table.Th>E-Mail</Table.Th>
              <Table.Th>Rollen</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Admin</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.map((user) => {
              const isAdmin = user.roles.includes('org_admin');
              return (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Avatar size="sm" color="blue">
                        {user.avatarInitials}
                      </Avatar>
                      <Text fw={500}>
                        {user.firstName} {user.lastName}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text c="dimmed">{user.email}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {user.roles.map((role) => (
                        <Badge key={role} variant="outline" color={role === 'org_admin' ? 'blue' : 'gray'}>
                          {role === 'org_admin' ? 'Admin' : role === 'trainer' ? 'Trainer' : role === 'member' ? 'Mitglied' : role}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="outline" color={user.status === 'Aktiv' ? 'green' : 'gray'}>
                      {user.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    <toggleFetcher.Form method="post">
                      <input type="hidden" name="intent" value="toggle-admin" />
                      <input type="hidden" name="userId" value={user.id} />
                      <Switch checked={isAdmin} onChange={(event) => event.currentTarget.form?.requestSubmit()} />
                    </toggleFetcher.Form>
                  </Table.Td>
                </Table.Tr>
              );
            })}
            {users.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" py="xl" c="dimmed">
                    Keine Benutzer gefunden.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>
      <Text size="xs" c="dimmed" mt="xs">
        {users.length} Benutzer insgesamt
      </Text>

      <Modal opened={userDialogOpen && !isCreateUserSaved} onClose={() => setUserDialogOpen(false)} title="Neuen Benutzer anlegen" size="md">
        <Form method="post">
          <input type="hidden" name="intent" value="create-user" />
          <input type="hidden" name="requestId" value={createUserRequestId} />
          <Stack gap="sm">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <TextInput label="Vorname *" name="firstName" required />
              <TextInput label="Nachname *" name="lastName" required />
            </div>
            <TextInput label="E-Mail *" name="email" type="email" required />
            <TextInput label="Passwort *" name="password" type="password" required minLength={8} placeholder="Mind. 8 Zeichen" />
            <div>
              <Text size="sm" fw={500} mb="xs">
                Rollen zuweisen
              </Text>
              <Stack gap="xs">
                {roles.map((role) => (
                  <Checkbox
                    key={role.id}
                    name="role_ids"
                    value={role.id}
                    defaultChecked={role.name === 'member'}
                    label={role.name === 'org_admin' ? 'Admin' : role.name === 'member' ? 'Mitglied' : role.name === 'trainer' ? 'Trainer' : role.name}
                  />
                ))}
              </Stack>
            </div>
            {actionData?.intent === 'create-user' && actionData.error && (
              <Text size="sm" c="red">
                {actionData.error}
              </Text>
            )}
          </Stack>
          <Group justify="flex-end" mt="md">
            <Button type="button" variant="subtle" onClick={() => setUserDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={navigation.state === 'submitting'}>
              {navigation.state === 'submitting' ? 'Erstelle...' : 'Benutzer erstellen'}
            </Button>
          </Group>
        </Form>
      </Modal>
    </>
  );
}
