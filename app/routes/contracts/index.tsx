/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import { Link, useFetcher, useLoaderData, useActionData, useSearchParams } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { FileText, Plus, Search, MoreHorizontal, Eye, XCircle, Receipt } from 'lucide-react';
import {
  Badge, Button, ActionIcon, Card, Group, Stack, Text, Select, Modal, TextInput, Menu,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { RoutePendingOverlay } from '@/components/ui/route-pending-overlay';
import { useRoutePending } from '@/hooks/use-route-pending';
import { buildSearchParams } from '@/lib/search-params';
import type { Contract, PaginatedResponse } from '@/modules/contracts/types/contracts.types';
import { requireRouteData } from '@/core/runtime/route';
import { cancelContractUseCase, createContractInvoiceUseCase, listContractsUseCase } from '@/modules/contracts/use-cases/contracts.use-cases';

const statusMap: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Aktiv', color: 'blue' },
  CANCELLED: { label: 'Gekündigt', color: 'red' },
  EXPIRED: { label: 'Abgelaufen', color: 'gray' },
  PAUSED: { label: 'Pausiert', color: 'gray' },
};

const periodMap: Record<string, string> = {
  MONTHLY: 'Monatlich',
  QUARTERLY: 'Vierteljährlich',
  HALF_YEARLY: 'Halbjährlich',
  YEARLY: 'Jährlich',
};

type ContractsActionData = {
  success?: boolean;
  intent?: string;
  error?: string;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const url = new URL(request.url);
  const data = await listContractsUseCase(env, user.orgId, Object.fromEntries(url.searchParams.entries()));
  return { data };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get('intent') || '');
  const id = String(formData.get('id') || '');

  try {
    if (intent === 'cancel') {
      await cancelContractUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        contractId: id,
        cancellationDate: String(formData.get('cancellationDate') || ''),
      });
      return { success: true, intent };
    }
    if (intent === 'create-invoice') {
      await createContractInvoiceUseCase(env, { orgId: user.orgId, actorUserId: user.id, contractId: id });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Aktion fehlgeschlagen' };
  }

  return { success: false, error: 'Unbekannte Aktion' };
}

