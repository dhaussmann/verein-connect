import { useState } from 'react';
import type { MembershipType, TarifPricing } from '@/lib/api';
import { applicationRequirementOptions } from '@/modules/contracts/application-requirements';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Button, TextInput, Textarea, Tabs, Checkbox,
  Radio, Select, Modal,
} from '@mantine/core';
import { Trash2, Plus } from 'lucide-react';

const CONTRACT_TYPES = [
  { value: 'AUTO_RENEW', label: 'Automatische Verlängerung' },
  { value: 'ONCE', label: 'Einmalig' },
  { value: 'FIXED', label: 'Feste Laufzeit' },
  { value: 'FIXED_RENEW', label: 'Feste Laufzeit mit Verlängerung' },
];

const CANCELLATION_BASIS = [
  { value: 'FROM_CANCELLATION', label: 'Vom Kündigungszeitpunkt' },
  { value: 'BEFORE_END_OF_PERIOD', label: 'Vor Ablauf der Periode' },
];

const BILLING_PERIODS = [
  { value: 'MONTHLY', label: '1 Monat', months: 1 },
  { value: 'QUARTERLY', label: '3 Monate', months: 3 },
  { value: 'HALF_YEARLY', label: '6 Monate', months: 6 },
  { value: 'YEARLY', label: '12 Monate', months: 12 },
];

const INVOICE_DAYS = [
  { value: '1', label: 'Erster des Monats' },
  { value: '15', label: '15. des Monats' },
  { value: '0', label: 'Vertragsbeginn' },
];

const VAT_OPTIONS = ['0', '7', '19'];

interface PricingRow {
  billing_period: string;
  price: string;
}

export interface MembershipTypeFormData {
  name: string;
  is_active: boolean;
  short_description: string;
  description: string;
  bank_account_id: string;
  invoice_category: string;
  vat_percent: string;
  default_invoice_day: string;
  activation_fee: string;
  contract_type: string;
  contract_duration_months: string;
  cancellation_notice_days: string;
  cancellation_notice_basis: string;
  renewal_duration_months: string;
  renewal_cancellation_days: string;
  sort_order: string;
  application_requirements: string[];
  pricing: PricingRow[];
}

function emptyForm(): MembershipTypeFormData {
  return {
    name: '',
    is_active: true,
    short_description: '',
    description: '',
    bank_account_id: '',
    invoice_category: '',
    vat_percent: '0',
    default_invoice_day: '1',
    activation_fee: '0',
    contract_type: 'AUTO_RENEW',
    contract_duration_months: '1',
    cancellation_notice_days: '1',
    cancellation_notice_basis: 'FROM_CANCELLATION',
    renewal_duration_months: '1',
    renewal_cancellation_days: '1',
    sort_order: '0',
    application_requirements: [],
    pricing: [{ billing_period: 'MONTHLY', price: '' }],
  };
}

function fromMembershipType(mt: MembershipType): MembershipTypeFormData {
  return {
    name: mt.name,
    is_active: mt.isActive === 1,
    short_description: mt.shortDescription || '',
    description: mt.description || '',
    bank_account_id: mt.bankAccountId || '',
    invoice_category: mt.invoiceCategory || '',
    vat_percent: String(mt.vatPercent ?? 0),
    default_invoice_day: String(mt.defaultInvoiceDay ?? 1),
    activation_fee: String(mt.activationFee ?? 0),
    contract_type: mt.contractType || 'AUTO_RENEW',
    contract_duration_months: String(mt.contractDurationMonths ?? 1),
    cancellation_notice_days: String(mt.cancellationNoticeDays ?? 1),
    cancellation_notice_basis: mt.cancellationNoticeBasis || 'FROM_CANCELLATION',
    renewal_duration_months: String(mt.renewalDurationMonths ?? 1),
    renewal_cancellation_days: String(mt.renewalCancellationDays ?? 1),
    sort_order: String(mt.sortOrder ?? 0),
    application_requirements: mt.applicationRequirements || [],
    pricing: mt.pricing?.length
      ? mt.pricing.map(p => ({ billing_period: p.billingPeriod, price: String(p.price) }))
      : [{ billing_period: 'MONTHLY', price: '' }],
  };
}

