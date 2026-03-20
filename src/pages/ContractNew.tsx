import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { useCreateContract, useMembers, useMembershipTypes, useTarifs, useGroups, useFamilies } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function ContractNew() {
  const navigate = useNavigate();
  const createMutation = useCreateContract();
  const { data: membersData } = useMembers();
  const { data: mtData } = useMembershipTypes();
  const { data: tarifData } = useTarifs();
  const { data: groupsData } = useGroups();
  const { data: familiesData } = useFamilies();

  const members = membersData?.data || [];
  const membershipTypes = mtData?.data || [];
  const tarifs = tarifData?.data || [];
  const groups = groupsData?.data || [];
  const families = familiesData || [];

  const [form, setForm] = useState({
    member_id: '',
    contract_kind: 'MEMBERSHIP',
    membership_type_id: '',
    tarif_id: '',
    family_id: '',
    group_id: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    billing_period: '',
    current_price: '',
    auto_renew: true,
    notes: '',
  });

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

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
    const groupId = type.defaultGroupId || '';

    let endDate = '';
    if (type.contractDurationMonths) {
      const start = new Date(form.start_date);
      start.setMonth(start.getMonth() + type.contractDurationMonths);
      endDate = start.toISOString().slice(0, 10);
    }

    setForm(prev => ({
      ...prev,
      billing_period: billingPeriod,
      current_price: price,
      auto_renew: autoRenew,
      group_id: groupId,
      end_date: endDate,
    }));
  };

  const isFamilyTarif = form.contract_kind === 'MEMBERSHIP' && selectedType && (selectedType as any).isFamilyTarif === 1;

  const handleMembershipTypeChange = (id: string) => {
    set('membership_type_id', id);
    set('family_id', '');
    set('member_id', '');
    const mt = membershipTypes.find(m => m.id === id);
    applyDefaults(mt);
  };

  const handleTarifChange = (id: string) => {
    set('tarif_id', id);
    const t = tarifs.find(tr => tr.id === id);
    applyDefaults(t);
  };

  const handleBillingPeriodChange = (period: string) => {
    set('billing_period', period);
    const pricing = availablePricing.find(p => p.billingPeriod === period);
    if (pricing) {
      set('current_price', pricing.price.toString());
    }
  };

  const selectedFamily = families.find((f: any) => f.id === form.family_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFamilyTarif) {
      if (!form.family_id) { toast.error('Bitte wählen Sie ein Familienprofil'); return; }
    } else {
      if (!form.member_id) { toast.error('Bitte wählen Sie ein Mitglied'); return; }
    }

    try {
      const payload: Record<string, any> = {
        contract_kind: form.contract_kind,
        start_date: form.start_date,
        billing_period: form.billing_period,
        current_price: parseFloat(form.current_price) || 0,
        auto_renew: form.auto_renew,
        notes: form.notes || undefined,
      };
      if (!isFamilyTarif && form.member_id) payload.member_id = form.member_id;
      if (form.contract_kind === 'MEMBERSHIP' && form.membership_type_id) {
        payload.membership_type_id = form.membership_type_id;
      }
      if (form.contract_kind === 'TARIF' && form.tarif_id) {
        payload.tarif_id = form.tarif_id;
      }
      if (form.group_id) payload.group_id = form.group_id;
      if (form.end_date) payload.end_date = form.end_date;
      if (form.family_id) payload.family_id = form.family_id;

      await createMutation.mutateAsync(payload);
      toast.success('Vertrag erstellt');
      navigate('/contracts');
    } catch (e: any) {
      toast.error(e.message || 'Fehler beim Erstellen');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contracts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Neuer Vertrag</h1>
          <p className="text-muted-foreground">Erstellen Sie einen neuen Mitgliedervertrag</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vertragsart & Zuordnung */}
          <Card>
            <CardHeader><CardTitle className="text-base">Vertragsdaten</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* 1. Vertragsart */}
              <div>
                <Label>Vertragsart</Label>
                <Select value={form.contract_kind} onValueChange={(v) => { set('contract_kind', v); set('membership_type_id', ''); set('tarif_id', ''); set('family_id', ''); set('member_id', ''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBERSHIP">Mitgliedschaft</SelectItem>
                    <SelectItem value="TARIF">Tarif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Mitgliedsart / Tarif */}
              {form.contract_kind === 'MEMBERSHIP' && (
                <div>
                  <Label>Mitgliedschaftsart *</Label>
                  <Select value={form.membership_type_id} onValueChange={handleMembershipTypeChange}>
                    <SelectTrigger><SelectValue placeholder="Mitgliedschaftsart wählen..." /></SelectTrigger>
                    <SelectContent>
                      {membershipTypes.map((mt) => (
                        <SelectItem key={mt.id} value={mt.id}>
                          {mt.name}
                          {mt.isFamilyTarif === 1 && ' (Familientarif)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.contract_kind === 'TARIF' && (
                <div>
                  <Label>Tarif *</Label>
                  <Select value={form.tarif_id} onValueChange={handleTarifChange}>
                    <SelectTrigger><SelectValue placeholder="Tarif wählen..." /></SelectTrigger>
                    <SelectContent>
                      {tarifs.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 3a. Familientarif → Familie wählen */}
              {isFamilyTarif && (
                <div className="space-y-3">
                  <div>
                    <Label className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Familienprofil *</Label>
                    <Select value={form.family_id} onValueChange={(v) => set('family_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Familie wählen..." /></SelectTrigger>
                      <SelectContent>
                        {families.map((f: any) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} – VP: {f.contractPartnerFirstName} {f.contractPartnerLastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {families.length === 0 && (
                      <p className="text-xs text-destructive mt-1">Noch keine Familienprofile vorhanden. Bitte zuerst unter Familien anlegen.</p>
                    )}
                  </div>
                  {selectedFamily && (
                    <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                      <p className="text-xs text-muted-foreground font-medium uppercase">Vertragspartner</p>
                      <p className="text-sm font-medium">{selectedFamily.contractPartnerFirstName} {selectedFamily.contractPartnerLastName}</p>
                      {selectedFamily.contractPartnerEmail && <p className="text-xs text-muted-foreground">{selectedFamily.contractPartnerEmail}</p>}
                      <p className="text-xs text-muted-foreground font-medium uppercase mt-2">Familienmitglieder ({selectedFamily.memberCount || '–'})</p>
                      <p className="text-xs text-muted-foreground">Der Vertrag wird für alle Mitglieder der Familie erstellt.</p>
                    </div>
                  )}
                </div>
              )}

              {/* 3b. Kein Familientarif → Mitglied wählen */}
              {!isFamilyTarif && (form.membership_type_id || form.tarif_id || form.contract_kind === 'TARIF') && (
                <div>
                  <Label>Mitglied *</Label>
                  <Select value={form.member_id} onValueChange={(v) => set('member_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Mitglied wählen..." /></SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firstName} {m.lastName} ({m.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 4. Gruppe */}
              <div>
                <Label>Gruppe (optional)</Label>
                <Select value={form.group_id} onValueChange={(v) => set('group_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Keine Gruppe" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Laufzeit & Preis */}
          <Card>
            <CardHeader><CardTitle className="text-base">Laufzeit & Abrechnung</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Startdatum *</Label>
                <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
              </div>

              <div>
                <Label>Enddatum (optional)</Label>
                <Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
              </div>

              <div>
                <Label>Abrechnungszeitraum</Label>
                {availablePricing.length > 0 ? (
                  <Select value={form.billing_period} onValueChange={handleBillingPeriodChange}>
                    <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                    <SelectContent>
                      {availablePricing.map((p) => (
                        <SelectItem key={p.billingPeriod} value={p.billingPeriod}>
                          {p.billingPeriod === 'MONTHLY' ? 'Monatlich' : p.billingPeriod === 'QUARTERLY' ? 'Vierteljährlich' : p.billingPeriod === 'HALF_YEARLY' ? 'Halbjährlich' : 'Jährlich'} – {p.price.toFixed(2)} €
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={form.billing_period} onValueChange={(v) => set('billing_period', v)}>
                    <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monatlich</SelectItem>
                      <SelectItem value="QUARTERLY">Vierteljährlich</SelectItem>
                      <SelectItem value="HALF_YEARLY">Halbjährlich</SelectItem>
                      <SelectItem value="YEARLY">Jährlich</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {selectedType && availablePricing.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Preise aus {selectedType.name} übernommen</p>
                )}
              </div>

              <div>
                <Label>Preis (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.current_price}
                  onChange={(e) => set('current_price', e.target.value)}
                />
                {selectedType && availablePricing.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Automatisch aus Preistabelle – manuell änderbar</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label>Auto-Verlängerung</Label>
                <Switch checked={form.auto_renew} onCheckedChange={(v) => set('auto_renew', v)} />
              </div>

              <div>
                <Label>Notizen (optional)</Label>
                <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate('/contracts')}>Abbrechen</Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Wird erstellt...' : 'Vertrag erstellen'}
          </Button>
        </div>
      </form>
    </div>
  );
}
