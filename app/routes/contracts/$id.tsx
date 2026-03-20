/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';
import { Link, useFetcher, useLoaderData, useActionData, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import {
  ArrowLeft, FileText, User, Calendar, Receipt, Pause, Play, XCircle, Edit, Trash2,
} from 'lucide-react';
import {
  Badge, Button, ActionIcon, Card, Group, Stack, Text, Tabs, Modal, TextInput, Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { ContractDetail } from '@/modules/contracts/types/contracts.types';
import { requireRouteData } from '@/core/runtime/route';
import {
  cancelContractUseCase,
  createContractInvoiceUseCase,
  deleteContractUseCase,
  getContractDetailUseCase,
  pauseContractUseCase,
} from '@/modules/contracts/use-cases/contracts.use-cases';

const statusMap: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Aktiv', color: 'blue' },
  CANCELLED: { label: 'Gekündigt', color: 'red' },
  EXPIRED: { label: 'Abgelaufen', color: 'gray' },
  PAUSED: { label: 'Pausiert', color: 'gray' },
};

const periodMap: Record<string, string> = {
  MONTHLY: 'Monatlich', QUARTERLY: 'Vierteljährlich', HALF_YEARLY: 'Halbjährlich', YEARLY: 'Jährlich',
};

type ContractInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number | null;
  dueDate: string | null;
  createdAt: string;
};

type ContractChildSummary = {
  id: string;
  contractNumber: string;
  contractKind: string;
  status: string;
};

type ContractDetailActionData = {
  success?: boolean;
  intent?: string;
  error?: string;
};

type TypedContractDetail = Omit<ContractDetail, 'children' | 'invoices'> & {
  children: ContractChildSummary[];
  invoices: ContractInvoice[];
};

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  if (!params.id) throw new Response('Not Found', { status: 404 });
  const contract = await getContractDetailUseCase(env, { orgId: user.orgId, contractId: params.id });
  return { contract };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  if (!params.id) throw new Response('Not Found', { status: 404 });
  const formData = await request.formData();
  const intent = String(formData.get('intent') || '');

  try {
    if (intent === 'cancel') {
      await cancelContractUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        contractId: params.id,
        cancellationDate: String(formData.get('cancellationDate') || ''),
      });
      return { success: true, intent };
    }
    if (intent === 'pause') {
      await pauseContractUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        contractId: params.id,
        pauseFrom: String(formData.get('pauseFrom') || ''),
        pauseUntil: String(formData.get('pauseUntil') || ''),
        reason: String(formData.get('pauseReason') || ''),
      });
      return { success: true, intent };
    }
    if (intent === 'create-invoice') {
      await createContractInvoiceUseCase(env, { orgId: user.orgId, actorUserId: user.id, contractId: params.id });
      return { success: true, intent };
    }
    if (intent === 'delete') {
      await deleteContractUseCase(env, { orgId: user.orgId, actorUserId: user.id, contractId: params.id });
      return redirect('/contracts');
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : 'Aktion fehlgeschlagen' };
  }

  return { success: false, error: 'Unbekannte Aktion' };
}

