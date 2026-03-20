import { useState } from "react";
import { Form, useActionData, useLoaderData, useSearchParams } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  Select,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { AlertTriangle, CheckCircle, FileDown, Mail, MoreHorizontal, Plus, Receipt, Search, Trash2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { RoutePendingOverlay } from "@/components/ui/route-pending-overlay";
import { useRoutePending } from "@/hooks/use-route-pending";
import { buildSearchParams } from "@/core/lib/search-params";
import { requireRouteData } from "@/core/runtime/route";
import { deleteInvoiceUseCase, getInvoicesDataUseCase, markInvoicePaidUseCase } from "@/modules/finance/use-cases/finance.use-cases";
import type { Invoice } from "@/core/types/api";
import { FinanceTabs } from "@/components/finance/FinanceTabs";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const status = url.searchParams.get("status") || "all";
  const response = await getInvoicesDataUseCase(env, user.orgId, { search, status });
  return {
    ...response,
    filters: { search: search || "", status },
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const invoiceId = String(formData.get("invoiceId") || "");

  try {
    if (!invoiceId) return { success: false, error: "Rechnung fehlt" };
    if (intent === "mark-paid") {
      await markInvoicePaidUseCase(env, { orgId: user.orgId, actorUserId: user.id, invoiceId });
      return { success: true };
    }
    if (intent === "delete-invoice") {
      await deleteInvoiceUseCase(env, { orgId: user.orgId, actorUserId: user.id, invoiceId });
      return { success: true };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Aktion fehlgeschlagen" };
  }

  return { success: false, error: "Unbekannte Aktion" };
}

const statusColor = (status: string): string => {
  const map: Record<string, string> = {
    Bezahlt: "green",
    Gesendet: "blue",
    Überfällig: "red",
    Entwurf: "gray",
    Storniert: "gray",
  };
  return map[status] || "gray";
};

export default function FinanceInvoicesRoute() {
  const { data: invoices, summary, filters } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const { isSearchPending } = useRoutePending();

  const fmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " €";
  const updateFilter = (key: string, value: string) => {
    setSearchParams(buildSearchParams(searchParams, { [key]: value }));
  };

  return (
    <div>
      <PageHeader title="Finanzen" action={<Button leftSection={<Plus size={16} />}>Neue Rechnung</Button>} />
      <FinanceTabs value="invoices" />

      {actionData?.error && <Text c="red" size="sm" mb="sm">{actionData.error}</Text>}

      <div className="relative mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RoutePendingOverlay visible={isSearchPending} />
        <Card withBorder><Group gap="sm"><div style={{ padding: 8, borderRadius: 8, background: "var(--mantine-color-yellow-0)" }}><Receipt size={20} color="var(--mantine-color-yellow-6)" /></div><div><Text size="sm" c="dimmed">Offene Rechnungen</Text><Text size="xl" fw={700} c="yellow">{fmt(summary.total_open)}</Text></div></Group></Card>
        <Card withBorder><Group gap="sm"><div style={{ padding: 8, borderRadius: 8, background: "var(--mantine-color-green-0)" }}><CheckCircle size={20} color="var(--mantine-color-green-6)" /></div><div><Text size="sm" c="dimmed">Bezahlt</Text><Text size="xl" fw={700} c="green">{fmt(summary.total_paid)}</Text></div></Group></Card>
        <Card withBorder><Group gap="sm"><div style={{ padding: 8, borderRadius: 8, background: "var(--mantine-color-red-0)" }}><AlertTriangle size={20} color="var(--mantine-color-red-6)" /></div><div><Text size="sm" c="dimmed">Überfällig</Text><Text size="xl" fw={700} c="red">{fmt(summary.total_overdue)}</Text></div></Group></Card>
        <Card withBorder><Group gap="sm"><div style={{ padding: 8, borderRadius: 8, background: "var(--mantine-color-blue-0)" }}><TrendingUp size={20} color="var(--mantine-color-blue-6)" /></div><div><Text size="sm" c="dimmed">Gesamt</Text><Text size="xl" fw={700}>{fmt(summary.total_open + summary.total_paid + summary.total_overdue)}</Text></div></Group></Card>
      </div>

      <Group gap="sm" mb="md" wrap="wrap">
        <TextInput placeholder="Rechnungsnr. oder Name..." value={filters.search} onChange={(e) => updateFilter("search", e.target.value)} leftSection={<Search size={16} />} style={{ flex: 1, minWidth: 200, maxWidth: 384 }} />
        <Select value={filters.status} onChange={(val) => updateFilter("status", val ?? "all")} w={160} placeholder="Status" data={[{ value: "all", label: "Alle" }, { value: "Entwurf", label: "Entwurf" }, { value: "Gesendet", label: "Gesendet" }, { value: "Bezahlt", label: "Bezahlt" }, { value: "Überfällig", label: "Überfällig" }, { value: "Storniert", label: "Storniert" }]} />
      </Group>

      <Card withBorder className="relative">
        <RoutePendingOverlay visible={isSearchPending} />
        {invoices.length === 0 ? (
          <Text ta="center" py="xl" c="dimmed" size="sm">Keine Rechnungen vorhanden.</Text>
        ) : (
          <Table>
            <Table.Thead><Table.Tr><Table.Th>Rechnungsnr.</Table.Th><Table.Th>Mitglied</Table.Th><Table.Th>Datum</Table.Th><Table.Th>Fällig</Table.Th><Table.Th style={{ textAlign: "right" }}>Betrag</Table.Th><Table.Th>Status</Table.Th><Table.Th style={{ width: 48 }} /></Table.Tr></Table.Thead>
            <Table.Tbody>
              {invoices.map((invoice, i) => (
                <Table.Tr key={invoice.id} style={i % 2 === 1 ? { background: "var(--mantine-color-gray-0)" } : undefined}>
                  <Table.Td><button style={{ color: "var(--mantine-color-blue-6)", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setDetailInvoice(invoice)}>{invoice.number}</button></Table.Td>
                  <Table.Td><Group gap="xs"><Avatar size="sm" radius="xl">{invoice.memberInitials}</Avatar><Text size="sm">{invoice.memberName}</Text></Group></Table.Td>
                  <Table.Td c="dimmed">{invoice.date}</Table.Td>
                  <Table.Td c="dimmed">{invoice.dueDate}</Table.Td>
                  <Table.Td style={{ textAlign: "right" }} fw={500}>{invoice.amount}</Table.Td>
                  <Table.Td><Badge variant="outline" color={statusColor(invoice.status)}>{invoice.status}</Badge></Table.Td>
                  <Table.Td><Menu position="bottom-end"><Menu.Target><ActionIcon variant="subtle"><MoreHorizontal size={16} /></ActionIcon></Menu.Target><Menu.Dropdown><Menu.Item leftSection={<FileDown size={16} />}>PDF herunterladen</Menu.Item><Menu.Item leftSection={<Mail size={16} />}>Mahnung senden</Menu.Item><Form method="post"><input type="hidden" name="intent" value="mark-paid" /><input type="hidden" name="invoiceId" value={invoice.id} /><Menu.Item component="button" type="submit" leftSection={<CheckCircle size={16} />}>Bezahlt markieren</Menu.Item></Form><Form method="post"><input type="hidden" name="intent" value="delete-invoice" /><input type="hidden" name="invoiceId" value={invoice.id} /><Menu.Item component="button" type="submit" color="red" leftSection={<Trash2 size={16} />}>Löschen</Menu.Item></Form></Menu.Dropdown></Menu></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal opened={!!detailInvoice} onClose={() => setDetailInvoice(null)} title={detailInvoice?.number || "Rechnung"}>
        {detailInvoice && <Text size="sm" c="dimmed">Detailansicht bleibt fachlich unverändert und kann als eigener View-Component weiter zerlegt werden.</Text>}
      </Modal>
    </div>
  );
}
