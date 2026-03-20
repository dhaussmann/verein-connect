/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  Button, ActionIcon, Card, Text, Group as MantineGroup, Stack, Badge,
  TextInput, Select, Modal, Table, Textarea, Menu,
} from "@mantine/core";
import { Plus, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getFirstFieldError } from "@/lib/forms";
import { requireRouteData } from "@/core/runtime/route";
import { listGroupsUseCase } from "@/modules/groups/use-cases/list-groups.use-case";
import { groupFormSchema } from "@/modules/groups/schemas/group.schema";
import { createGroupUseCase } from "@/modules/groups/use-cases/create-group.use-case";
import { updateGroupUseCase } from "@/modules/groups/use-cases/update-group.use-case";
import { deleteGroupUseCase } from "@/modules/groups/use-cases/delete-group.use-case";
import type { GroupListItem } from "@/modules/groups/types/group.types";

const categoryLabel: Record<string, string> = {
  standard: "Standard",
  team: "Team / Mannschaft",
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  return listGroupsUseCase(env, user.orgId);
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const requestId = String(formData.get("requestId") || "");

  try {
    if (intent === "create-group" || intent === "update-group") {
      const parsed = groupFormSchema.safeParse({
        name: formData.get("name"),
        description: formData.get("description"),
        category: formData.get("category"),
      });
      if (!parsed.success) return { success: false, intent, error: getFirstFieldError(parsed.error.issues) || "Bitte Eingaben prüfen" };

      if (intent === "create-group") {
        await createGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, ...parsed.data });
      } else {
        const groupId = String(formData.get("groupId") || "");
        if (!groupId) return { success: false, intent, error: "Gruppe fehlt" };
        await updateGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId, ...parsed.data });
      }
      return { success: true, intent, requestId };
    }

    if (intent === "delete-group") {
      const groupId = String(formData.get("groupId") || "");
      if (!groupId) return { success: false, intent, error: "Gruppe fehlt" };
      await deleteGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId });
      return { success: true, intent, requestId };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : "Fehler", requestId };
  }

  return { success: false, error: "Unbekannte Aktion", requestId };
}

export default function GroupsListRoute() {
  const { groups } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupListItem | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "standard" });
  const [editorRequestId, setEditorRequestId] = useState(() => crypto.randomUUID());
  const isEditorSaved = actionData?.success
    && (actionData.intent === "create-group" || actionData.intent === "update-group")
    && actionData.requestId === editorRequestId;

  const openCreate = () => {
    setEditingGroup(null);
    setForm({ name: "", description: "", category: "standard" });
    setEditorRequestId(crypto.randomUUID());
    setDialogOpen(true);
  };

  const openEdit = (group: GroupListItem) => {
    setEditingGroup(group);
    setForm({ name: group.name, description: group.description || "", category: group.category || "standard" });
    setEditorRequestId(crypto.randomUUID());
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Gruppen & Mannschaften"
        action={
          <Button onClick={openCreate} leftSection={<Plus size={16} />}>
            Neue Gruppe
          </Button>
        }
      />

      {actionData?.error && (
        <Text c="red" size="sm" mb="sm">
          {actionData.error}
        </Text>
      )}
      {actionData?.success && (
        <Text c="green" size="sm" mb="sm">
          Gruppe gespeichert.
        </Text>
      )}

      <Card shadow="sm" p="md">
        {groups.length === 0 ? (
          <Stack align="center" py="xl">
            <Users size={48} style={{ opacity: 0.4 }} />
            <Text c="dimmed">Noch keine Gruppen vorhanden.</Text>
            <Button mt="sm" onClick={openCreate} leftSection={<Plus size={16} />}>
              Erste Gruppe erstellen
            </Button>
          </Stack>
        ) : (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Kategorie</Table.Th>
                <Table.Th visibleFrom="md">Beschreibung</Table.Th>
                <Table.Th w={40} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {groups.map((group) => (
                <Table.Tr key={group.id}>
                  <Table.Td fw={500}>
                    <Link to={`/groups/${group.id}`}>{group.name}</Link>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={group.category === "team" ? "blue" : "gray"}>
                      {categoryLabel[group.category || "standard"] || group.category}
                    </Badge>
                  </Table.Td>
                  <Table.Td visibleFrom="md" c="dimmed">{group.description || "–"}</Table.Td>
                  <Table.Td onClick={(event) => event.stopPropagation()}>
                    <Menu position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="subtle" size="sm">
                          <MoreHorizontal size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<Pencil size={14} />} onClick={() => openEdit(group)}>
                          Bearbeiten
                        </Menu.Item>
                        <Form method="post">
                          <input type="hidden" name="intent" value="delete-group" />
                          <input type="hidden" name="groupId" value={group.id} />
                          <Menu.Item leftSection={<Trash2 size={14} />} color="red" component="button" type="submit">
                            Löschen
                          </Menu.Item>
                        </Form>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal opened={dialogOpen && !isEditorSaved} onClose={() => setDialogOpen(false)} title={editingGroup ? "Gruppe bearbeiten" : "Neue Gruppe"} size="md">
        <Form method="post">
          <input type="hidden" name="intent" value={editingGroup ? "update-group" : "create-group"} />
          <input type="hidden" name="groupId" value={editingGroup?.id || ""} />
          <input type="hidden" name="requestId" value={editorRequestId} />
          <Stack gap="md">
            <TextInput
              label="Name *"
              name="name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="z.B. Herren 1, A-Jugend..."
            />
            <Select
              label="Kategorie"
              name="category"
              value={form.category}
              onChange={(value) => setForm((current) => ({ ...current, category: value ?? "standard" }))}
              data={[
                { value: "standard", label: "Standard" },
                { value: "team", label: "Team / Mannschaft" },
              ]}
            />
            <Textarea
              label="Beschreibung (optional)"
              name="description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={3}
            />
          </Stack>
          <MantineGroup justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setDialogOpen(false)} type="button">Abbrechen</Button>
            <Button type="submit" disabled={navigation.state === "submitting"}>
              {navigation.state === "submitting" ? "Speichern..." : "Speichern"}
            </Button>
          </MantineGroup>
        </Form>
      </Modal>
    </div>
  );
}
