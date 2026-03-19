import { useEffect, useState } from 'react';
import { useFetcher, useNavigate } from 'react-router';
import {
  ArrowLeft, FileText, User, Calendar, Receipt, Pause, Play, XCircle, Edit, Trash2,
} from 'lucide-react';
import {
  Badge, Button, ActionIcon, Card, Group, Stack, Text, Tabs, Modal, TextInput, Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { ContractDetail } from '@/modules/contracts/types/contracts.types';

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

export default function ContractDetail({
  contract,
  actionData,
}: {
  contract: TypedContractDetail | null;
  actionData?: ContractDetailActionData;
}) {
  const navigate = useNavigate();
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
      if (payload.intent === 'delete') {
        notifications.show({ color: 'green', message: 'Vertrag gelöscht' });
        navigate('/contracts');
        return;
      }
      notifications.show({ color: 'green', message: payload.intent === 'create-invoice' ? 'Rechnung erstellt' : payload.intent === 'pause' ? 'Pause eingetragen' : 'Vertrag gekündigt' });
      setCancelOpen(false);
      setPauseOpen(false);
      setPauseFrom('');
      setPauseUntil('');
      setPauseReason('');
    } else if (payload.error) {
      notifications.show({ color: 'red', message: payload.error });
    }
  }, [fetcher.data, actionData, navigate]);

  if (!contract) return <Text c="dimmed" ta="center" p="xl">Vertrag nicht gefunden</Text>;

  const st = statusMap[contract.status || ''] || { label: contract.status, color: 'gray' };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group gap="md">
        <ActionIcon variant="subtle" onClick={() => navigate('/contracts')}>
          <ArrowLeft size={20} />
        </ActionIcon>
        <div style={{ flex: 1 }}>
          <Group gap="sm">
            <Text size="xl" fw={700}>{contract.contractNumber}</Text>
            <Badge color={st.color}>{st.label}</Badge>
          </Group>
          <Text c="dimmed" size="sm">
            {contract.typeName} · {contract.contractKind === 'MEMBERSHIP' ? 'Mitgliedschaft' : 'Tarif'}
          </Text>
        </div>
        <Group gap="xs">
          {contract.status === 'ACTIVE' && (
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
          <Tabs.Tab value="invoices">Rechnungen ({contract.invoices?.length || 0})</Tabs.Tab>
          <Tabs.Tab value="pauses">Pausen ({contract.pauses?.length || 0})</Tabs.Tab>
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
                  <Row label="Vertragsnummer" value={contract.contractNumber} />
                  <Row label="Art" value={contract.contractKind === 'MEMBERSHIP' ? 'Mitgliedschaft' : 'Tarif'} />
                  <Row label="Typ / Tarif" value={contract.typeName || '-'} />
                  <Row label="Gruppe" value={contract.groupName || '-'} />
                  <Row label="Status" value={st.label} />
                  <Row label="Startdatum" value={fmtDate(contract.startDate)} />
                  <Row label="Enddatum" value={fmtDate(contract.endDate)} />
                  <Row label="Preis" value={`${(contract.currentPrice || 0).toFixed(2)} €`} />
                  <Row label="Abrechnungszeitraum" value={periodMap[contract.billingPeriod || ''] || '-'} />
                  <Row label="Auto-Verlängerung" value={contract.autoRenew ? 'Ja' : 'Nein'} />
                  <Row label="Bezahlt bis" value={fmtDate(contract.paidUntil)} />
                  <Row label="Kündigungsfrist" value={contract.cancellationNoticeDays ? `${contract.cancellationNoticeDays} ${contract.cancellationNoticeDays === 1 ? 'Monat' : 'Monate'}` : '-'} />
                  {contract.cancellationDate && (
                    <>
                      <Row label="Kündigungsdatum" value={fmtDate(contract.cancellationDate)} />
                      <Row label="Wirksam ab" value={fmtDate(contract.cancellationEffectiveDate)} />
                    </>
                  )}
                  <Row label="Erstellt von" value={contract.createdByName || '-'} />
                  <Row label="Erstellt am" value={fmtDate(contract.createdAt)} />
                  {contract.notes && <Row label="Notizen" value={contract.notes} />}
                </Stack>
              </Card>

              {/* Mitglied */}
              <Card>
                <Text fw={600} mb="md">Mitglied</Text>
                {contract.member ? (
                  <Stack gap="xs">
                    <Group gap="sm" mb="sm">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                        {(contract.member.firstName?.[0] || '')}{(contract.member.lastName?.[0] || '')}
                      </div>
                      <div>
                        <Text fw={500}>{contract.member.firstName} {contract.member.lastName}</Text>
                        <Text c="dimmed" size="xs">{contract.member.email}</Text>
                      </div>
                    </Group>
                    <Row label="Telefon" value={contract.member.phone || '-'} />
                    <Row label="Mobil" value={contract.member.mobile || '-'} />
                    <Row label="Straße" value={contract.member.street || '-'} />
                    <Row label="PLZ / Ort" value={[contract.member.zip, contract.member.city].filter(Boolean).join(' ') || '-'} />
                    <Button variant="outline" size="sm" mt="xs" leftSection={<User size={16} />} onClick={() => navigate(`/members/${contract.member!.id}`)}>
                      Profil öffnen
                    </Button>
                  </Stack>
                ) : (
                  <Text c="dimmed">Kein Mitglied verknüpft</Text>
                )}
              </Card>
            </div>

            {/* Child contracts */}
            {contract.children && contract.children.length > 0 && (
              <Card>
                <Text fw={600} mb="md">Verknüpfte Verträge</Text>
                <Stack gap="xs">
                  {contract.children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between p-2 rounded border hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/contracts/${child.id}`)}
                    >
                      <div>
                        <Text fw={500} size="sm">{child.contractNumber}</Text>
                        <Text size="xs" c="dimmed">{child.contractKind}</Text>
                      </div>
                      <Badge color={statusMap[child.status]?.color || 'gray'}>
                        {statusMap[child.status]?.label || child.status}
                      </Badge>
                    </div>
                  ))}
                </Stack>
              </Card>
            )}
          </Stack>
        </Tabs.Panel>

        {/* Rechnungen */}
        <Tabs.Panel value="invoices" pt="md">
          <Card p={0}>
            {!contract.invoices?.length ? (
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
                  {contract.invoices.map((inv) => (
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
            {!contract.pauses?.length ? (
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
                  {contract.pauses.map((p) => (
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
                    {fmtDate(contract.createdAt)} · {contract.createdByName || 'System'}
                  </Text>
                </div>
              </div>
              {contract.cancellationDate && (
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div>
                    <Text fw={500} size="sm">Vertrag gekündigt</Text>
                    <Text c="dimmed" size="xs">
                      Zum {fmtDate(contract.cancellationDate)} · Wirksam ab {fmtDate(contract.cancellationEffectiveDate)}
                    </Text>
                  </div>
                </div>
              )}
              {contract.pauses?.map((p) => (
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