export function toApiPayload(form: MembershipTypeFormData) {
  return {
    name: form.name,
    is_active: form.is_active,
    short_description: form.short_description || undefined,
    description: form.description || undefined,
    bank_account_id: form.bank_account_id || undefined,
    invoice_category: form.invoice_category || undefined,
    vat_percent: parseFloat(form.vat_percent) || 0,
    default_invoice_day: parseInt(form.default_invoice_day) || 1,
    activation_fee: parseFloat(form.activation_fee) || 0,
    contract_type: form.contract_type,
    contract_duration_months: parseInt(form.contract_duration_months) || undefined,
    renewal_duration_months: parseInt(form.renewal_duration_months) || undefined,
    cancellation_notice_days: parseInt(form.cancellation_notice_days) || 30,
    cancellation_notice_basis: form.cancellation_notice_basis,
    renewal_cancellation_days: parseInt(form.renewal_cancellation_days) || undefined,
    application_requirements: form.application_requirements,
    sort_order: parseInt(form.sort_order) || 0,
    pricing: form.pricing
      .filter(p => p.price !== '' && !isNaN(parseFloat(p.price)))
      .map(p => ({
        billing_period: p.billing_period,
        price: parseFloat(p.price),
      })),
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: MembershipType | null;
  onSave: (data: ReturnType<typeof toApiPayload>, isEdit: boolean, id?: string) => Promise<void>;
  saving: boolean;
}

export default function MembershipTypeDialog({ open, onOpenChange, editItem, onSave, saving }: Props) {
  const isEdit = !!editItem;

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={isEdit ? 'Mitgliedsart bearbeiten' : 'Neue Mitgliedsart'}
      size="xl"
      styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
    >
      {open && (
        <MembershipTypeDialogForm
          key={editItem?.id ?? 'new'}
          editItem={editItem}
          onOpenChange={onOpenChange}
          onSave={onSave}
          saving={saving}
        />
      )}
    </Modal>
  );
}

type MembershipTypeDialogFormProps = Pick<Props, 'editItem' | 'onOpenChange' | 'onSave' | 'saving'>;

