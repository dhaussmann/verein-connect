import { useEffect, useState } from 'react';
import { useFetcher, useLoaderData, useActionData, useSearchParams } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { ClipboardList, Check, X, Eye } from 'lucide-react';
import {
  Badge, Button, ActionIcon, Card, Group, Stack, Text, Select, Modal, Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { ContractApplication, PaginatedResponse } from '@/lib/api';
import { buildSearchParams } from '@/lib/search-params';
import { requireRouteData } from '@/core/runtime/route';
import { acceptApplicationUseCase, listApplicationsUseCase, rejectApplicationUseCase } from '@/modules/applications/use-cases/applications.use-cases';

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Ausstehend', color: 'gray' },
  ACCEPTED: { label: 'Angenommen', color: 'blue' },
  REJECTED: { label: 'Abgelehnt', color: 'red' },
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const url = new URL(request.url);
  const data = await listApplicationsUseCase(env, {
    orgId: user.orgId,
    page: Number(url.searchParams.get("page") || 1),
    perPage: Number(url.searchParams.get("per_page") || 25),
    status: url.searchParams.get("status") || undefined,
  });
  return { data };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const id = String(formData.get("id") || "");

  try {
    if (intent === "accept") {
      await acceptApplicationUseCase(env, { orgId: user.orgId, actorUserId: user.id, applicationId: id });
      return { success: true, intent };
    }
    if (intent === "reject") {
      await rejectApplicationUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        applicationId: id,
        reviewNotes: String(formData.get("reviewNotes") || ""),
      });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Aktion fehlgeschlagen" };
  }

  return { success: false, error: "Unbekannte Aktion" };
}

export default function ApplicationsIndexRoute() {
  const { data } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher<typeof action>();
  const statusFilter = searchParams.get('status') || '';
  const applications = (data?.data || []) as PaginatedResponse<ContractApplication>['data'];
  const meta = data?.meta;

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<ContractApplication | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  useEffect(() => {
    const payload = fetcher.data || actionData;
    if (!payload) return;
    if (payload.success) {
      notifications.show({ color: 'green', message: 'Aktion erfolgreich ausgeführt' });
    } else if (payload.error) {
      notifications.show({ color: 'red', message: payload.error });
    }
  }, [fetcher.data, actionData]);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Text size="xl" fw={700}>Beitrittsanträge</Text>
          <Text c="dimmed" size="sm">Anträge aus der Selbstregistrierung verwalten</Text>
        </div>
        <Select
          value={statusFilter || null}
          onChange={(val) => setSearchParams(buildSearchParams(searchParams, { status: val ?? 'ALL' }, { pageParam: 'page', resetPageOnChange: false }))}
          placeholder="Status"
          w={160}
          data={[
            { value: 'ALL', label: 'Alle' },
            { value: 'PENDING', label: 'Ausstehend' },
            { value: 'ACCEPTED', label: 'Angenommen' },
            { value: 'REJECTED', label: 'Abgelehnt' },
          ]}
        />
      </Group>

      <Card p={0}>
        {applications.length === 0 ? (
          <Stack align="center" py="xl">
            <ClipboardList size={48} opacity={0.3} />
            <Text c="dimmed">Keine Anträge gefunden</Text>
          </Stack>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">E-Mail</th>
                  <th className="text-left p-3 font-medium">Typ</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Eingereicht</th>
                  <th className="text-right p-3 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const st = statusMap[app.status] || { label: app.status, color: 'gray' };
                  return (
                    <tr key={app.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{app.firstName} {app.lastName}</td>
                      <td className="p-3 text-muted-foreground">{app.email}</td>
                      <td className="p-3">{app.typeName || '-'}</td>
                      <td className="p-3"><Badge color={st.color}>{st.label}</Badge></td>
                      <td className="p-3 text-xs">{new Date(app.submittedAt).toLocaleDateString('de-DE')}</td>
                      <td className="p-3 text-right">
                        <Group justify="flex-end" gap={4}>
                          <ActionIcon variant="subtle" onClick={() => { setSelected(app); setDetailOpen(true); }}>
                            <Eye size={16} />
                          </ActionIcon>
                          {app.status === 'PENDING' && (
                            <>
                              <ActionIcon
                                variant="subtle"
                                color="green"
                                onClick={() => fetcher.submit({ intent: 'accept', id: app.id }, { method: 'post' })}
                                disabled={fetcher.state !== 'idle'}
                              >
                                <Check size={16} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="red" onClick={() => { setRejectId(app.id); setRejectOpen(true); }}>
                                <X size={16} />
                              </ActionIcon>
                            </>
                          )}
                        </Group>
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
        <Text size="sm" c="dimmed" ta="center">Seite {meta.page} von {meta.total_pages}</Text>
      )}

      {/* Detail Modal */}
      <Modal opened={detailOpen} onClose={() => setDetailOpen(false)} title="Antragsdetails" size="lg">
        {selected && (
          <Stack gap="xs" py="sm">
            <Row label="Name" value={`${selected.firstName} ${selected.lastName}`} />
            <Row label="E-Mail" value={selected.email} />
            <Row label="Telefon" value={selected.phone || '-'} />
            <Row label="Adresse" value={selected.address || '-'} />
            <Row label="Geburtsdatum" value={selected.dateOfBirth ? new Date(selected.dateOfBirth).toLocaleDateString('de-DE') : '-'} />
            <Row label="Typ" value={selected.typeName || '-'} />
            <Row label="Abrechnungszeitraum" value={selected.billingPeriod || '-'} />
            <Row label="Status" value={statusMap[selected.status]?.label || selected.status} />
            {selected.reviewerName && <Row label="Bearbeitet von" value={selected.reviewerName} />}
            {selected.reviewedAt && <Row label="Bearbeitet am" value={new Date(selected.reviewedAt).toLocaleDateString('de-DE')} />}
            {selected.reviewNotes && <Row label="Notizen" value={selected.reviewNotes} />}
          </Stack>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal opened={rejectOpen} onClose={() => setRejectOpen(false)} title="Antrag ablehnen">
        <Stack gap="md">
          <Textarea
            label="Begründung (optional)"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={3}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Abbrechen</Button>
            <Button
              color="red"
              onClick={() => {
                setRejectOpen(false);
                setRejectNotes('');
                fetcher.submit({ intent: 'reject', id: rejectId, reviewNotes: rejectNotes }, { method: 'post' });
              }}
              disabled={fetcher.state !== 'idle'}
            >
              Ablehnen
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
