import { useMemo, useState } from "react";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  Button, ActionIcon, Card, Text, Group, Stack, Badge,
  TextInput, Select, Modal, Table,
} from "@mantine/core";
import { ArrowLeft, Plus, Trash2, Users, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireRouteData } from "@/core/runtime/route";
import { getGroupDetailUseCase } from "@/modules/groups/use-cases/get-group-detail.use-case";
import { addGroupMemberUseCase } from "@/modules/groups/use-cases/add-group-member.use-case";
import { removeGroupMemberUseCase } from "@/modules/groups/use-cases/remove-group-member.use-case";

const categoryLabel: Record<string, string> = {
  standard: "Standard",
  team: "Team / Mannschaft",
};

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const groupId = params.id;
  if (!groupId) throw new Error("Gruppen-ID fehlt");
  return getGroupDetailUseCase(env, { orgId: user.orgId, groupId });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const groupId = params.id;
  if (!groupId) return { success: false, error: "Gruppen-ID fehlt" };

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  try {
    if (intent === "add-member") {
      const userId = String(formData.get("userId") || "");
      if (!userId) return { success: false, intent, error: "Mitglied fehlt" };
      await addGroupMemberUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId, userId });
      return { success: true, intent };
    }
    if (intent === "remove-member") {
      const userId = String(formData.get("userId") || "");
      if (!userId) return { success: false, intent, error: "Mitglied fehlt" };
      await removeGroupMemberUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId, userId });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : "Fehler" };
  }

  return { success: false, error: "Unbekannte Aktion" };
}

export default function GroupDetailRoute() {
  const { group, groupMembers, availableMembers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  const filteredAvailableMembers = useMemo(() => {
    if (!memberSearch.trim()) return availableMembers;
    const query = memberSearch.toLowerCase();
    return availableMembers.filter((member) =>
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(query)
      || member.email.toLowerCase().includes(query),
    );
  }, [availableMembers, memberSearch]);

  if (!group) {
    return (
      <div>
        <PageHeader title="Gruppe nicht gefunden" />
        <Button variant="outline" component={Link} to="/groups" leftSection={<ArrowLeft size={16} />}>
          Zurück
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={group.name}
        action={
          <Button variant="outline" size="sm" component={Link} to="/groups" leftSection={<ArrowLeft size={16} />}>
            Zurück
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
          Gruppe aktualisiert.
        </Text>
      )}

      <Group gap="sm" mb="lg">
        <Badge color={group.category === "team" ? "blue" : "gray"}>
          {categoryLabel[group.category || "standard"] || group.category}
        </Badge>
        {group.description && (
          <Text size="sm" c="dimmed">{group.description}</Text>
        )}
      </Group>

      <Card shadow="sm" p="md">
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <Users size={16} />
            <Text fw={600} size="sm">Mitglieder ({groupMembers.length})</Text>
          </Group>
          <Button
            size="sm"
            leftSection={<Plus size={16} />}
            onClick={() => {
              setAddDialogOpen(true);
              setMemberSearch("");
              setSelectedUserId("");
            }}
          >
            Mitglied hinzufügen
          </Button>
        </Group>

        {groupMembers.length === 0 ? (
          <Stack align="center" py="xl">
            <Users size={48} style={{ opacity: 0.4 }} />
            <Text c="dimmed">Noch keine Mitglieder in dieser Gruppe.</Text>
            <Button
              size="sm"
              leftSection={<Plus size={16} />}
              onClick={() => {
                setAddDialogOpen(true);
                setMemberSearch("");
                setSelectedUserId("");
              }}
            >
              Erstes Mitglied hinzufügen
            </Button>
          </Stack>
        ) : (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>E-Mail</Table.Th>
                <Table.Th>Beigetreten</Table.Th>
                <Table.Th w={40} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {groupMembers.map((member) => (
                <Table.Tr key={member.id}>
                  <Table.Td fw={500}>
                    <Link to={`/members/${member.userId}`}>{member.firstName} {member.lastName}</Link>
                  </Table.Td>
                  <Table.Td c="dimmed">{member.email}</Table.Td>
                  <Table.Td c="dimmed">
                    {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("de-DE") : "–"}
                  </Table.Td>
                  <Table.Td onClick={(event) => event.stopPropagation()}>
                    <Form method="post">
                      <input type="hidden" name="intent" value="remove-member" />
                      <input type="hidden" name="userId" value={member.userId} />
                      <ActionIcon variant="subtle" color="red" size="sm" type="submit">
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Form>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal opened={addDialogOpen} onClose={() => setAddDialogOpen(false)} title={`Mitglied zu "${group.name}" hinzufügen`} size="md">
        <Form method="post">
          <input type="hidden" name="intent" value="add-member" />
          <Stack gap="md">
            <TextInput
              label="Mitglied suchen"
              placeholder="Name oder E-Mail..."
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              leftSection={<Search size={16} />}
            />
            <Select
              label="Mitglied auswählen"
              name="userId"
              value={selectedUserId}
              onChange={(value) => setSelectedUserId(value ?? "")}
              placeholder="Mitglied wählen..."
              data={
                filteredAvailableMembers.length === 0
                  ? []
                  : filteredAvailableMembers.map((member) => ({
                      value: member.id,
                      label: `${member.firstName} ${member.lastName} — ${member.email}`,
                    }))
              }
              nothingFoundMessage="Keine verfügbaren Mitglieder gefunden"
              searchable
            />
          </Stack>
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} type="button">Abbrechen</Button>
            <Button type="submit" disabled={!selectedUserId || navigation.state === "submitting"}>
              {navigation.state === "submitting" ? "Wird hinzugefügt..." : "Hinzufügen"}
            </Button>
          </Group>
        </Form>
      </Modal>
    </div>
  );
}
