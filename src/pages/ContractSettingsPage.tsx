import { useState, useEffect } from 'react';
import { Save, Pencil } from 'lucide-react';
import {
  useContractSettings, useUpdateContractSettings,
  useMembershipTypes, useCreateMembershipType, useUpdateMembershipType, useDeleteMembershipType,
  useTarifs, useCreateTarif, useUpdateTarif, useDeleteTarif,
  useDiscountGroups, useCreateDiscountGroup, useDeleteDiscountGroup,
  useGroups, useCreateGroup, useDeleteGroup,
} from '@/hooks/use-api';
import type { MembershipType, Tarif } from '@/lib/api';
import MembershipTypeDialog, { toApiPayload } from '@/components/contracts/MembershipTypeDialog';
import TarifDialog, { toTarifApiPayload } from '@/components/contracts/TarifDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: '1 Mon.', QUARTERLY: '3 Mon.', HALF_YEARLY: '6 Mon.', YEARLY: '12 Mon.',
};

export default function ContractSettingsPage() {
  const { data: settings, isLoading } = useContractSettings();
  const updateSettings = useUpdateContractSettings();

  const { data: mtData } = useMembershipTypes();
  const createMT = useCreateMembershipType();
  const updateMT = useUpdateMembershipType();
  const deleteMT = useDeleteMembershipType();

  const { data: tarifData } = useTarifs();
  const createTarifMut = useCreateTarif();
  const updateTarifMut = useUpdateTarif();
  const deleteTarifMut = useDeleteTarif();

  const { data: dgData } = useDiscountGroups();
  const createDG = useCreateDiscountGroup();
  const deleteDG = useDeleteDiscountGroup();

  const { data: groupData } = useGroups();
  const createGroupMut = useCreateGroup();
  const deleteGroupMut = useDeleteGroup();

  const membershipTypes = mtData?.data || [];
  const tarifs = tarifData?.data || [];
  const discountGroups = dgData?.data || [];
  const groups = groupData?.data || [];

  // Settings form
  const [form, setForm] = useState({
    invoice_publish_mode: 'DRAFT',
    days_in_advance: 14,
    price_update_trigger: 'ON_RENEWAL',
    sepa_required: false,
    member_cancellation_allowed: true,
    self_registration_enabled: false,
    self_registration_access: 'LINK_AND_FORM',
    welcome_page_text: '',
    confirmation_page_text: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        invoice_publish_mode: settings.invoicePublishMode || 'DRAFT',
        days_in_advance: settings.daysInAdvance || 14,
        price_update_trigger: settings.priceUpdateTrigger || 'ON_RENEWAL',
        sepa_required: !!settings.sepaRequired,
        member_cancellation_allowed: !!settings.memberCancellationAllowed,
        self_registration_enabled: !!settings.selfRegistrationEnabled,
        self_registration_access: settings.selfRegistrationAccess || 'LINK_AND_FORM',
        welcome_page_text: settings.welcomePageText || '',
        confirmation_page_text: settings.confirmationPageText || '',
      });
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync(form as any);
      toast.success('Einstellungen gespeichert');
    } catch (e: any) { toast.error(e.message); }
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
        await updateMT.mutateAsync({ id, data: payload });
        toast.success('Mitgliedsart aktualisiert');
      } else {
        await createMT.mutateAsync(payload);
        toast.success('Mitgliedsart erstellt');
      }
      setMtDialogOpen(false);
    } catch (e: any) { toast.error(e.message); }
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
        await updateTarifMut.mutateAsync({ id, data: payload });
        toast.success('Tarif aktualisiert');
      } else {
        await createTarifMut.mutateAsync(payload);
        toast.success('Tarif erstellt');
      }
      setTarifDialogOpen(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setTarifSaving(false); }
  };

  // Simple dialogs for discount groups and groups
  const [dgDialogOpen, setDgDialogOpen] = useState(false);
  const [dgName, setDgName] = useState('');
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vertragseinstellungen</h1>
        <p className="text-muted-foreground">Konfigurieren Sie Mitgliedschaftsarten, Tarife, Gruppen und Abrechnungsoptionen</p>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="settings">Allgemein</TabsTrigger>
          <TabsTrigger value="membership-types">Mitgliedschaftsarten</TabsTrigger>
          <TabsTrigger value="tarifs">Tarife</TabsTrigger>
          <TabsTrigger value="discount-groups">Rabattgruppen</TabsTrigger>
          <TabsTrigger value="groups">Gruppen</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Laden...</div>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Abrechnungseinstellungen</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Rechnungserstellung</Label>
                      <Select value={form.invoice_publish_mode} onValueChange={(v) => setForm(f => ({ ...f, invoice_publish_mode: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Als Entwurf</SelectItem>
                          <SelectItem value="AUTO_PUBLISH">Automatisch versenden</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Vorlaufzeit (Tage)</Label>
                      <Input type="number" value={form.days_in_advance} onChange={(e) => setForm(f => ({ ...f, days_in_advance: parseInt(e.target.value) || 14 }))} />
                    </div>
                    <div>
                      <Label>Preisanpassung</Label>
                      <Select value={form.price_update_trigger} onValueChange={(v) => setForm(f => ({ ...f, price_update_trigger: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ON_RENEWAL">Bei Verlängerung</SelectItem>
                          <SelectItem value="ON_INVOICE">Bei Rechnungserstellung</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>SEPA-Mandat erforderlich</Label>
                      <Switch checked={form.sepa_required} onCheckedChange={(v) => setForm(f => ({ ...f, sepa_required: v }))} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Mitglieder können selbst kündigen</Label>
                      <Switch checked={form.member_cancellation_allowed} onCheckedChange={(v) => setForm(f => ({ ...f, member_cancellation_allowed: v }))} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Selbstregistrierung</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Selbstregistrierung aktivieren</Label>
                    <Switch checked={form.self_registration_enabled} onCheckedChange={(v) => setForm(f => ({ ...f, self_registration_enabled: v }))} />
                  </div>
                  {form.self_registration_enabled && (
                    <>
                      <div>
                        <Label>Zugangsart</Label>
                        <Select value={form.self_registration_access} onValueChange={(v) => setForm(f => ({ ...f, self_registration_access: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LINK_AND_FORM">Link und Formular</SelectItem>
                            <SelectItem value="LINK_ONLY">Nur Link</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Willkommenstext</Label>
                        <Textarea value={form.welcome_page_text} onChange={(e) => setForm(f => ({ ...f, welcome_page_text: e.target.value }))} rows={3} />
                      </div>
                      <div>
                        <Label>Bestätigungstext</Label>
                        <Textarea value={form.confirmation_page_text} onChange={(e) => setForm(f => ({ ...f, confirmation_page_text: e.target.value }))} rows={3} />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateSettings.isPending ? 'Speichern...' : 'Einstellungen speichern'}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Membership Types ─── */}
        <TabsContent value="membership-types" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Mitgliedschaftsarten</CardTitle>
              <Button size="sm" onClick={openMtCreate}>
                <Plus className="h-4 w-4 mr-1" /> Neu
              </Button>
            </CardHeader>
            <CardContent>
              {membershipTypes.length === 0 ? (
                <p className="text-muted-foreground text-sm">Keine Mitgliedschaftsarten vorhanden</p>
              ) : (
                <div className="space-y-2">
                  {membershipTypes.map((mt) => (
                    <div key={mt.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{mt.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant={mt.isActive ? 'default' : 'secondary'}>{mt.isActive ? 'Aktiv' : 'Inaktiv'}</Badge>
                          {mt.contractType && (
                            <Badge variant="outline">{mt.contractType === 'AUTO_RENEW' ? 'Auto-Verlängerung' : mt.contractType === 'ONCE' ? 'Einmalig' : mt.contractType === 'FIXED' ? 'Fest' : 'Fest + Verlängerung'}</Badge>
                          )}
                          {mt.pricing?.length > 0 && mt.pricing.map((p, i) => (
                            <Badge key={i} variant="outline">{p.price.toFixed(2)} € / {PERIOD_LABELS[p.billingPeriod] || p.billingPeriod}</Badge>
                          ))}
                          {mt.groupName && <Badge variant="secondary">{mt.groupName}</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMtEdit(mt)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                          if (confirm('Mitgliedschaftsart löschen?')) deleteMT.mutate(mt.id, { onSuccess: () => toast.success('Gelöscht'), onError: (e: any) => toast.error(e.message) });
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tarifs ─── */}
        <TabsContent value="tarifs" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Tarife</CardTitle>
              <Button size="sm" onClick={openTarifCreate}>
                <Plus className="h-4 w-4 mr-1" /> Neu
              </Button>
            </CardHeader>
            <CardContent>
              {tarifs.length === 0 ? (
                <p className="text-muted-foreground text-sm">Keine Tarife vorhanden</p>
              ) : (
                <div className="space-y-2">
                  {tarifs.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{t.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant={t.isActive ? 'default' : 'secondary'}>{t.isActive ? 'Aktiv' : 'Inaktiv'}</Badge>
                          {t.contractType && (
                            <Badge variant="outline">{t.contractType === 'AUTO_RENEW' ? 'Auto-Verlängerung' : t.contractType === 'ONCE' ? 'Einmalig' : t.contractType === 'FIXED' ? 'Fest' : 'Fest + Verlängerung'}</Badge>
                          )}
                          {t.pricing?.length > 0 && t.pricing.map((p, i) => (
                            <Badge key={i} variant="outline">{p.price.toFixed(2)} € / {PERIOD_LABELS[p.billingPeriod] || p.billingPeriod}</Badge>
                          ))}
                          {t.groupName && <Badge variant="secondary">{t.groupName}</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTarifEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                          if (confirm('Tarif löschen?')) deleteTarifMut.mutate(t.id, { onSuccess: () => toast.success('Gelöscht'), onError: (e: any) => toast.error(e.message) });
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discount Groups */}
        <TabsContent value="discount-groups" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Rabattgruppen</CardTitle>
              <Button size="sm" onClick={() => { setDgName(''); setDgDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Neu
              </Button>
            </CardHeader>
            <CardContent>
              {discountGroups.length === 0 ? (
                <p className="text-muted-foreground text-sm">Keine Rabattgruppen vorhanden</p>
              ) : (
                <div className="space-y-2">
                  {discountGroups.map((dg) => (
                    <div key={dg.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{dg.name}</p>
                        {dg.groupName && <p className="text-xs text-muted-foreground">Gruppe: {dg.groupName}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                        if (confirm('Rabattgruppe löschen?')) deleteDG.mutate(dg.id, { onSuccess: () => toast.success('Gelöscht'), onError: (e: any) => toast.error(e.message) });
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Groups */}
        <TabsContent value="groups" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Gruppen</CardTitle>
              <Button size="sm" onClick={() => { setGroupName(''); setGroupDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Neu
              </Button>
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <p className="text-muted-foreground text-sm">Keine Gruppen vorhanden</p>
              ) : (
                <div className="space-y-2">
                  {groups.map((g) => (
                    <div key={g.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{g.name}</p>
                        {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                        if (confirm('Gruppe löschen?')) deleteGroupMut.mutate(g.id, { onSuccess: () => toast.success('Gelöscht'), onError: (e: any) => toast.error(e.message) });
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Membership Type Dialog (full form) */}
      <MembershipTypeDialog
        open={mtDialogOpen}
        onOpenChange={setMtDialogOpen}
        editItem={mtEditItem}
        groups={groups}
        onSave={handleMtSave}
        saving={mtSaving}
      />

      {/* Tarif Dialog (full form) */}
      <TarifDialog
        open={tarifDialogOpen}
        onOpenChange={setTarifDialogOpen}
        editItem={tarifEditItem}
        groups={groups}
        membershipTypes={membershipTypes}
        onSave={handleTarifSave}
        saving={tarifSaving}
      />

      {/* Create Discount Group Dialog */}
      <Dialog open={dgDialogOpen} onOpenChange={setDgDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neue Rabattgruppe</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Name</Label>
            <Input value={dgName} onChange={(e) => setDgName(e.target.value)} placeholder="z.B. Familie" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDgDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={async () => {
              try {
                await createDG.mutateAsync({ name: dgName });
                toast.success('Rabattgruppe erstellt');
                setDgDialogOpen(false);
              } catch (e: any) { toast.error(e.message); }
            }} disabled={!dgName || createDG.isPending}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neue Gruppe</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Name</Label>
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="z.B. Abteilung Fußball" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={async () => {
              try {
                await createGroupMut.mutateAsync({ name: groupName });
                toast.success('Gruppe erstellt');
                setGroupDialogOpen(false);
              } catch (e: any) { toast.error(e.message); }
            }} disabled={!groupName || createGroupMut.isPending}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
