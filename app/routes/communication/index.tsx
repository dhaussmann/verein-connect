import { NavLink, Form, useActionData, useLoaderData, useSearchParams } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ActionIcon, Badge, Button, Card, Group, Menu, Select, Table, Text } from "@mantine/core";
import { Copy, Eye, Mail, MoreHorizontal, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { buildSearchParams } from "@/lib/search-params";
import { requireRouteData } from "@/core/runtime/route";
import { deleteMessageUseCase, duplicateMessageUseCase, getMessagesDataUseCase, sendMessageUseCase } from "@/modules/communication/use-cases/communication.use-cases";
import { CommunicationTabs } from "@/components/communication/CommunicationTabs";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel") || "all";
  const status = url.searchParams.get("status") || "all";
  const messages = await getMessagesDataUseCase(env, user.orgId, { channel, status });
  return {
    messages,
    filters: { channel, status },
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const messageId = String(formData.get("messageId") || "");
  try {
    if (!messageId) return { success: false, error: "Nachricht fehlt" };
    if (intent === "send") await sendMessageUseCase(env, { orgId: user.orgId, actorUserId: user.id, messageId });
    else if (intent === "delete") await deleteMessageUseCase(env, { orgId: user.orgId, actorUserId: user.id, messageId });
    else if (intent === "duplicate") await duplicateMessageUseCase(env, { orgId: user.orgId, actorUserId: user.id, messageId });
    else return { success: false, error: "Unbekannte Aktion" };
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Aktion fehlgeschlagen" };
  }
}

const channelIcon = (channel: string) => <Mail size={16} />;
const statusColor = (status: string) => status === "Gesendet" ? "green" : status === "Entwurf" ? "gray" : "yellow";

export default function CommunicationMessagesRoute() {
  const { messages, filters } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();
  return (
    <div>
      <PageHeader title="Kommunikation" />
      <CommunicationTabs value="messages" />
      {actionData?.error && <Text c="red" size="sm" mb="sm">{actionData.error}</Text>}
      <Group gap="sm" mb="md" wrap="wrap">
        <Select
          value={filters.channel}
          w={144}
          placeholder="Kanal"
          data={[{ value: "all", label: "Alle Kanäle" }, { value: "email", label: "E-Mail" }]}
          onChange={(value) => setSearchParams(buildSearchParams(searchParams, { channel: value ?? "all" }, { resetPageOnChange: false }))}
        />
        <Select
          value={filters.status}
          w={144}
          placeholder="Status"
          data={[{ value: "all", label: "Alle" }, { value: "Entwurf", label: "Entwurf" }, { value: "Gesendet", label: "Gesendet" }]}
          onChange={(value) => setSearchParams(buildSearchParams(searchParams, { status: value ?? "all" }, { resetPageOnChange: false }))}
        />
        <div style={{ marginLeft: "auto" }}><Button component={NavLink} to="/communication/email">Neue Nachricht</Button></div>
      </Group>
      <Card withBorder><Table><Table.Thead><Table.Tr><Table.Th>Betreff</Table.Th><Table.Th style={{ width: 64 }}>Kanal</Table.Th><Table.Th>Empfänger</Table.Th><Table.Th>Datum</Table.Th><Table.Th>Status</Table.Th><Table.Th style={{ width: 48 }} /></Table.Tr></Table.Thead><Table.Tbody>{messages.map((message, index) => <Table.Tr key={message.id} style={index % 2 === 1 ? { background: "var(--mantine-color-gray-0)" } : undefined}><Table.Td fw={500}>{message.subject}</Table.Td><Table.Td>{channelIcon(message.channel)}</Table.Td><Table.Td c="dimmed">{message.recipients}</Table.Td><Table.Td c="dimmed">{message.sentDate || "–"}</Table.Td><Table.Td><Badge variant="outline" color={statusColor(message.status)}>{message.status}</Badge></Table.Td><Table.Td><Menu position="bottom-end"><Menu.Target><ActionIcon variant="subtle"><MoreHorizontal size={16} /></ActionIcon></Menu.Target><Menu.Dropdown><Menu.Item leftSection={<Eye size={16} />}>Öffnen</Menu.Item><Form method="post"><input type="hidden" name="intent" value="duplicate" /><input type="hidden" name="messageId" value={message.id} /><Menu.Item component="button" type="submit" leftSection={<Copy size={16} />}>Duplizieren</Menu.Item></Form>{message.status !== "Gesendet" && <Form method="post"><input type="hidden" name="intent" value="send" /><input type="hidden" name="messageId" value={message.id} /><Menu.Item component="button" type="submit" leftSection={<Mail size={16} />}>Jetzt senden</Menu.Item></Form>}<Form method="post"><input type="hidden" name="intent" value="delete" /><input type="hidden" name="messageId" value={message.id} /><Menu.Item component="button" type="submit" color="red" leftSection={<Trash2 size={16} />}>Löschen</Menu.Item></Form></Menu.Dropdown></Menu></Table.Td></Table.Tr>)}</Table.Tbody></Table></Card>
    </div>
  );
}
