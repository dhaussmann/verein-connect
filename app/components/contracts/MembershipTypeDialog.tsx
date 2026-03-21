import { useState, useEffect } from 'react';
import type { MembershipType, Group, TarifPricing } from '@/lib/api';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
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
  default_group_id: string;
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
  self_registration_enabled: boolean;
  is_family_tarif: boolean;
  min_family_members: string;
  sort_order: string;
  pricing: PricingRow[];
}

function emptyForm(): MembershipTypeFormData {
  return {
    name: '',
    is_active: true,
    default_group_id: '',
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
    self_registration_enabled: false,
    is_family_tarif: false,
    min_family_members: '3',
    sort_order: '0',
    pricing: [{ billing_period: 'MONTHLY', price: '' }],
  };
}

function fromMembershipType(mt: MembershipType): MembershipTypeFormData {
  return {
    name: mt.name,
    is_active: mt.isActive === 1,
    default_group_id: mt.defaultGroupId || '',
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
    self_registration_enabled: mt.selfRegistrationEnabled === 1,
    is_family_tarif: mt.isFamilyTarif === 1,
    min_family_members: String(mt.minFamilyMembers ?? 3),
    sort_order: String(mt.sortOrder ?? 0),
    pricing: mt.pricing?.length
      ? mt.pricing.map(p => ({ billing_period: p.billingPeriod, price: String(p.price) }))
      : [{ billing_period: 'MONTHLY', price: '' }],
  };
}

