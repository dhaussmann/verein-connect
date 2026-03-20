import type { AccountingEntry, Invoice } from "@/lib/api";
import { writeAuditLog } from "@/core/lib/audit";
import type { RouteEnv } from "@/core/runtime/route";
import { financeRepository } from "../repository/finance.repository";

function mapInvoiceStatus(status: string | null) {
  const statusMap: Record<string, string> = {
    draft: "Entwurf",
    sent: "Gesendet",
    paid: "Bezahlt",
    overdue: "Überfällig",
    cancelled: "Storniert",
  };
  return statusMap[status || "draft"] || status || "Entwurf";
}

export async function getInvoicesDataUseCase(
  env: RouteEnv,
  orgId: string,
  filters: { search?: string; status?: string } = {},
) {
  const repo = financeRepository(env);
  const matchingUsers = filters.search ? await repo.findUsersByOrgAndName(orgId, filters.search) : [];
  const userSearchIds = matchingUsers.map((user) => user.id);
  const rows = await repo.listInvoicesByOrg(orgId, {
    status: filters.status,
    search: filters.search,
    userIds: filters.search ? userSearchIds : undefined,
  });
  const userIds = [...new Set(rows.map((invoice) => invoice.userId).filter((id): id is string => Boolean(id)))];
  const invoiceIds = rows.map((invoice) => invoice.id);

  const [users, items] = await Promise.all([
    repo.findUsersByIds(userIds),
    repo.listInvoiceItemsByInvoiceIds(invoiceIds),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const itemsByInvoiceId = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByInvoiceId.get(item.invoiceId) || [];
    list.push(item);
    itemsByInvoiceId.set(item.invoiceId, list);
  }

  const data: Invoice[] = rows.map((invoice) => {
    const user = usersById.get(invoice.userId);
    const invoiceItems = itemsByInvoiceId.get(invoice.id) || [];
    const memberName = user ? `${user.firstName} ${user.lastName}` : "";
    const initials = user ? `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase() : "";

    return {
      id: invoice.id,
      number: invoice.invoiceNumber,
      memberId: invoice.userId,
      memberName,
      memberInitials: initials,
      date: invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("de-DE") : "",
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("de-DE") : "",
      amount: `€${(invoice.total || 0).toFixed(2).replace(".", ",")}`,
      amountRaw: invoice.total || 0,
      status: mapInvoiceStatus(invoice.status),
      description: invoice.notes || invoiceItems.map((item) => item.description).join(", "),
      positions: invoiceItems.map((item) => ({
        description: item.description,
        quantity: item.quantity ?? 1,
        unitPrice: `€${Number(item.unitPrice || 0).toFixed(2).replace(".", ",")}`,
        total: `€${Number(item.total || 0).toFixed(2).replace(".", ",")}`,
      })),
      timeline: [
        { step: "Entwurf", date: invoice.createdAt || undefined },
        { step: "Fällig", date: invoice.dueDate || undefined },
        { step: "Bezahlt", date: invoice.paidAt || undefined },
      ],
    };
  });

  const summary = {
    total_open: data.filter((invoice) => invoice.status === "Gesendet").reduce((sum, invoice) => sum + invoice.amountRaw, 0),
    total_paid: data.filter((invoice) => invoice.status === "Bezahlt").reduce((sum, invoice) => sum + invoice.amountRaw, 0),
    total_overdue: data.filter((invoice) => invoice.status === "Überfällig").reduce((sum, invoice) => sum + invoice.amountRaw, 0),
  };

  return { data, summary };
}

export async function markInvoicePaidUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; invoiceId: string }) {
  const repo = financeRepository(env);
  await repo.updateInvoice(input.orgId, input.invoiceId, {
    status: "paid",
    paidAt: new Date().toISOString(),
    paymentMethod: "manual",
  });

  const invoice = await repo.findInvoiceById(input.invoiceId);
  if (invoice) {
    await repo.insertAccountingEntry({
      orgId: input.orgId,
      invoiceId: input.invoiceId,
      entryDate: new Date().toISOString().slice(0, 10),
      type: "income",
      category: "Mitgliedsbeiträge",
      description: `Zahlung ${invoice.invoiceNumber}`,
      amount: invoice.total || 0,
      paymentMethod: "manual",
      createdBy: input.actorUserId,
    });
  }
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Rechnung bezahlt", "invoice", input.invoiceId);
}

export async function deleteInvoiceUseCase(env: RouteEnv, input: { orgId: string; actorUserId: string; invoiceId: string }) {
  const repo = financeRepository(env);
  await repo.clearInvoiceLinkFromAccountingEntries(input.invoiceId);
  await repo.deleteInvoiceItems(input.invoiceId);
  await repo.deleteInvoice(input.orgId, input.invoiceId);
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Rechnung gelöscht", "invoice", input.invoiceId);
}

export async function getAccountingDataUseCase(env: RouteEnv, orgId: string) {
  const repo = financeRepository(env);
  const rows = await repo.listAccountingEntriesByOrg(orgId);

  const entries: AccountingEntry[] = rows.map((entry) => ({
    id: entry.id,
    date: entry.entryDate ? new Date(entry.entryDate).toLocaleDateString("de-DE") : "",
    type: entry.type === "income" ? "Einnahme" : "Ausgabe",
    category: entry.category || "",
    description: entry.description,
    amount: `€${Math.abs(entry.amount).toFixed(2).replace(".", ",")}`,
    amountRaw: entry.amount,
    receipt: entry.receiptUrl || undefined,
  }));

  const summary = {
    income: rows.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0),
    expense: rows.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + Math.abs(entry.amount), 0),
    balance: rows.reduce((sum, entry) => sum + entry.amount, 0),
  };

  return { entries, summary };
}

export async function createAccountingEntryUseCase(
  env: RouteEnv,
  input: { orgId: string; actorUserId: string; entryDate: string; type: "income" | "expense"; category?: string; description: string; amount: number },
) {
  const repo = financeRepository(env);
  const id = crypto.randomUUID();
  await repo.insertAccountingEntry({
    id,
    orgId: input.orgId,
    entryDate: input.entryDate,
    type: input.type,
    category: input.category,
    description: input.description,
    amount: input.type === "expense" ? -Math.abs(input.amount) : Math.abs(input.amount),
    createdBy: input.actorUserId,
  });
  await writeAuditLog(env.DB, input.orgId, input.actorUserId, "Buchung erstellt", "accounting", id, input.description);
  return id;
}
