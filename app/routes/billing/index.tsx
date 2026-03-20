/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';
import { useFetcher, useLoaderData, useActionData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Receipt, Play, AlertCircle, CheckCircle } from 'lucide-react';
import {
  Button, Card, Group, Stack, Text, Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { requireRouteData } from '@/core/runtime/route';
import { getBillingScheduleUseCase, runBillingUseCase } from '@/modules/billing/use-cases/billing.use-cases';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const data = await getBillingScheduleUseCase(env, user.orgId);
  return { data };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  try {
    const result = await runBillingUseCase(env, { orgId: user.orgId, actorUserId: user.id });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Abrechnungslauf fehlgeschlagen" };
  }
}

const periodMap: Record<string, string> = {
  MONTHLY: 'Monatlich', QUARTERLY: 'Vierteljährlich', HALF_YEARLY: 'Halbjährlich', YEARLY: 'Jährlich',
};

export default function BillingIndexRoute() {
  const { data } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher<typeof action>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);

  const schedule = data;
  const contracts = schedule?.contracts || [];

  useEffect(() => {
    const payload = fetcher.data || actionData;
    if (!payload) return;
    if (payload.success && payload.result) {
      setResult(payload.result);
      setConfirmOpen(false);
      notifications.show({ color: 'green', message: `${payload.result.created} Rechnungen erstellt` });
    } else if (payload.error) {
      notifications.show({ color: 'red', message: payload.error });
    }
  }, [fetcher.data, actionData]);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Text size="xl" fw={700}>Abrechnung</Text>
          <Text c="dimmed" size="sm">Abrechnungslauf durchführen und ausstehende Rechnungen verwalten</Text>
        </div>
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={fetcher.state !== 'idle' || contracts.length === 0}
          leftSection={<Play size={16} />}
        >
          Abrechnungslauf starten
        </Button>
      </Group>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <Group gap="sm">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Receipt size={20} className="text-orange-600" />
            </div>
            <div>
              <Text size="xl" fw={700}>{schedule?.pendingContracts || 0}</Text>
              <Text size="xs" c="dimmed">Ausstehende Verträge</Text>
            </div>
          </Group>
        </Card>
        <Card>
          <Group gap="sm">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Receipt size={20} className="text-blue-600" />
            </div>
            <div>
              <Text size="xl" fw={700}>
                {contracts.reduce((sum, c) => sum + (c.currentPrice || 0), 0).toFixed(2)} €
              </Text>
              <Text size="xs" c="dimmed">Erwarteter Rechnungsbetrag</Text>
            </div>
          </Group>
        </Card>
        <Card>
          <Group gap="sm">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <Text size="xl" fw={700}>{schedule?.settings?.invoicePublishMode === 'AUTO_PUBLISH' ? 'Auto' : 'Entwurf'}</Text>
              <Text size="xs" c="dimmed">Veröffentlichungsmodus</Text>
            </div>
          </Group>
        </Card>
      </div>

      {/* Pending Contracts */}
      <Card p={0}>
        <Text fw={600} p="md" pb={0}>Ausstehende Abrechnungen</Text>
        {contracts.length === 0 ? (
          <Stack align="center" py="xl">
            <CheckCircle size={48} opacity={0.3} />
            <Text c="dimmed">Alle Verträge sind aktuell abgerechnet</Text>
          </Stack>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Vertragsnr.</th>
                  <th className="text-left p-3 font-medium">Preis</th>
                  <th className="text-left p-3 font-medium">Zeitraum</th>
                  <th className="text-left p-3 font-medium">Bezahlt bis</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.contractId} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{c.contractNumber}</td>
                    <td className="p-3 font-medium">{(c.currentPrice || 0).toFixed(2)} €</td>
                    <td className="p-3">{periodMap[c.billingPeriod] || c.billingPeriod}</td>
                    <td className="p-3 text-xs">
                      {c.paidUntil ? new Date(c.paidUntil).toLocaleDateString('de-DE') : 'Nie'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Last Result */}
      {result && (
        <Card>
          <Text fw={600} mb="md">Letztes Ergebnis</Text>
          <Group gap="sm" mb="sm">
            <CheckCircle size={20} className="text-green-600" />
            <Text fw={500}>{result.created} Rechnungen erstellt</Text>
          </Group>
          {result.errors.length > 0 && (
            <Stack gap="xs">
              {result.errors.map((err, i) => (
                <Group key={i} gap="xs" align="flex-start">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <Text size="sm" c="red">{err}</Text>
                </Group>
              ))}
            </Stack>
          )}
        </Card>
      )}

      {/* Confirm Modal */}
      <Modal opened={confirmOpen} onClose={() => setConfirmOpen(false)} title="Abrechnungslauf bestätigen">
        <Stack gap="sm" py="sm">
          <Text size="sm">
            Es werden <strong>{contracts.length} Rechnungen</strong> erstellt für einen Gesamtbetrag von{' '}
            <strong>{contracts.reduce((sum, c) => sum + (c.currentPrice || 0), 0).toFixed(2)} €</strong>.
          </Text>
          <Text size="sm" c="dimmed">
            Modus: {schedule?.settings?.invoicePublishMode === 'AUTO_PUBLISH' ? 'Rechnungen werden automatisch versendet' : 'Rechnungen werden als Entwurf erstellt'}
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Abbrechen</Button>
            <Button onClick={() => fetcher.submit({}, { method: 'post' })} disabled={fetcher.state !== 'idle'}>
              {fetcher.state !== 'idle' ? 'Wird ausgeführt...' : 'Abrechnungslauf starten'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