export default function ContractsIndexRoute() {
  const { data } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher<ContractsActionData>();
  const { isSearchPending } = useRoutePending();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelId, setCancelId] = useState('');
  const [cancelDate, setCancelDate] = useState(new Date().toISOString().slice(0, 10));
  const statusFilter = searchParams.get('status') || '';
  const kindFilter = searchParams.get('contract_kind') || '';

  const contracts = (data as PaginatedResponse<Contract>)?.data || [];
  const meta = (data as PaginatedResponse<Contract>)?.meta;

  const active = contracts.filter((contract) => contract.status === 'ACTIVE').length;
  const cancelled = contracts.filter((contract) => contract.status === 'CANCELLED').length;
  const totalRevenue = contracts.reduce((sum, contract) => sum + (contract.currentPrice || 0), 0);

  useEffect(() => {
    const payload = fetcher.data || actionData;
    if (!payload) return;
    if (payload.success) {
      notifications.show({ color: 'green', message: payload.intent === 'create-invoice' ? 'Rechnung erstellt' : 'Vertrag wurde gekündigt' });
    } else if (payload.error) {
      notifications.show({ color: 'red', message: payload.error });
    }
  }, [fetcher.data, actionData]);

  const updateSearchParams = (updates: Record<string, string | null>) => {
    setSearchParams(buildSearchParams(searchParams, updates));
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Text size="xl" fw={700}>Verträge</Text>
          <Text c="dimmed" size="sm">Verwalten Sie alle Mitgliederverträge</Text>
        </div>
        <Button component={Link} to="/contracts/new" leftSection={<Plus size={16} />}>
          Neuer Vertrag
        </Button>
      </Group>

      <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
        <RoutePendingOverlay visible={isSearchPending} />
        <Card>
          <Group gap="sm">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileText size={20} className="text-green-600" />
            </div>
            <div>
              <Text size="xl" fw={700}>{active}</Text>
              <Text size="xs" c="dimmed">Aktive Verträge</Text>
            </div>
          </Group>
        </Card>
        <Card>
          <Group gap="sm">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
            <div>
              <Text size="xl" fw={700}>{cancelled}</Text>
              <Text size="xs" c="dimmed">Gekündigte Verträge</Text>
            </div>
          </Group>
        </Card>
        <Card>
          <Group gap="sm">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Receipt size={20} className="text-blue-600" />
            </div>
            <div>
              <Text size="xl" fw={700}>{totalRevenue.toFixed(2)} €</Text>
              <Text size="xs" c="dimmed">Monatl. Einnahmen (aktiv)</Text>
            </div>
          </Group>
        </Card>
      </div>

      <Group gap="sm">
        <TextInput
          key={searchParams.get('search') || ''}
          placeholder="Vertragsnummer suchen..."
          component={ContractsSearchInput}
          initialValue={searchParams.get('search') || ''}
          onSearchChange={(value: string) => updateSearchParams({ search: value || null })}
          leftSection={<Search size={16} />}
          style={{ flex: 1 }}
        />
        <Select
          value={statusFilter || null}
          onChange={(val) => updateSearchParams({ status: val ?? null })}
          placeholder="Status"
          w={160}
          data={[
            { value: 'ALL', label: 'Alle Status' },
            { value: 'ACTIVE', label: 'Aktiv' },
            { value: 'CANCELLED', label: 'Gekündigt' },
            { value: 'EXPIRED', label: 'Abgelaufen' },
          ]}
        />
        <Select
          value={kindFilter || null}
          onChange={(val) => updateSearchParams({ contract_kind: val ?? null })}
          placeholder="Vertragsart"
          w={180}
          data={[
            { value: 'ALL', label: 'Alle Arten' },
            { value: 'MEMBERSHIP', label: 'Mitgliedschaft' },
            { value: 'TARIF', label: 'Tarif' },
          ]}
        />
      </Group>

      <Card p={0} className="relative">
        <RoutePendingOverlay visible={isSearchPending} />
        {contracts.length === 0 ? (
          <Stack align="center" py="xl">
            <FileText size={48} opacity={0.3} />
            <Text c="dimmed">Keine Verträge gefunden</Text>
          </Stack>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Nr.</th>
                  <th className="text-left p-3 font-medium">Mitglied</th>
                  <th className="text-left p-3 font-medium">Typ</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Preis</th>
                  <th className="text-left p-3 font-medium">Laufzeit</th>
                  <th className="text-left p-3 font-medium">Abrechnungszeitraum</th>
                  <th className="text-right p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => {
                  const status = statusMap[contract.status || ''] || { label: contract.status, color: 'gray' };
                  return (
                    <tr key={contract.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs">
                        <Link to={`/contracts/${contract.id}`}>{contract.contractNumber}</Link>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {contract.memberInitials}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{contract.memberName}</p>
                            <p className="text-xs text-muted-foreground">{contract.memberEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm">{contract.typeName || '-'}</p>
                          <p className="text-xs text-muted-foreground">
                            {contract.contractKind === 'MEMBERSHIP' ? 'Mitgliedschaft' : 'Tarif'}
                          </p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge color={status.color}>{status.label}</Badge>
                        {contract.cancellationDate && (
                          <Text size="xs" c="dimmed" mt={4}>
                            Kündigung: {new Date(contract.cancellationDate).toLocaleDateString('de-DE')}
                          </Text>
                        )}
                      </td>
                      <td className="p-3 font-medium">{contract.currentPrice?.toFixed(2)} €</td>
                      <td className="p-3 text-xs">
                        {contract.startDate ? new Date(contract.startDate).toLocaleDateString('de-DE') : '-'}
                        {contract.endDate && ` – ${new Date(contract.endDate).toLocaleDateString('de-DE')}`}
                      </td>
                      <td className="p-3 text-xs">{periodMap[contract.billingPeriod || ''] || '-'}</td>
                      <td className="p-3 text-right" onClick={(event) => event.stopPropagation()}>
                        <Menu position="bottom-end">
                          <Menu.Target>
                            <ActionIcon variant="subtle">
                              <MoreHorizontal size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item leftSection={<Eye size={16} />} component={Link} to={`/contracts/${contract.id}`}>
                              Details
                            </Menu.Item>
                            {contract.status === 'ACTIVE' && (
                              <>
                                <Menu.Item leftSection={<Receipt size={16} />} onClick={() => fetcher.submit({ intent: 'create-invoice', id: contract.id }, { method: 'post' })}>
                                  Rechnung erstellen
                                </Menu.Item>
                                <Menu.Item
                                  color="red"
                                  leftSection={<XCircle size={16} />}
                                  onClick={() => { setCancelId(contract.id); setCancelDialogOpen(true); }}
                                >
                                  Kündigen
                                </Menu.Item>
                              </>
                            )}
                          </Menu.Dropdown>
                        </Menu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {meta && meta.total_pages > 1 && (
        <Text size="sm" c="dimmed" ta="center">
          Seite {meta.page} von {meta.total_pages} ({meta.total} Verträge)
        </Text>
      )}

      <Modal opened={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} title="Vertrag kündigen">
        <Stack gap="md">
          <TextInput
            label="Kündigungsdatum"
            type="date"
            value={cancelDate}
            onChange={(event) => setCancelDate(event.target.value)}
          />
          <Text size="sm" c="dimmed">
            Das effektive Enddatum wird basierend auf der Kündigungsfrist berechnet.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Abbrechen</Button>
            <Button
              color="red"
              onClick={() => {
                setCancelDialogOpen(false);
                fetcher.submit({ intent: 'cancel', id: cancelId, cancellationDate: cancelDate }, { method: 'post' });
              }}
              disabled={fetcher.state !== 'idle'}
            >
              {fetcher.state !== 'idle' ? 'Wird gekündigt...' : 'Kündigen'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

type ContractsSearchInputProps = {
  initialValue: string;
  onSearchChange: (value: string) => void;
};

function ContractsSearchInput({ initialValue, onSearchChange, ...props }: ContractsSearchInputProps & ComponentPropsWithoutRef<'input'>) {
  const [value, setValue] = useState(initialValue);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
  }, []);

  return (
    <input
      {...props}
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;
        setValue(nextValue);
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
          onSearchChange(nextValue);
        }, 250);
      }}
    />
  );
}