function MembershipTypeDialogForm({ editItem, onOpenChange, onSave, saving }: MembershipTypeDialogFormProps) {
  const [form, setForm] = useState<MembershipTypeFormData>(() => editItem ? fromMembershipType(editItem) : emptyForm());
  const isEdit = !!editItem;

  const set = <K extends keyof MembershipTypeFormData>(key: K, value: MembershipTypeFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const updatePricing = (index: number, field: keyof PricingRow, value: string) => {
    setForm(prev => {
      const pricing = [...prev.pricing];
      pricing[index] = { ...pricing[index], [field]: value };
      return { ...prev, pricing };
    });
  };

  const toggleRequirement = (value: string) => {
    setForm((prev) => ({
      ...prev,
      application_requirements: prev.application_requirements.includes(value)
        ? prev.application_requirements.filter((item) => item !== value)
        : [...prev.application_requirements, value],
    }));
  };

  const addPricingRow = () => {
    const usedPeriods = form.pricing.map(p => p.billing_period);
    const next = BILLING_PERIODS.find(bp => !usedPeriods.includes(bp.value));
    if (next) {
      setForm(prev => ({ ...prev, pricing: [...prev.pricing, { billing_period: next.value, price: '' }] }));
    }
  };

  const removePricingRow = (index: number) => {
    setForm(prev => ({ ...prev, pricing: prev.pricing.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    const payload = toApiPayload(form);
    await onSave(payload, isEdit, editItem?.id);
  };

  const showRenewal = form.contract_type === 'AUTO_RENEW' || form.contract_type === 'FIXED_RENEW';

  return (
    <>
      <Tabs defaultValue="basisdaten" mt="xs">
        <Tabs.List grow>
          <Tabs.Tab value="basisdaten">BASISDATEN</Tabs.Tab>
          <Tabs.Tab value="automatisierung">DARSTELLUNG</Tabs.Tab>
        </Tabs.List>

        {/* ─── Tab: Basisdaten ─── */}
        <Tabs.Panel value="basisdaten" pt="md">
          <div className="space-y-6">
            {/* Name + Aktiv */}
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label={<span className="text-xs uppercase text-muted-foreground">Name *</span>}
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
              <div>
                <Radio.Group
                  label={<span className="text-xs uppercase text-muted-foreground">Aktiv</span>}
                  value={form.is_active ? 'true' : 'false'}
                  onChange={v => set('is_active', v === 'true')}
                >
                  <div className="flex items-center gap-4 mt-2">
                    <Radio value="true" label="Ja" />
                    <Radio value="false" label="Nein" />
                  </div>
                </Radio.Group>
                <p className="text-xs text-muted-foreground mt-1">Erlaubt das Erstellen neuer Verträge</p>
              </div>
            </div>

            {/* Kurzbeschreibung */}
            <div>
              <Textarea
                label={<span className="text-xs uppercase text-muted-foreground">Kurzbeschreibung (z. B. Altersgrenze)</span>}
                value={form.short_description}
                onChange={e => set('short_description', e.target.value.slice(0, 100))}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.short_description.length} / 100 — Kurzbeschreibung der Mitgliedsart, z.B. Altersangaben
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Pflichtangaben im Beitrittsantrag</p>
              <div className="border rounded-md p-3 space-y-2">
                {applicationRequirementOptions.map((option) => (
                  <Checkbox
                    key={option.value}
                    label={option.label}
                    checked={form.application_requirements.includes(option.value)}
                    onChange={() => toggleRequirement(option.value)}
                  />
                ))}
              </div>
            </div>

            {/* Beschreibung (Rich-Text) */}
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Beschreibung</p>
              <RichTextEditor
                content={form.description}
                onChange={v => set('description', v)}
                placeholder="Detaillierte Beschreibung der Mitgliedsart"
              />
            </div>

            {/* ─── Abrechnungseinstellungen ─── */}
            <div>
              <h3 className="text-base font-semibold">Abrechnungseinstellungen und Aktivierungsgebühr</h3>
              <p className="text-xs text-muted-foreground italic">MwSt. % wird für alle Preise verwendet</p>
            </div>

            <TextInput
              label={<span className="text-xs uppercase text-muted-foreground">Bankkonto</span>}
              value={form.bank_account_id}
              onChange={e => set('bank_account_id', e.target.value)}
              placeholder="z.B. DE89 3704 0044 0532 0130 00"
            />

            <TextInput
              label={<span className="text-xs uppercase text-muted-foreground">Rechnungskategorie</span>}
              value={form.invoice_category}
              onChange={e => set('invoice_category', e.target.value)}
              placeholder="z.B. Mitgliedergebühren"
            />

            <div className="grid grid-cols-3 gap-4">
              <Select
                label={<span className="text-xs uppercase text-muted-foreground">MwSt (%)</span>}
                value={form.vat_percent}
                onChange={v => set('vat_percent', v ?? '0')}
                data={VAT_OPTIONS.map(v => ({ value: v, label: v }))}
              />
              <Select
                label={<span className="text-xs uppercase text-muted-foreground">Standard-Rechnungsdatum</span>}
                value={form.default_invoice_day}
                onChange={v => set('default_invoice_day', v ?? '1')}
                data={INVOICE_DAYS.map(d => ({ value: d.value, label: d.label }))}
              />
              <TextInput
                label={<span className="text-xs uppercase text-muted-foreground">Aktivierungsgebühr</span>}
                type="number"
                step="0.01"
                value={form.activation_fee}
                onChange={e => set('activation_fee', e.target.value)}
              />
            </div>

            {/* ─── Gültigkeitszeitraum ─── */}
            <div>
              <h3 className="text-base font-semibold">Gültigkeitszeitraum</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label={<span className="text-xs uppercase text-muted-foreground">Vertragstyp</span>}
                value={form.contract_type}
                onChange={v => set('contract_type', v ?? 'AUTO_RENEW')}
                data={CONTRACT_TYPES.map(ct => ({ value: ct.value, label: ct.label }))}
              />
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Vertragsdauer</p>
                <div className="flex items-center gap-2">
                  <TextInput
                    type="number"
                    value={form.contract_duration_months}
                    onChange={e => set('contract_duration_months', e.target.value)}
                    style={{ width: '5rem' }}
                  />
                  <span className="text-sm text-muted-foreground">Monat</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Kündigungsfrist</p>
              <div className="flex items-center gap-2">
                <TextInput
                  type="number"
                  value={form.cancellation_notice_days}
                  onChange={e => set('cancellation_notice_days', e.target.value)}
                  style={{ width: '5rem' }}
                />
                <span className="text-sm text-muted-foreground">Monat</span>
                <Select
                  value={form.cancellation_notice_basis}
                  onChange={v => set('cancellation_notice_basis', v ?? 'FROM_CANCELLATION')}
                  data={CANCELLATION_BASIS.map(cb => ({ value: cb.value, label: cb.label }))}
                  style={{ width: '260px' }}
                />
              </div>
            </div>

            {/* ─── Folgezeiträume ─── */}
            {showRenewal && (
              <>
                <div>
                  <h3 className="text-base font-semibold">Folgezeiträume</h3>
                  <p className="text-xs text-muted-foreground italic">
                    Dem Mitglied wird derselbe Monatstarif wie in der ersten Periode berechnet.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Vertragsverlängerung</p>
                    <div className="flex items-center gap-2">
                      <TextInput
                        type="number"
                        value={form.renewal_duration_months}
                        onChange={e => set('renewal_duration_months', e.target.value)}
                        style={{ width: '5rem' }}
                      />
                      <span className="text-sm text-muted-foreground">Monat</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Kündigungsfrist für Vertragsverlängerung</p>
                    <div className="flex items-center gap-2">
                      <TextInput
                        type="number"
                        value={form.renewal_cancellation_days}
                        onChange={e => set('renewal_cancellation_days', e.target.value)}
                        style={{ width: '5rem' }}
                      />
                      <span className="text-sm text-muted-foreground">Monat Vom Kündigungszeitpunkt</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ─── Preistabelle ─── */}
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 text-xs uppercase text-muted-foreground font-medium">Abrechnungszeitraum</th>
                    <th className="text-left p-2 text-xs uppercase text-muted-foreground font-medium">Preis für die Rechnungsperiode</th>
                    <th className="text-left p-2 text-xs uppercase text-muted-foreground font-medium">Monatliche Gebühr</th>
                    <th className="text-left p-2 text-xs uppercase text-muted-foreground font-medium">Gesamtpreis</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.pricing.map((row, i) => {
                    const bp = BILLING_PERIODS.find(b => b.value === row.billing_period);
                    const price = parseFloat(row.price) || 0;
                    const months = bp?.months || 1;
                    const monthly = months > 0 ? price / months : price;
                    const contractMonths = parseInt(String(form.contract_duration_months)) || 1;
                    const total = monthly * contractMonths;
                    return (
                      <tr key={i} className="border-b">
                        <td className="p-2">
                          <Select
                            value={row.billing_period}
                            onChange={v => updatePricing(i, 'billing_period', v ?? 'MONTHLY')}
                            data={BILLING_PERIODS.map(bp => ({ value: bp.value, label: bp.label }))}
                            style={{ width: '140px' }}
                          />
                        </td>
                        <td className="p-2">
                          <TextInput
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={row.price}
                            onChange={e => updatePricing(i, 'price', e.target.value)}
                            style={{ width: '120px' }}
                          />
                        </td>
                        <td className="p-2 text-muted-foreground">{monthly.toFixed(2)}</td>
                        <td className="p-2 text-muted-foreground">{total.toFixed(2)}</td>
                        <td className="p-2">
                          {form.pricing.length > 1 && (
                            <Button variant="subtle" color="red" size="compact-sm" px={4} onClick={() => removePricingRow(i)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {form.pricing.length < BILLING_PERIODS.length && (
                <button
                  type="button"
                  onClick={addPricingRow}
                  className="w-full p-2 text-sm text-primary hover:bg-muted/30 transition-colors flex items-center gap-1 justify-start"
                >
                  <Plus className="h-3.5 w-3.5" /> Abrechnungszeitraum hinzufügen
                </button>
              )}
            </div>
          </div>
        </Tabs.Panel>

        {/* ─── Tab: Automatisierung ─── */}
        <Tabs.Panel value="automatisierung" pt="md">
          <div className="space-y-6">
            <div>
              <TextInput
                label={<span className="text-xs uppercase text-muted-foreground">Sortierung</span>}
                type="number"
                value={form.sort_order}
                onChange={e => set('sort_order', e.target.value)}
                style={{ width: '6rem' }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Bestimmt die Reihenfolge in Listen
              </p>
            </div>
          </div>
        </Tabs.Panel>
      </Tabs>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t mt-4">
        <Button onClick={handleSave} disabled={!form.name || saving}>
          {saving ? 'SPEICHERN...' : 'SPEICHERN'}
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)}>SCHLIESSEN</Button>
      </div>

    </>
  );
}
