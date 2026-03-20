/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import { useFetcher, useRevalidator, useLoaderData, useActionData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Save, Pencil } from 'lucide-react';
import type {
  ContractSettings,
  DiscountGroup,
  Group as ContractGroup,
  MembershipType,
  Tarif,
} from '@/modules/contracts/types/contracts.types';
import MembershipTypeDialog, { toApiPayload } from '@/components/contracts/MembershipTypeDialog';
import TarifDialog, { toTarifApiPayload } from '@/components/contracts/TarifDialog';
import {
  Badge, Button, ActionIcon, Card, Group, Stack, Text, Tabs, Select, Switch, Textarea, TextInput, Modal,
} from '@mantine/core';
import { Trash2, Plus } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { requireRouteData } from '@/core/runtime/route';
import {
  createDiscountGroupUseCase,
  deleteDiscountGroupUseCase,
  deleteMembershipTypeUseCase,
  deleteTarifUseCase,
  getContractSettingsUseCase,
  listDiscountGroupsUseCase,
  listMembershipTypesUseCase,
  listTarifsUseCase,
  saveContractSettingsUseCase,
  saveMembershipTypeUseCase,
  saveTarifUseCase,
} from '@/modules/contracts/use-cases/contract-settings.use-cases';
import { createGroupUseCase } from '@/modules/groups/use-cases/create-group.use-case';
import { deleteGroupUseCase } from '@/modules/groups/use-cases/delete-group.use-case';
import { listGroupsUseCase } from '@/modules/groups/use-cases/list-groups.use-case';

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: '1 Mon.', QUARTERLY: '3 Mon.', HALF_YEARLY: '6 Mon.', YEARLY: '12 Mon.',
};

type ContractSettingsActionData = {
  success?: boolean;
  intent?: string;
  error?: string;
};

type CollectionData<T> = {
  data?: T[];
};

function createSettingsForm(settings: ContractSettings | null) {
  return {
    invoice_publish_mode: settings?.invoicePublishMode || 'DRAFT',
    days_in_advance: settings?.daysInAdvance || 14,
    price_update_trigger: settings?.priceUpdateTrigger || 'ON_RENEWAL',
    sepa_required: !!settings?.sepaRequired,
    member_cancellation_allowed: !!settings?.memberCancellationAllowed,
    self_registration_enabled: !!settings?.selfRegistrationEnabled,
    self_registration_access: settings?.selfRegistrationAccess || 'LINK_AND_FORM',
    welcome_page_text: settings?.welcomePageText || '',
    confirmation_page_text: settings?.confirmationPageText || '',
  };
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const [settings, mtData, tarifData, dgData, groupsResult] = await Promise.all([
    getContractSettingsUseCase(env, user.orgId),
    listMembershipTypesUseCase(env, user.orgId),
    listTarifsUseCase(env, user.orgId),
    listDiscountGroupsUseCase(env, user.orgId),
    listGroupsUseCase(env, user.orgId),
  ]);
  const groupData = { data: groupsResult.groups };
  return { settings, mtData, tarifData, dgData, groupData };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  const intent = String(formData.get('intent') || '');
  const id = String(formData.get('id') || '');
  const payload = String(formData.get('payload') || '');
  const parsedPayload = payload ? JSON.parse(payload) as Record<string, unknown> : {};

  try {
    if (intent === 'save-settings') {
      await saveContractSettingsUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        ...parsedPayload,
      });
      return { success: true, intent };
    }
    if (intent === 'save-membership-type') {
      await saveMembershipTypeUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        id: id || undefined,
        payload: parsedPayload,
      });
      return { success: true, intent };
    }
    if (intent === 'delete-membership-type') {
      await deleteMembershipTypeUseCase(env, { orgId: user.orgId, actorUserId: user.id, id });
      return { success: true, intent };
    }
    if (intent === 'save-tarif') {
      await saveTarifUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        id: id || undefined,
        payload: parsedPayload,
      });
      return { success: true, intent };
    }
    if (intent === 'delete-tarif') {
      await deleteTarifUseCase(env, { orgId: user.orgId, actorUserId: user.id, id });
      return { success: true, intent };
    }
    if (intent === 'create-discount-group') {
      await createDiscountGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, name: String(formData.get('name') || '') });
      return { success: true, intent };
    }
    if (intent === 'delete-discount-group') {
      await deleteDiscountGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, id });
      return { success: true, intent };
    }
    if (intent === 'create-group') {
      await createGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, name: String(formData.get('name') || '') });
      return { success: true, intent };
    }
    if (intent === 'delete-group') {
      await deleteGroupUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId: id });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : 'Speichern fehlgeschlagen' };
  }

  return { success: false, error: 'Unbekannte Aktion' };
}

