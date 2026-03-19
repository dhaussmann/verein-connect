/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { Edit, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { requireRouteData } from "@/core/runtime/route";
import {
  createOrUpdateRoleUseCase,
  deleteRoleUseCase,
  getSettingsRolesUseCase,
} from "../use-cases/settings.use-cases";
import { rolePermissionActions, rolePermissionCategories } from "./settings.constants";

const roleSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich"),
  description: z.string().trim().optional(),
  category: z.enum(["general", "team", "department", "system"]),
});

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const roles = await getSettingsRolesUseCase(env, user.orgId);
  return { roles };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  try {
    if (intent === "save-role") {
      const parsed = roleSchema.safeParse({
        name: formData.get("name"),
        description: formData.get("description"),
        category: formData.get("category"),
      });
      if (!parsed.success) {
        return { success: false, intent, error: parsed.error.issues[0]?.message || "Bitte Eingaben prüfen" };
      }

      const permissions = formData.getAll("permissions").map(String);
      await createOrUpdateRoleUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        roleId: String(formData.get("roleId") || "") || undefined,
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        permissions,
      });
      return { success: true, intent };
    }

    if (intent === "delete-role") {
      const roleId = String(formData.get("roleId") || "");
      if (!roleId) return { success: false, intent, error: "Rolle fehlt" };
      await deleteRoleUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        roleId,
      });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : "Speichern fehlgeschlagen" };
  }

  return { success: false, error: "Unbekannte Aktion" };
}

export default function SettingsRolesRoute() {
  const { roles } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  useEffect(() => {
    if (actionData?.success && actionData.intent === "save-role") {
      setRoleEditorOpen(false);
      setEditingRoleId(null);
    }
  }, [actionData]);

  const editingRole = roles.find((role) => role.id === editingRoleId) || null;

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="lg">
          Rollen & Berechtigungen
        </Text>
        <Button
          onClick={() => {
            setEditingRoleId(null);
            setRoleEditorOpen(true);
          }}
          leftSection={<Plus size={16} />}
        >
          Neue Rolle
        </Button>
      </Group>

      {actionData?.error && (
        <Text c="red" size="sm" mb="sm">
          {actionData.error}
        </Text>
      )}
      {actionData?.success && (
        <Text c="green" size="sm" mb="sm">
          Rollen wurden aktualisiert.
        </Text>
      )}

      <Stack gap="xs">
        {roles.map((role) => (
          <Card key={role.id}>
            <Group justify="space-between" align="flex-start">
              <div style={{ flex: 1 }}>
                <Group gap="xs" mb={4}>
                  <Text fw={600}>{role.name}</Text>
                  <Badge variant="light">{role.category}</Badge>
                  {role.isSystem && (
                    <Badge variant="outline" size="xs">
                      System
                    </Badge>
                  )}
                </Group>
                <Text size="sm" c="dimmed" mb="xs">
                  {role.description}
                </Text>
                <Group gap="xs">
                  <Text size="sm" c="dimmed">
                    {role.memberCount} Mitglieder
                  </Text>
                  {role.permissions.length > 0 && (
                    <>
                      <Text size="sm" c="dimmed">
                        ·
                      </Text>
                      <Group gap={4}>
                        {role.permissions.slice(0, 3).map((permission) => (
                          <Badge key={permission} variant="outline" size="xs">
                            {permission}
                          </Badge>
                        ))}
                        {role.permissions.length > 3 && (
                          <Badge variant="outline" size="xs">
                            +{role.permissions.length - 3}
                          </Badge>
                        )}
                      </Group>
                    </>
                  )}
                </Group>
              </div>
              <Group gap={4}>
                <ActionIcon
                  variant="subtle"
                  onClick={() => {
                    setEditingRoleId(role.id);
                    setRoleEditorOpen(true);
                  }}
                >
                  <Edit size={16} />
                </ActionIcon>
                {!role.isSystem && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete-role" />
                    <input type="hidden" name="roleId" value={role.id} />
                    <ActionIcon variant="subtle" color="red" type="submit">
                      <Trash2 size={16} />
                    </ActionIcon>
                  </Form>
                )}
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>

      <Modal
        opened={roleEditorOpen}
        onClose={() => setRoleEditorOpen(false)}
        title={editingRole ? `Rolle bearbeiten: ${editingRole.name}` : "Neue Rolle"}
        size="xl"
        styles={{ body: { maxHeight: "75vh", overflowY: "auto" } }}
      >
        <Form method="post">
          <input type="hidden" name="intent" value="save-role" />
          <input type="hidden" name="roleId" value={editingRole?.id || ""} />
          <Stack gap="md">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <TextInput label="Name" name="name" defaultValue={editingRole?.name || ""} />
              <Select
                label="Kategorie"
                name="category"
                defaultValue={
                  editingRole?.category === "System"
                    ? "system"
                    : editingRole?.category === "Sport"
                      ? "team"
                      : "general"
                }
                data={[
                  { value: "system", label: "System" },
                  { value: "general", label: "Verein" },
                  { value: "team", label: "Sport" },
                  { value: "department", label: "Abteilung" },
                ]}
              />
            </div>
            <TextInput label="Beschreibung" name="description" defaultValue={editingRole?.description || ""} />
            <div>
              <Text size="sm" fw={500} mb="xs">
                Berechtigungs-Matrix
              </Text>
              <div style={{ border: "1px solid var(--mantine-color-gray-3)", borderRadius: 8, overflow: "hidden" }}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Bereich</Table.Th>
                      {rolePermissionActions.map((action) => (
                        <Table.Th key={action} style={{ textAlign: "center", fontSize: 12 }}>
                          {action}
                        </Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rolePermissionCategories.map((category) => (
                      <Table.Tr key={category}>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {category}
                          </Text>
                        </Table.Td>
                        {rolePermissionActions.map((permissionAction) => {
                          const permKey = `${category.toLowerCase()}:${permissionAction.toLowerCase()}`;
                          return (
                            <Table.Td key={permissionAction} style={{ textAlign: "center" }}>
                              <Checkbox name="permissions" value={permKey} defaultChecked={editingRole?.permissions.includes(permKey)} />
                            </Table.Td>
                          );
                        })}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            </div>
          </Stack>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setRoleEditorOpen(false)} type="button">
              Abbrechen
            </Button>
            <Button type="submit" disabled={navigation.state === "submitting"}>
              Speichern
            </Button>
          </Group>
        </Form>
      </Modal>
    </>
  );
}