export function toApiPayload(form: MembershipTypeFormData) {
  return {
    name: form.name,
    is_active: form.is_active,
    self_registration_enabled: form.self_registration_enabled,
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
    default_group_id: form.default_group_id || null,
    is_family_tarif: form.is_family_tarif,
    min_family_members: parseInt(form.min_family_members) || 3,
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
  groups: Group[];
  onSave: (data: ReturnType<typeof toApiPayload>, isEdit: boolean, id?: string) => Promise<void>;
  saving: boolean;
}

export default function MembershipTypeDialog({ open, onOpenChange, editItem, groups, onSave, saving }: Props) {
  const [form, setForm] = useState<MembershipTypeFormData>(emptyForm());
  const isEdit = !!editItem;

  useEffect(() => {
    if (open) {
      setForm(editItem ? fromMembershipType(editItem) : emptyForm());
    }
  }, [open, editItem]);

  const set = (key: keyof MembershipTypeFormData, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const updatePricing = (index: number, field: keyof PricingRow, value: string) => {
    setForm(prev => {
      const pricing = [...prev.pricing];
      pricing[index] = { ...pricing[index], [field]: value };
      return { ...prev, pricing };
    });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Mitgliedsart bearbeiten' : 'Neue Mitgliedsart'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basisdaten" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basisdaten">BASISDATEN</TabsTrigger>
            <TabsTrigger value="automatisierung">AUTOMATISIERUNG</TabsTrigger>
          </TabsList>

          {/* ─── Tab: Basisdaten ─── */}
          <TabsContent value="basisdaten" className="space-y-6 mt-4">
            {/* Name + Aktiv */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Name *</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Aktiv</Label>
                <RadioGroup
                  value={form.is_active ? 'true' : 'false'}
                  onValueChange={v => set('is_active', v === 'true')}
                  className="flex items-center gap-4 mt-2"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="true" id="active-yes" />
                    <Label htmlFor="active-yes" className="font-normal">Ja</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="false" id="active-no" />
                    <Label htmlFor="active-no" className="font-normal">Nein</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-1">Erlaubt das Erstellen neuer Verträge</p>
              </div>
            </div>

            {/* Standardgruppe */}
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Standardgruppe für Verträge</Label>
              <Select value={form.default_group_id || '__none__'} onValueChange={v => set('default_group_id', v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Standardgruppe für Verträge" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keine</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Kurzbeschreibung */}
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Kurzbeschreibung (z. B. Altersgrenze)</Label>
              <Textarea
                value={form.short_description}
                onChange={e => set('short_description', e.target.value.slice(0, 100))}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.short_description.length} / 100 — Kurzbeschreibung der Mitgliedsart, z.B. Altersangaben
              </p>
            </div>

            {/* Beschreibung (Rich-Text) */}
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Beschreibung</Label>
              <RichTextEditor
                value={form.description}
                onChange={v => set('description', v)}
                placeholder="Detaillierte Beschreibung der Mitgliedsart"
              />
            </div>

            {/* ─── Abrechnungseinstellungen ─── */}
            <div>
              <h3 className="text-base font-semibold">Abrechnungseinstellungen und Aktivierungsgebühr</h3>
              <p className="text-xs text-muted-foreground italic">MwSt. % wird für alle Preise verwendet</p>
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Bankkonto</Label>
              <Input
                value={form.bank_account_id}
                onChange={e => set('bank_account_id', e.target.value)}
                placeholder="z.B. DE89 3704 0044 0532 0130 00"
              />
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Rechnungskategorie</Label>
              <Input
                value={form.invoice_category}
                onChange={e => set('invoice_category', e.target.value)}
                placeholder="z.B. Mitgliedergebühren"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">MwSt (%)</Label>
                <Select value={form.vat_percent} onValueChange={v => set('vat_percent', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VAT_OPTIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Standard-Rechnungsdatum</Label>
                <Select value={form.default_invoice_day} onValueChange={v => set('default_invoice_day', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVOICE_DAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Aktivierungsgebühr</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.activation_fee}
                  onChange={e => set('activation_fee', e.target.value)}
                />
              </div>
            </div>

            {/* ─── Gültigkeitszeitraum ─── */}
            <div>
              <h3 className="text-base font-semibold">Gültigkeitszeitraum</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Vertragstyp</Label>
                <Select value={form.contract_type} onValueChange={v => set('contract_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(ct => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Vertragsdauer</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={form.contract_duration_months}
                    onChange={e => set('contract_duration_months', e.target.value)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">Monat</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Kündigungsfrist</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={form.cancellation_notice_days}
                  onChange={e => set('cancellation_notice_days', e.target.value)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">Monat</span>
                <Select value={form.cancellation_notice_basis} onValueChange={v => set('cancellation_notice_basis', v)}>
                  <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CANCELLATION_BASIS.map(cb => <SelectItem key={cb.value} value={cb.value}>{cb.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                    <Label className="text-xs uppercase text-muted-foreground">Vertragsverlängerung</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={form.renewal_duration_months}
                        onChange={e => set('renewal_duration_months', e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">Monat</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Kündigungsfrist für Vertragsverlängerung</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={form.renewal_cancellation_days}
                        onChange={e => set('renewal_cancellation_days', e.target.value)}
                        className="w-20"
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
                          <Select value={row.billing_period} onValueChange={v => updatePricing(i, 'billing_period', v)}>
                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {BILLING_PERIODS.map(bp => (
                                <SelectItem key={bp.value} value={bp.value}>{bp.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={row.price}
                            onChange={e => updatePricing(i, 'price', e.target.value)}
                            className="w-[120px]"
                          />
                        </td>
                        <td className="p-2 text-muted-foreground">{monthly.toFixed(2)}</td>
                        <td className="p-2 text-muted-foreground">{total.toFixed(2)}</td>
                        <td className="p-2">
                          {form.pricing.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removePricingRow(i)}>
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
          </TabsContent>

          {/* ─── Tab: Automatisierung ─── */}
          <TabsContent value="automatisierung" className="space-y-6 mt-4">
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <Label className="font-medium">Selbstregistrierung aktivieren</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Mitglieder können sich online für diese Mitgliedsart anmelden
                </p>
              </div>
              <Switch
                checked={form.self_registration_enabled}
                onCheckedChange={v => set('self_registration_enabled', v)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <Label className="font-medium">Familientarif</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Vertrag gilt für ein Familienprofil (Festpreis für alle Familienmitglieder)
                </p>
              </div>
              <Switch
                checked={form.is_family_tarif}
                onCheckedChange={v => set('is_family_tarif', v)}
              />
            </div>

            {form.is_family_tarif && (
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Mindestanzahl Familienmitglieder</Label>
                <Input
                  type="number"
                  min="2"
                  value={form.min_family_members}
                  onChange={e => set('min_family_members', e.target.value)}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ein Familienprofil muss mindestens diese Anzahl Mitglieder haben
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Sortierung</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={e => set('sort_order', e.target.value)}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Bestimmt die Reihenfolge in Listen und bei der Selbstregistrierung
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button onClick={handleSave} disabled={!form.name || saving}>
            {saving ? 'SPEICHERN...' : 'SPEICHERN'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>SCHLIESSEN</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