export default function ContractSettingsRoute() {
  const { settings, mtData, tarifData, dgData, groupData } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher<ContractSettingsActionData>();
  const revalidator = useRevalidator();
  const contractSettings = settings as ContractSettings | null;

  const membershipTypes = (mtData as CollectionData<MembershipType>)?.data || [];
  const tarifs = (tarifData as CollectionData<Tarif>)?.data || [];
  const discountGroups = (dgData as CollectionData<DiscountGroup>)?.data || [];
  const groups = (groupData as CollectionData<ContractGroup>)?.data || [];

  const [form, setForm] = useState(() => createSettingsForm(contractSettings));

  const handleSaveSettings = async () => {
    try {
      fetcher.submit({ intent: 'save-settings', payload: JSON.stringify(form) }, { method: 'post' });
    } catch (error) {
      notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Speichern fehlgeschlagen' });
    }
  };

  // Membership Type Dialog
  const [mtDialogOpen, setMtDialogOpen] = useState(false);
  const [mtEditItem, setMtEditItem] = useState<MembershipType | null>(null);
  const [mtSaving, setMtSaving] = useState(false);

  const openMtCreate = () => { setMtEditItem(null); setMtDialogOpen(true); };
  const openMtEdit = (mt: MembershipType) => { setMtEditItem(mt); setMtDialogOpen(true); };

  const handleMtSave = async (payload: ReturnType<typeof toApiPayload>, isEdit: boolean, id?: string) => {
    setMtSaving(true);
    try {
      if (isEdit && id) {
        fetcher.submit({ intent: 'save-membership-type', id, payload: JSON.stringify(payload) }, { method: 'post' });
      } else {
        fetcher.submit({ intent: 'save-membership-type', payload: JSON.stringify(payload) }, { method: 'post' });
      }
    } catch (error) {
      notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Speichern fehlgeschlagen' });
    }
    finally { setMtSaving(false); }
  };

  // Tarif Dialog
  const [tarifDialogOpen, setTarifDialogOpen] = useState(false);
  const [tarifEditItem, setTarifEditItem] = useState<Tarif | null>(null);
  const [tarifSaving, setTarifSaving] = useState(false);

  const openTarifCreate = () => { setTarifEditItem(null); setTarifDialogOpen(true); };
  const openTarifEdit = (t: Tarif) => { setTarifEditItem(t); setTarifDialogOpen(true); };

  const handleTarifSave = async (payload: ReturnType<typeof toTarifApiPayload>, isEdit: boolean, id?: string) => {
    setTarifSaving(true);
    try {
      if (isEdit && id) {
        fetcher.submit({ intent: 'save-tarif', id, payload: JSON.stringify(payload) }, { method: 'post' });
      } else {
        fetcher.submit({ intent: 'save-tarif', payload: JSON.stringify(payload) }, { method: 'post' });
      }
    } catch (error) {
      notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Speichern fehlgeschlagen' });
    }
    finally { setTarifSaving(false); }
  };

  // Simple dialogs for discount groups and groups
  const [dgDialogOpen, setDgDialogOpen] = useState(false);
  const [dgName, setDgName] = useState('');
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    const payload = fetcher.data || actionData;
    if (!payload) return;
    if (payload.success) {
      notifications.show({ color: 'green', message: 'Änderungen gespeichert' });
      if (payload.intent === 'save-membership-type') setMtDialogOpen(false);
      if (payload.intent === 'save-tarif') setTarifDialogOpen(false);
      if (payload.intent === 'create-discount-group') setDgDialogOpen(false);
      if (payload.intent === 'create-group') setGroupDialogOpen(false);
      revalidator.revalidate();
    } else if (payload.error) {
      notifications.show({ color: 'red', message: payload.error });
    }
  }, [fetcher.data, actionData, revalidator]);

  return (
    <Stack gap="lg">
      <div>
        <Text size="xl" fw={700}>Vertragseinstellungen</Text>
        <Text c="dimmed" size="sm">Konfigurieren Sie Mitgliedschaftsarten, Tarife, Gruppen und Abrechnungsoptionen</Text>
      </div>

      <Tabs defaultValue="settings">
        <Tabs.List grow>
          <Tabs.Tab value="settings">Allgemein</Tabs.Tab>
          <Tabs.Tab value="membership-types">Mitgliedschaftsarten</Tabs.Tab>
          <Tabs.Tab value="tarifs">Tarife</Tabs.Tab>
          <Tabs.Tab value="discount-groups">Rabattgruppen</Tabs.Tab>
          <Tabs.Tab value="groups">Gruppen</Tabs.Tab>
        </Tabs.List>

        {/* General Settings */}
        <Tabs.Panel value="settings" pt="md">
          <Stack gap="md">
            <Card>
              <Text fw={600} mb="md">Abrechnungseinstellungen</Text>
              <Stack gap="sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Rechnungserstellung"
                    value={form.invoice_publish_mode}
                    onChange={(val) => setForm(f => ({ ...f, invoice_publish_mode: val ?? 'DRAFT' }))}
                    data={[
                      { value: 'DRAFT', label: 'Als Entwurf' },
                      { value: 'AUTO_PUBLISH', label: 'Automatisch versenden' },
                    ]}
                  />
                  <TextInput
                    label="Vorlaufzeit (Tage)"
                    type="number"
                    value={form.days_in_advance}
                    onChange={(e) => setForm(f => ({ ...f, days_in_advance: parseInt(e.target.value) || 14 }))}
                  />
                  <Select
                    label="Preisanpassung"
                    value={form.price_update_trigger}
                    onChange={(val) => setForm(f => ({ ...f, price_update_trigger: val ?? 'ON_RENEWAL' }))}
                    data={[
                      { value: 'ON_RENEWAL', label: 'Bei Verlängerung' },
                      { value: 'ON_INVOICE', label: 'Bei Rechnungserstellung' },
                    ]}
                  />
                </div>
                <Switch
                  label="SEPA-Mandat erforderlich"
                  checked={form.sepa_required}
                  onChange={(e) => setForm(f => ({ ...f, sepa_required: e.currentTarget.checked }))}
                />
                <Switch
                  label="Mitglieder können selbst kündigen"
                  checked={form.member_cancellation_allowed}
                  onChange={(e) => setForm(f => ({ ...f, member_cancellation_allowed: e.currentTarget.checked }))}
                />
              </Stack>
            </Card>

            <Card>
              <Text fw={600} mb="md">Selbstregistrierung</Text>
              <Stack gap="sm">
                <Switch
                  label="Selbstregistrierung aktivieren"
                  checked={form.self_registration_enabled}
                  onChange={(e) => setForm(f => ({ ...f, self_registration_enabled: e.currentTarget.checked }))}
                />
                {form.self_registration_enabled && (
                  <>
                    <Select
                      label="Zugangsart"
                      value={form.self_registration_access}
                      onChange={(val) => setForm(f => ({ ...f, self_registration_access: val ?? 'LINK_AND_FORM' }))}
                      data={[
                        { value: 'LINK_AND_FORM', label: 'Link und Formular' },
                        { value: 'LINK_ONLY', label: 'Nur Link' },
                      ]}
                    />
                    <Textarea
                      label="Willkommenstext"
                      value={form.welcome_page_text}
                      onChange={(e) => setForm(f => ({ ...f, welcome_page_text: e.target.value }))}
                      rows={3}
                    />
                    <Textarea
                      label="Bestätigungstext"
                      value={form.confirmation_page_text}
                      onChange={(e) => setForm(f => ({ ...f, confirmation_page_text: e.target.value }))}
                      rows={3}
                    />
                  </>
                )}
              </Stack>
            </Card>

            <Group justify="flex-end">
              <Button onClick={handleSaveSettings} disabled={fetcher.state !== 'idle'} leftSection={<Save size={16} />}>
                {fetcher.state !== 'idle' ? 'Speichern...' : 'Einstellungen speichern'}
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>

        {/* Membership Types */}
        <Tabs.Panel value="membership-types" pt="md">
          <Card>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Mitgliedschaftsarten</Text>
              <Button size="sm" onClick={openMtCreate} leftSection={<Plus size={16} />}>Neu</Button>
            </Group>
            {membershipTypes.length === 0 ? (
              <Text c="dimmed" size="sm">Keine Mitgliedschaftsarten vorhanden</Text>
            ) : (
              <Stack gap="xs">
                {membershipTypes.map((mt) => (
                  <div key={mt.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <Text fw={500}>{mt.name}</Text>
                      <Group gap="xs" mt={4}>
                        <Badge color={mt.isActive ? 'blue' : 'gray'}>{mt.isActive ? 'Aktiv' : 'Inaktiv'}</Badge>
                        {mt.contractType && (
                          <Badge variant="outline">
                            {mt.contractType === 'AUTO_RENEW' ? 'Auto-Verlängerung' : mt.contractType === 'ONCE' ? 'Einmalig' : mt.contractType === 'FIXED' ? 'Fest' : 'Fest + Verlängerung'}
                          </Badge>
                        )}
                        {mt.pricing?.length > 0 && mt.pricing.map((p, i) => (
                          <Badge key={i} variant="outline">{p.price.toFixed(2)} € / {PERIOD_LABELS[p.billingPeriod] || p.billingPeriod}</Badge>
                        ))}
                        {mt.groupName && <Badge color="gray">{mt.groupName}</Badge>}
                      </Group>
                    </div>
                    <Group gap={4} ml="sm">
                      <ActionIcon variant="subtle" onClick={() => openMtEdit(mt)}>
                        <Pencil size={16} />
                      </ActionIcon>
                      <ActionIcon variant="subtle" color="red" onClick={() => {
                        if (confirm('Mitgliedschaftsart löschen?')) fetcher.submit({ intent: 'delete-membership-type', id: mt.id }, { method: 'post' });
                      }}>
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Group>
                  </div>
                ))}
              </Stack>
            )}
          </Card>
        </Tabs.Panel>

        {/* Tarifs */}
        <Tabs.Panel value="tarifs" pt="md">
          <Card>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Tarife</Text>
              <Button size="sm" onClick={openTarifCreate} leftSection={<Plus size={16} />}>Neu</Button>
            </Group>
            {tarifs.length === 0 ? (
              <Text c="dimmed" size="sm">Keine Tarife vorhanden</Text>
            ) : (
              <Stack gap="xs">
                {tarifs.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <Text fw={500}>{t.name}</Text>
                      <Group gap="xs" mt={4}>
                        <Badge color={t.isActive ? 'blue' : 'gray'}>{t.isActive ? 'Aktiv' : 'Inaktiv'}</Badge>
                        {t.contractType && (
                          <Badge variant="outline">
                            {t.contractType === 'AUTO_RENEW' ? 'Auto-Verlängerung' : t.contractType === 'ONCE' ? 'Einmalig' : t.contractType === 'FIXED' ? 'Fest' : 'Fest + Verlängerung'}
                          </Badge>
                        )}
                        {t.pricing?.length > 0 && t.pricing.map((p, i) => (
                          <Badge key={i} variant="outline">{p.price.toFixed(2)} € / {PERIOD_LABELS[p.billingPeriod] || p.billingPeriod}</Badge>
                        ))}
                        {t.groupName && <Badge color="gray">{t.groupName}</Badge>}
                      </Group>
                    </div>
                    <Group gap={4} ml="sm">
                      <ActionIcon variant="subtle" onClick={() => openTarifEdit(t)}>
                        <Pencil size={16} />
                      </ActionIcon>
                      <ActionIcon variant="subtle" color="red" onClick={() => {
                        if (confirm('Tarif löschen?')) fetcher.submit({ intent: 'delete-tarif', id: t.id }, { method: 'post' });
                      }}>
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Group>
                  </div>
                ))}
              </Stack>
            )}
          </Card>
        </Tabs.Panel>

        {/* Discount Groups */}
        <Tabs.Panel value="discount-groups" pt="md">
          <Card>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Rabattgruppen</Text>
              <Button size="sm" onClick={() => { setDgName(''); setDgDialogOpen(true); }} leftSection={<Plus size={16} />}>Neu</Button>
            </Group>
            {discountGroups.length === 0 ? (
              <Text c="dimmed" size="sm">Keine Rabattgruppen vorhanden</Text>
            ) : (
              <Stack gap="xs">
                {discountGroups.map((dg) => (
                  <div key={dg.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Text fw={500}>{dg.name}</Text>
                      {dg.groupName && <Text size="xs" c="dimmed">Gruppe: {dg.groupName}</Text>}
                    </div>
                    <ActionIcon variant="subtle" color="red" onClick={() => {
                      if (confirm('Rabattgruppe löschen?')) fetcher.submit({ intent: 'delete-discount-group', id: dg.id }, { method: 'post' });
                    }}>
                      <Trash2 size={16} />
                    </ActionIcon>
                  </div>
                ))}
              </Stack>
            )}
          </Card>
        </Tabs.Panel>

        {/* Groups */}
        <Tabs.Panel value="groups" pt="md">
          <Card>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Gruppen</Text>
              <Button size="sm" onClick={() => { setGroupName(''); setGroupDialogOpen(true); }} leftSection={<Plus size={16} />}>Neu</Button>
            </Group>
            {groups.length === 0 ? (
              <Text c="dimmed" size="sm">Keine Gruppen vorhanden</Text>
            ) : (
              <Stack gap="xs">
                {groups.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Text fw={500}>{g.name}</Text>
                      {g.description && <Text size="xs" c="dimmed">{g.description}</Text>}
                    </div>
                    <ActionIcon variant="subtle" color="red" onClick={() => {
                      if (confirm('Gruppe löschen?')) fetcher.submit({ intent: 'delete-group', id: g.id }, { method: 'post' });
                    }}>
                      <Trash2 size={16} />
                    </ActionIcon>
                  </div>
                ))}
              </Stack>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Membership Type Dialog (full form) */}
      <MembershipTypeDialog
        open={mtDialogOpen}
        onOpenChange={setMtDialogOpen}
        editItem={mtEditItem}
        groups={groups}
        onSave={handleMtSave}
        saving={mtSaving || fetcher.state !== 'idle'}
      />

      {/* Tarif Dialog (full form) */}
      <TarifDialog
        open={tarifDialogOpen}
        onOpenChange={setTarifDialogOpen}
        editItem={tarifEditItem}
        groups={groups}
        membershipTypes={membershipTypes}
        onSave={handleTarifSave}
        saving={tarifSaving || fetcher.state !== 'idle'}
      />

      {/* Create Discount Group Modal */}
      <Modal opened={dgDialogOpen} onClose={() => setDgDialogOpen(false)} title="Neue Rabattgruppe">
        <Stack gap="md">
          <TextInput
            label="Name"
            value={dgName}
            onChange={(e) => setDgName(e.target.value)}
            placeholder="z.B. Familie"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setDgDialogOpen(false)}>Abbrechen</Button>
            <Button
              onClick={async () => {
                try {
                  fetcher.submit({ intent: 'create-discount-group', name: dgName }, { method: 'post' });
                } catch (error) {
                  notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Speichern fehlgeschlagen' });
                }
              }}
              disabled={!dgName || fetcher.state !== 'idle'}
            >
              Erstellen
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Create Group Modal */}
      <Modal opened={groupDialogOpen} onClose={() => setGroupDialogOpen(false)} title="Neue Gruppe">
        <Stack gap="md">
          <TextInput
            label="Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="z.B. Abteilung Fußball"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Abbrechen</Button>
            <Button
              onClick={async () => {
                try {
                  fetcher.submit({ intent: 'create-group', name: groupName }, { method: 'post' });
                } catch (error) {
                  notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Speichern fehlgeschlagen' });
                }
              }}
              disabled={!groupName || fetcher.state !== 'idle'}
            >
              Erstellen
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
