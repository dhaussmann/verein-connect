import { useState } from "react";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  Button, ActionIcon, Card, Text, Group as MantineGroup, Stack, Badge,
  TextInput, Select, Modal, Table, Textarea, Menu, Switch,
} from "@mantine/core";
import { Plus, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getFirstFieldError } from "@/core/lib/forms";
import { requireRouteData } from "@/core/runtime/route";
import { groupGenderOptions, groupTypeOptions, groupVisibilityOptions, hockeyAgeBandOptions } from "@/modules/hockey/hockey-options";
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

const groupTypeLabel = Object.fromEntries(groupTypeOptions.map((option) => [option.value, option.label]));

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
        groupType: formData.get("groupType"),
        ageBand: formData.get("ageBand"),
        genderScope: formData.get("genderScope"),
        season: formData.get("season"),
        league: formData.get("league"),
        location: formData.get("location"),
        trainingFocus: formData.get("trainingFocus"),
        visibility: formData.get("visibility"),
        admissionOpen: formData.get("admissionOpen") ? "on" : "false",
        maxMembers: formData.get("maxMembers"),
        maxGoalies: formData.get("maxGoalies"),
      });
      if (!parsed.success) return { success: false, intent, error: getFirstFieldError(parsed.error.issues) || "Bitte Eingaben prüfen" };

      const payload = {
        ...parsed.data,
        admissionOpen: parsed.data.admissionOpen !== "false",
        maxMembers: parsed.data.maxMembers ? Number(parsed.data.maxMembers) : null,
        maxGoalies: parsed.data.maxGoalies ? Number(parsed.data.maxGoalies) : null,
      };

      if (intent === "create-group") {
        await createGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, ...payload });
      } else {
        const groupId = String(formData.get("groupId") || "");
        if (!groupId) return { success: false, intent, error: "Gruppe fehlt" };
        await updateGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId, ...payload });
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
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "standard",
    groupType: "standard",
    ageBand: "",
    genderScope: "mixed",
    season: "",
    league: "",
    location: "",
    trainingFocus: "",
    visibility: "internal",
    admissionOpen: true,
    maxMembers: "",
    maxGoalies: "",
  });
  const [editorRequestId, setEditorRequestId] = useState(() => crypto.randomUUID());
  const isEditorSaved = actionData?.success
    && (actionData.intent === "create-group" || actionData.intent === "update-group")
    && actionData.requestId === editorRequestId;

  const openCreate = () => {
    setEditingGroup(null);
    setForm({
      name: "",
      description: "",
      category: "standard",
      groupType: "standard",
      ageBand: "",
      genderScope: "mixed",
      season: "",
      league: "",
      location: "",
      trainingFocus: "",
      visibility: "internal",
      admissionOpen: true,
      maxMembers: "",
      maxGoalies: "",
    });
    setEditorRequestId(crypto.randomUUID());
    setDialogOpen(true);
  };

  const openEdit = (group: GroupListItem) => {
    setEditingGroup(group);
    setForm({
      name: group.name,
      description: group.description || "",
      category: group.category || "standard",
      groupType: group.groupType || "standard",
      ageBand: group.ageBand || "",
      genderScope: group.genderScope || "mixed",
      season: group.season || "",
      league: group.league || "",
      location: group.location || "",
      trainingFocus: group.trainingFocus || "",
      visibility: group.visibility || "internal",
      admissionOpen: group.admissionOpen,
      maxMembers: group.maxMembers ? String(group.maxMembers) : "",
      maxGoalies: group.maxGoalies ? String(group.maxGoalies) : "",
    });
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
                <Table.Th>Typ</Table.Th>
                <Table.Th visibleFrom="md">Saison / Liga</Table.Th>
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
                      {groupTypeLabel[group.groupType || "standard"] || categoryLabel[group.category || "standard"] || group.groupType}
                    </Badge>
                  </Table.Td>
                  <Table.Td visibleFrom="md" c="dimmed">
                    {[group.season, group.league].filter(Boolean).join(" · ") || "–"}
                  </Table.Td>
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

      <Modal opened={dialogOpen && !isEditorSaved} onClose={() => setDialogOpen(false)} title={editingGroup ? "Gruppe bearbeiten" : "Neue Gruppe"} size="lg">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Gruppen-Typ"
                name="groupType"
                value={form.groupType}
                onChange={(value) => setForm((current) => ({ ...current, groupType: value ?? "standard" }))}
                data={groupTypeOptions}
              />
              <Select
                label="Altersklasse"
                name="ageBand"
                value={form.ageBand || null}
                onChange={(value) => setForm((current) => ({ ...current, ageBand: value ?? "" }))}
                data={hockeyAgeBandOptions.map((value) => ({ value, label: value }))}
                clearable
              />
              <Select
                label="Geschlecht"
                name="genderScope"
                value={form.genderScope}
                onChange={(value) => setForm((current) => ({ ...current, genderScope: value ?? "mixed" }))}
                data={groupGenderOptions}
              />
              <Select
                label="Sichtbarkeit"
                name="visibility"
                value={form.visibility}
                onChange={(value) => setForm((current) => ({ ...current, visibility: value ?? "internal" }))}
                data={groupVisibilityOptions}
              />
              <TextInput
                label="Saison"
                name="season"
                value={form.season}
                onChange={(event) => setForm((current) => ({ ...current, season: event.target.value }))}
                placeholder="z.B. 2025/26"
              />
              <TextInput
                label="Liga"
                name="league"
                value={form.league}
                onChange={(event) => setForm((current) => ({ ...current, league: event.target.value }))}
              />
              <TextInput
                label="Standort / Eishalle"
                name="location"
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              />
              <TextInput
                label="Trainingsfokus"
                name="trainingFocus"
                value={form.trainingFocus}
                onChange={(event) => setForm((current) => ({ ...current, trainingFocus: event.target.value }))}
                placeholder="z.B. Wettkampf, Entwicklung, Goalie"
              />
              <TextInput
                label="Max. Mitglieder"
                name="maxMembers"
                value={form.maxMembers}
                onChange={(event) => setForm((current) => ({ ...current, maxMembers: event.target.value }))}
              />
              <TextInput
                label="Max. Torhueter"
                name="maxGoalies"
                value={form.maxGoalies}
                onChange={(event) => setForm((current) => ({ ...current, maxGoalies: event.target.value }))}
              />
            </div>
            <Textarea
              label="Beschreibung (optional)"
              name="description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={3}
            />
            <Switch
              label="Aufnahme neuer Mitglieder offen"
              name="admissionOpen"
              checked={form.admissionOpen}
              onChange={(event) => setForm((current) => ({ ...current, admissionOpen: event.currentTarget.checked }))}
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
