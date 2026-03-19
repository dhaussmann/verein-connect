/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Button, Card, Group, Modal, Select, Stack, Table, Text, TextInput } from "@mantine/core";
import { FileDown, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireRouteData } from "@/core/runtime/route";
import { createAccountingEntryUseCase, getAccountingDataUseCase } from "@/modules/finance/use-cases/finance.use-cases";
import { FinanceTabs } from "@/modules/finance/web/FinanceTabs";

const accountingCategories = ["Mitgliedsbeiträge", "Kursgebühren", "Sponsoring", "Veranstaltungen", "Hallenmiete", "Material", "Versicherung", "Personal", "Sonstiges"];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  return getAccountingDataUseCase(env, user.orgId);
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  try {
    const date = String(formData.get("date") || "");
    const type = String(formData.get("type") || "");
    const category = String(formData.get("category") || "");
    const description = String(formData.get("description") || "");
    const amount = Number(formData.get("amount") || 0);
    if (!date || !type || !description || !amount) return { success: false, error: "Bitte alle Pflichtfelder ausfüllen" };
    await createAccountingEntryUseCase(env, { orgId: user.orgId, actorUserId: user.id, entryDate: date, type: type === "Einnahme" ? "income" : "expense", category, description, amount });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Fehler beim Erstellen" };
  }
}

export default function FinanceAccountingRoute() {
  const { entries, summary } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({ date: "", type: "", category: "", description: "", amount: "" });
  const fmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " €";

  return (
    <div>
      <PageHeader title="Finanzen" />
      <FinanceTabs value="accounting" />
      {actionData?.error && <Text c="red" size="sm" mb="sm">{actionData.error}</Text>}
      {actionData?.success && <Text c="green" size="sm" mb="sm">Buchungseintrag erstellt.</Text>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"><Card withBorder><Text size="sm" c="dimmed">Einnahmen</Text><Text size="xl" fw={700} c="green">{fmt(summary.income)}</Text></Card><Card withBorder><Text size="sm" c="dimmed">Ausgaben</Text><Text size="xl" fw={700} c="red">{fmt(summary.expense)}</Text></Card><Card withBorder><Text size="sm" c="dimmed">Saldo</Text><Text size="xl" fw={700} c={summary.balance >= 0 ? "green" : "red"}>{fmt(summary.balance)}</Text></Card></div>
      <Group justify="space-between" align="center" mb="md"><Text fw={600}>Buchungseinträge</Text><Group gap="xs"><Button variant="outline" size="sm" leftSection={<FileDown size={16} />}>Excel Export</Button><Button size="sm" leftSection={<Plus size={16} />} onClick={() => setNewEntryOpen(true)}>Neuer Eintrag</Button></Group></Group>
      <Card withBorder>{entries.length === 0 ? <Text ta="center" py="xl" c="dimmed" size="sm">Keine Buchungseinträge vorhanden.</Text> : <Table><Table.Thead><Table.Tr><Table.Th>Datum</Table.Th><Table.Th>Typ</Table.Th><Table.Th>Kategorie</Table.Th><Table.Th>Beschreibung</Table.Th><Table.Th style={{ textAlign: "right" }}>Betrag</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{entries.map((entry, i) => <Table.Tr key={entry.id} style={i % 2 === 1 ? { background: "var(--mantine-color-gray-0)" } : undefined}><Table.Td c="dimmed">{entry.date}</Table.Td><Table.Td><Text c={entry.type === "Einnahme" ? "green" : "red"}>{entry.type}</Text></Table.Td><Table.Td>{entry.category}</Table.Td><Table.Td>{entry.description}</Table.Td><Table.Td style={{ textAlign: "right" }} fw={500} c={entry.type === "Einnahme" ? "green" : "red"}>{entry.type === "Ausgabe" ? "-" : "+"}{entry.amount}</Table.Td></Table.Tr>)}</Table.Tbody></Table>}</Card>
      <Modal opened={newEntryOpen} onClose={() => setNewEntryOpen(false)} title="Neuer Buchungseintrag"><Form method="post"><Stack gap="sm"><TextInput label="Datum" name="date" type="date" value={entryForm.date} onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))} /><Select label="Typ" name="type" value={entryForm.type} onChange={(v) => setEntryForm((f) => ({ ...f, type: v ?? "" }))} placeholder="Auswählen" data={[{ value: "Einnahme", label: "Einnahme" }, { value: "Ausgabe", label: "Ausgabe" }]} /><Select label="Kategorie" name="category" value={entryForm.category} onChange={(v) => setEntryForm((f) => ({ ...f, category: v ?? "" }))} placeholder="Kategorie" data={accountingCategories.map((c) => ({ value: c, label: c }))} /><TextInput label="Beschreibung" name="description" placeholder="Beschreibung..." value={entryForm.description} onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))} /><TextInput label="Betrag (€)" name="amount" type="number" step="0.01" placeholder="0,00" value={entryForm.amount} onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))} /></Stack><Group justify="flex-end" mt="md"><Button variant="subtle" onClick={() => setNewEntryOpen(false)} type="button">Abbrechen</Button><Button type="submit" disabled={navigation.state === "submitting"}>Speichern</Button></Group></Form></Modal>
    </div>
  );
}