export default function ContractDetailRoute() {
  const { contract } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher<ContractDetailActionData>();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelDate, setCancelDate] = useState(new Date().toISOString().slice(0, 10));
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseFrom, setPauseFrom] = useState('');
  const [pauseUntil, setPauseUntil] = useState('');
  const [pauseReason, setPauseReason] = useState('');

  useEffect(() => {
    const payload = fetcher.data || actionData;
    if (!payload) return;
    if (payload.success) {
      notifications.show({ color: 'green', message: payload.intent === 'create-invoice' ? 'Rechnung erstellt' : payload.intent === 'pause' ? 'Pause eingetragen' : 'Vertrag gekündigt' });
      setCancelOpen(false);
      setPauseOpen(false);
      setPauseFrom('');
      setPauseUntil('');
      setPauseReason('');
    } else if (payload.error) {
      notifications.show({ color: 'red', message: payload.error });
    }
  }, [fetcher.data, actionData]);

  const c = contract as TypedContractDetail | null;

  if (!c) return <Text c="dimmed" ta="center" p="xl">Vertrag nicht gefunden</Text>;

  const st = statusMap[c.status || ''] || { label: c.status, color: 'gray' };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group gap="md">
        <ActionIcon variant="subtle" component={Link} to="/contracts">
          <ArrowLeft size={20} />
        </ActionIcon>
        <div style={{ flex: 1 }}>
          <Group gap="sm">
            <Text size="xl" fw={700}>{c.contractNumber}</Text>
            <Badge color={st.color}>{st.label}</Badge>
          </Group>
          <Text c="dimmed" size="sm">
            {c.typeName} · {c.contractKind === 'MEMBERSHIP' ? 'Mitgliedschaft' : 'Tarif'}
          </Text>
        </div>
        <Group gap="xs">
          {c.status === 'ACTIVE' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setPauseOpen(true)} leftSection={<Pause size={16} />}>
                Pausieren
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetcher.submit({ intent: 'create-invoice' }, { method: 'post' })} leftSection={<Receipt size={16} />}>
                Rechnung
              </Button>
              <Button color="red" size="sm" onClick={() => setCancelOpen(true)} leftSection={<XCircle size={16} />}>
                Kündigen
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            color="red"
            onClick={() => {
              if (!confirm('Vertrag endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
              fetcher.submit({ intent: 'delete' }, { method: 'post' });
            }}
            leftSection={<Trash2 size={16} />}
          >
            Löschen
          </Button>
        </Group>
      </Group>

      <Tabs defaultValue="details">
        <Tabs.List>
          <Tabs.Tab value="details">Basisdaten</Tabs.Tab>
          <Tabs.Tab value="invoices">Rechnungen ({c.invoices?.length || 0})</Tabs.Tab>
          <Tabs.Tab value="pauses">Pausen ({c.pauses?.length || 0})</Tabs.Tab>
          <Tabs.Tab value="log">Protokoll</Tabs.Tab>
        </Tabs.List>

        {/* Basisdaten */}
        <Tabs.Panel value="details" pt="md">
          <Stack gap="md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vertragsdaten */}
              <Card>
                <Text fw={600} mb="md">Vertragsdaten</Text>
                <Stack gap="xs">
                  <Row label="Vertragsnummer" value={c.contractNumber} />
                  <Row label="Art" value={c.contractKind === 'MEMBERSHIP' ? 'Mitgliedschaft' : 'Tarif'} />
                  <Row label="Typ / Tarif" value={c.typeName || '-'} />
                  <Row label="Gruppe" value={c.groupName || '-'} />
                  <Row label="Status" value={st.label} />
                  <Row label="Startdatum" value={fmtDate(c.startDate)} />
                  <Row label="Enddatum" value={fmtDate(c.endDate)} />
                  <Row label="Preis" value={`${(c.currentPrice || 0).toFixed(2)} €`} />
                  <Row label="Abrechnungszeitraum" value={periodMap[c.billingPeriod || ''] || '-'} />
                  <Row label="Auto-Verlängerung" value={c.autoRenew ? 'Ja' : 'Nein'} />
                  <Row label="Bezahlt bis" value={fmtDate(c.paidUntil)} />
                  <Row label="Kündigungsfrist" value={c.cancellationNoticeDays ? `${c.cancellationNoticeDays} ${c.cancellationNoticeDays === 1 ? 'Monat' : 'Monate'}` : '-'} />
                  {c.cancellationDate && (
                    <>
                      <Row label="Kündigungsdatum" value={fmtDate(c.cancellationDate)} />
                      <Row label="Wirksam ab" value={fmtDate(c.cancellationEffectiveDate)} />
                    </>
                  )}
                  <Row label="Erstellt von" value={c.createdByName || '-'} />
                  <Row label="Erstellt am" value={fmtDate(c.createdAt)} />
                  {c.notes && <Row label="Notizen" value={c.notes} />}
                </Stack>
              </Card>

              {/* Mitglied */}
              <Card>
                <Text fw={600} mb="md">Mitglied</Text>
                {c.member ? (
                  <Stack gap="xs">
                    <Group gap="sm" mb="sm">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                        {(c.member.firstName?.[0] || '')}{(c.member.lastName?.[0] || '')}
                      </div>
                      <div>
                        <Text fw={500}>{c.member.firstName} {c.member.lastName}</Text>
                        <Text c="dimmed" size="xs">{c.member.email}</Text>
                      </div>
                    </Group>
                    <Row label="Telefon" value={c.member.phone || '-'} />
                    <Row label="Mobil" value={c.member.mobile || '-'} />
                    <Row label="Straße" value={c.member.street || '-'} />
                    <Row label="PLZ / Ort" value={[c.member.zip, c.member.city].filter(Boolean).join(' ') || '-'} />
                    <Button variant="outline" size="sm" mt="xs" leftSection={<User size={16} />} component={Link} to={`/members/${c.member!.id}`}>
                      Profil öffnen
                    </Button>
                  </Stack>
                ) : (
                  <Text c="dimmed">Kein Mitglied verknüpft</Text>
                )}
              </Card>
            </div>

            {/* Child contracts */}
            {c.children && c.children.length > 0 && (
              <Card>
                <Text fw={600} mb="md">Verknüpfte Verträge</Text>
                <Stack gap="xs">
                  {c.children.map((child) => (
                    <Link
                      key={child.id}
                      to={`/contracts/${child.id}`}
                      className="flex items-center justify-between p-2 rounded border hover:bg-muted/30"
                    >
                      <div>
                        <Text fw={500} size="sm">{child.contractNumber}</Text>
                        <Text size="xs" c="dimmed">{child.contractKind}</Text>
                      </div>
                      <Badge color={statusMap[child.status]?.color || 'gray'}>
                        {statusMap[child.status]?.label || child.status}
                      </Badge>
                    </Link>
                  ))}
                </Stack>
              </Card>
            )}
          </Stack>
        </Tabs.Panel>

        {/* Rechnungen */}
        <Tabs.Panel value="invoices" pt="md">
          <Card p={0}>
            {!c.invoices?.length ? (
              <Text c="dimmed" ta="center" p="xl">Keine Rechnungen</Text>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Nr.</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Betrag</th>
                    <th className="text-left p-3 font-medium">Fällig</th>
                    <th className="text-left p-3 font-medium">Erstellt</th>
                  </tr>
                </thead>
                <tbody>
                  {c.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="p-3"><Badge variant="outline">{inv.status}</Badge></td>
                      <td className="p-3 font-medium">{inv.total?.toFixed(2)} €</td>
                      <td className="p-3 text-xs">{fmtDate(inv.dueDate)}</td>
                      <td className="p-3 text-xs">{fmtDate(inv.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </Tabs.Panel>

        {/* Pausen */}
        <Tabs.Panel value="pauses" pt="md">
          <Card p={0}>
            {!c.pauses?.length ? (
              <Text c="dimmed" ta="center" p="xl">Keine Pausen</Text>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Von</th>
                    <th className="text-left p-3 font-medium">Bis</th>
                    <th className="text-left p-3 font-medium">Grund</th>
                    <th className="text-left p-3 font-medium">Gutschrift</th>
                  </tr>
                </thead>
                <tbody>
                  {c.pauses.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="p-3 text-xs">{fmtDate(p.pauseFrom)}</td>
                      <td className="p-3 text-xs">{fmtDate(p.pauseUntil)}</td>
                      <td className="p-3 text-sm">{p.reason || '-'}</td>
                      <td className="p-3 font-medium">{(p.creditAmount || 0).toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </Tabs.Panel>

        {/* Protokoll */}
        <Tabs.Panel value="log" pt="md">
          <Card>
            <Stack gap="sm">
              <div className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <Text fw={500} size="sm">Vertrag erstellt</Text>
                  <Text c="dimmed" size="xs">
                    {fmtDate(c.createdAt)} · {c.createdByName || 'System'}
                  </Text>
                </div>
              </div>
              {c.cancellationDate && (
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div>
                    <Text fw={500} size="sm">Vertrag gekündigt</Text>
                    <Text c="dimmed" size="xs">
                      Zum {fmtDate(c.cancellationDate)} · Wirksam ab {fmtDate(c.cancellationEffectiveDate)}
                    </Text>
                  </div>
                </div>
              )}
              {c.pauses?.map((p) => (
                <div key={p.id} className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
                  <div>
                    <Text fw={500} size="sm">Pause eingetragen</Text>
                    <Text c="dimmed" size="xs">
                      {fmtDate(p.pauseFrom)} – {fmtDate(p.pauseUntil)} · {p.reason || 'Ohne Grund'}
                    </Text>
                  </div>
                </div>
              ))}
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Cancel Modal */}
      <Modal opened={cancelOpen} onClose={() => setCancelOpen(false)} title="Vertrag kündigen">
        <Stack gap="md">
          <TextInput
            label="Kündigungsdatum"
            type="date"
            value={cancelDate}
            onChange={(e) => setCancelDate(e.target.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Abbrechen</Button>
            <Button
              color="red"
              onClick={() => fetcher.submit({ intent: 'cancel', cancellationDate: cancelDate }, { method: 'post' })}
              disabled={fetcher.state !== 'idle'}
            >
              Kündigen
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Pause Modal */}
      <Modal opened={pauseOpen} onClose={() => setPauseOpen(false)} title="Vertrag pausieren">
        <Stack gap="md">
          <TextInput
            label="Von"
            type="date"
            value={pauseFrom}
            onChange={(e) => setPauseFrom(e.target.value)}
          />
          <TextInput
            label="Bis"
            type="date"
            value={pauseUntil}
            onChange={(e) => setPauseUntil(e.target.value)}
          />
          <Textarea
            label="Grund (optional)"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setPauseOpen(false)}>Abbrechen</Button>
            <Button
              onClick={() => fetcher.submit({ intent: 'pause', pauseFrom, pauseUntil, pauseReason }, { method: 'post' })}
              disabled={fetcher.state !== 'idle' || !pauseFrom || !pauseUntil}
            >
              Pause eintragen
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" gap="xs">
      <Text c="dimmed" size="sm">{label}</Text>
      <Text fw={500} size="sm" ta="right">{value}</Text>
    </Group>
  );
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('de-DE'); } catch { return d; }
}
