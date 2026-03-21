import { useState } from 'react';
import { format, addMonths, parseISO } from 'date-fns';
import { Form, Link, redirect, useLoaderData, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import {
  Button, ActionIcon, Card, Group, Stack, Text, Select, Switch, Textarea, TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type {
  Member,
  MembershipType,
  Tarif,
} from '@/modules/contracts/types/contracts.types';
import { requireRouteData } from '@/core/runtime/route';
import { listMembersUseCase } from '@/modules/members/use-cases/list-members.use-case';
import { listMembershipTypesUseCase, listTarifsUseCase } from '@/modules/contracts/use-cases/contract-settings.use-cases';
import { createContractUseCase } from '@/modules/contracts/use-cases/contracts.use-cases';

type ContractNewActionData = {
  success?: boolean;
  error?: string;
};

type ContractNewListData<T> = {
  data?: T[];
};

type ContractFormState = {
  member_id: string;
  contract_kind: 'MEMBERSHIP' | 'TARIF';
  membership_type_id: string;
  tarif_id: string;
  start_date: string;
  end_date: string;
  billing_period: string;
  current_price: string;
  auto_renew: boolean;
  notes: string;
};

export const handle = {
  breadcrumb: "Neuer Vertrag",
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const [membersResult, mtData, tarifData] = await Promise.all([
    listMembersUseCase(env, user.orgId, { page: 1, perPage: 500 }),
    listMembershipTypesUseCase(env, user.orgId),
    listTarifsUseCase(env, user.orgId),
  ]);
  return { membersData: { data: membersResult.members }, mtData, tarifData };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const formData = await request.formData();
  try {
    await createContractUseCase(env, {
      orgId: user.orgId,
      actorUserId: user.id,
      payload: {
        member_id: String(formData.get('member_id') || ''),
        contract_kind: String(formData.get('contract_kind') || 'MEMBERSHIP'),
        start_date: String(formData.get('start_date') || ''),
        end_date: String(formData.get('end_date') || ''),
        billing_period: String(formData.get('billing_period') || ''),
        current_price: Number(formData.get('current_price') || 0),
        auto_renew: formData.get('auto_renew') === 'on',
        notes: String(formData.get('notes') || ''),
        membership_type_id: String(formData.get('membership_type_id') || ''),
        tarif_id: String(formData.get('tarif_id') || ''),
      },
    });
    return redirect('/contracts');
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erstellen fehlgeschlagen' };
  }
}

export default function ContractNewRoute() {
  const { membersData, mtData, tarifData } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigationState = useNavigation().state;

  const members = (membersData as ContractNewListData<Member>)?.data || [];
  const membershipTypes = (mtData as ContractNewListData<MembershipType>)?.data || [];
  const tarifs = (tarifData as ContractNewListData<Tarif>)?.data || [];
  const [form, setForm] = useState<ContractFormState>({
    member_id: '',
    contract_kind: 'MEMBERSHIP',
    membership_type_id: '',
    tarif_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    billing_period: '',
    current_price: '',
    auto_renew: true,
    notes: '',
  });

  const set = <K extends keyof ContractFormState>(key: K, value: ContractFormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const selectedType = form.contract_kind === 'MEMBERSHIP'
    ? membershipTypes.find(mt => mt.id === form.membership_type_id)
    : tarifs.find(t => t.id === form.tarif_id);

  const availablePricing = selectedType?.pricing || [];

  const applyDefaults = (type: typeof selectedType) => {
    if (!type) return;
    const firstPricing = type.pricing?.[0];
    const billingPeriod = firstPricing?.billingPeriod || 'MONTHLY';
    const price = firstPricing?.price?.toString() || '';
    const autoRenew = type.contractType === 'AUTO_RENEW' || type.contractType === 'FIXED_RENEW';
    let endDate = '';
    if (type.contractDurationMonths) {
      endDate = format(addMonths(parseISO(form.start_date), type.contractDurationMonths), 'yyyy-MM-dd');
    }

    setForm(prev => ({
      ...prev,
      billing_period: billingPeriod,
      current_price: price,
      auto_renew: autoRenew,
      end_date: endDate,
    }));
  };

  const handleMembershipTypeChange = (id: string) => {
    set('membership_type_id', id);
    const mt = membershipTypes.find((m) => m.id === id);
    applyDefaults(mt);
  };

  const handleTarifChange = (id: string) => {
    set('tarif_id', id);
    const t = tarifs.find((tr) => tr.id === id);
    applyDefaults(t);
  };

  const handleBillingPeriodChange = (period: string) => {
    set('billing_period', period);
    const pricing = availablePricing.find(p => p.billingPeriod === period);
    if (pricing) {
      set('current_price', pricing.price.toString());
    }
  };

  return (
    <Stack gap="lg">
      <Group gap="md">
        <ActionIcon variant="subtle" component={Link} to="/contracts">
          <ArrowLeft size={20} />
        </ActionIcon>
        <div>
          <Text size="xl" fw={700}>Neuer Vertrag</Text>
          <Text c="dimmed" size="sm">Erstellen Sie einen neuen Mitgliedervertrag</Text>
        </div>
      </Group>

      <Form
        method="post"
        onSubmit={(event) => {
          if (!form.member_id) {
            event.preventDefault();
            notifications.show({ color: 'red', message: 'Bitte wählen Sie ein Mitglied' });
          }
        }}
      >
        <Stack gap="lg">
          <input type="hidden" name="member_id" value={form.member_id} />
          <input type="hidden" name="contract_kind" value={form.contract_kind} />
          <input type="hidden" name="membership_type_id" value={form.membership_type_id} />
          <input type="hidden" name="tarif_id" value={form.tarif_id} />
          <input type="hidden" name="billing_period" value={form.billing_period} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mitglied & Vertragsart */}
            <Card>
              <Text fw={600} mb="md">Vertragsdaten</Text>
              <Stack gap="sm">
                <Select
                  label="Mitglied *"
                  value={form.member_id || null}
                  onChange={(val) => set('member_id', val ?? '')}
                  placeholder="Mitglied wählen..."
                  data={members.map((m) => ({
                    value: m.id,
                    label: `${m.firstName} ${m.lastName} (${m.email})`,
                  }))}
                  searchable
                />

                <Select
                  label="Vertragsart"
                  value={form.contract_kind}
                  onChange={(val) => set('contract_kind', (val === 'TARIF' ? 'TARIF' : 'MEMBERSHIP'))}
                  data={[
                    { value: 'MEMBERSHIP', label: 'Mitgliedschaft' },
                    { value: 'TARIF', label: 'Tarif' },
                  ]}
                />

                {form.contract_kind === 'MEMBERSHIP' && (
                  <Select
                    label="Mitgliedschaftsart"
                    value={form.membership_type_id || null}
                    onChange={(val) => handleMembershipTypeChange(val ?? '')}
                    placeholder="Wählen..."
                    data={membershipTypes.map((mt) => ({ value: mt.id, label: mt.name }))}
                  />
                )}

                {form.contract_kind === 'TARIF' && (
                  <Select
                    label="Tarif"
                    value={form.tarif_id || null}
                    onChange={(val) => handleTarifChange(val ?? '')}
                    placeholder="Wählen..."
                    data={tarifs.map((t) => ({ value: t.id, label: t.name }))}
                  />
                )}

              </Stack>
            </Card>

            {/* Laufzeit & Preis */}
            <Card>
              <Text fw={600} mb="md">Laufzeit &amp; Abrechnung</Text>
              <Stack gap="sm">
                <TextInput
                  name="start_date"
                  label="Startdatum *"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => set('start_date', e.target.value)}
                />

                <TextInput
                  name="end_date"
                  label="Enddatum (optional)"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => set('end_date', e.target.value)}
                />

                {availablePricing.length > 0 ? (
                  <Select
                    label="Abrechnungszeitraum"
                    value={form.billing_period || null}
                    onChange={(val) => handleBillingPeriodChange(val ?? '')}
                    placeholder="Wählen..."
                    data={availablePricing.map((p) => ({
                      value: p.billingPeriod,
                      label: `${p.billingPeriod === 'MONTHLY' ? 'Monatlich' : p.billingPeriod === 'QUARTERLY' ? 'Vierteljährlich' : p.billingPeriod === 'HALF_YEARLY' ? 'Halbjährlich' : 'Jährlich'} – ${p.price.toFixed(2)} €`,
                    }))}
                    description={selectedType && availablePricing.length > 0 ? `Preise aus ${selectedType.name} übernommen` : undefined}
                  />
                ) : (
                  <Select
                    label="Abrechnungszeitraum"
                    value={form.billing_period || null}
                    onChange={(val) => set('billing_period', val ?? '')}
                    placeholder="Wählen..."
                    data={[
                      { value: 'MONTHLY', label: 'Monatlich' },
                      { value: 'QUARTERLY', label: 'Vierteljährlich' },
                      { value: 'HALF_YEARLY', label: 'Halbjährlich' },
                      { value: 'YEARLY', label: 'Jährlich' },
                    ]}
                  />
                )}

                <TextInput
                  name="current_price"
                  label="Preis (€)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.current_price}
                  onChange={(e) => set('current_price', e.target.value)}
                  description={selectedType && availablePricing.length > 0 ? 'Automatisch aus Preistabelle – manuell änderbar' : undefined}
                />

                <Switch
                  name="auto_renew"
                  label="Auto-Verlängerung"
                  checked={form.auto_renew}
                  onChange={(e) => set('auto_renew', e.currentTarget.checked)}
                />

                <Textarea
                  name="notes"
                  label="Notizen (optional)"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={3}
                />
              </Stack>
            </Card>
          </div>

          <Group justify="flex-end" gap="sm" align="center">
            {actionData?.error && <Text c="red" size="sm">{actionData.error}</Text>}
            <Button variant="outline" type="button" component={Link} to="/contracts">Abbrechen</Button>
            <Button type="submit" disabled={navigationState === 'submitting'}>
              {navigationState === 'submitting' ? 'Wird erstellt...' : 'Vertrag erstellen'}
            </Button>
          </Group>
        </Stack>
      </Form>
    </Stack>
  );
}
