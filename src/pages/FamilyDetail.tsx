import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Pencil, Plus, Trash2, Users, FileText, UserCheck, Search, X } from 'lucide-react';
import { useFamily, useUpdateFamily, useDeleteFamily, useAddFamilyMember, useRemoveFamilyMember, useMembers } from '@/hooks/use-api';
import type { FamilyMember } from '@/lib/api';
import { toast } from 'sonner';

export default function FamilyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: family, isLoading } = useFamily(id);
  const updateFamily = useUpdateFamily();
  const deleteFamily = useDeleteFamily();
  const addMember = useAddFamilyMember();
  const removeMember = useRemoveFamilyMember();
  const { data: membersData } = useMembers();
  const allMembers = (membersData as any)?.data || membersData || [];

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '', firstName: '', lastName: '', email: '', phone: '',
    street: '', zip: '', city: '', birthDate: '',
  });
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [vpSearch, setVpSearch] = useState('');
  const [vpLinkedMemberId, setVpLinkedMemberId] = useState<string | null>(null);

  if (isLoading) return <div><PageHeader title="" /><p className="text-muted-foreground">Wird geladen...</p></div>;
  if (!family) return <div><PageHeader title="Nicht gefunden" /><p className="text-muted-foreground">Familienprofil nicht gefunden.</p></div>;

  const startEdit = () => {
    setForm({
      name: family.name,
      firstName: family.contractPartnerFirstName || '',
      lastName: family.contractPartnerLastName || '',
      email: family.contractPartnerEmail || '',
      phone: family.contractPartnerPhone || '',
      street: family.contractPartnerStreet || '',
      zip: family.contractPartnerZip || '',
      city: family.contractPartnerCity || '',
      birthDate: family.contractPartnerBirthDate || '',
    });
    setVpLinkedMemberId(family.contractPartnerMemberId || null);
    setVpSearch('');
    setEditing(true);
  };

  const fillFromMember = (m: any) => {
    setForm(f => ({
      ...f,
      firstName: m.firstName || f.firstName,
      lastName: m.lastName || f.lastName,
      email: m.email || f.email,
      phone: m.phone || f.phone,
      street: m.street || f.street,
      zip: m.zip || f.zip,
      city: m.city || f.city,
      birthDate: m.birthDate || f.birthDate,
    }));
    setVpLinkedMemberId(m.id);
    setVpSearch('');
  };

  const vpFilteredMembers = vpSearch.trim().length >= 1
    ? (Array.isArray(allMembers) ? allMembers : []).filter((m: any) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(vpSearch.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(vpSearch.toLowerCase()))
      ).slice(0, 6)
    : [];

  const handleSave = () => {
    updateFamily.mutate({ id: id!, data: {
      name: form.name,
      contract_partner_first_name: form.firstName,
      contract_partner_last_name: form.lastName,
      contract_partner_email: form.email || null,
      contract_partner_phone: form.phone || null,
      contract_partner_street: form.street || null,
      contract_partner_zip: form.zip || null,
      contract_partner_city: form.city || null,
      contract_partner_birth_date: form.birthDate || null,
      contract_partner_member_id: vpLinkedMemberId || null,
    }}, {
      onSuccess: () => { toast.success('Familienprofil aktualisiert'); setEditing(false); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleDelete = () => {
    if (!confirm(`"${family.name}" wirklich löschen?`)) return;
    deleteFamily.mutate(id!, {
      onSuccess: () => { toast.success('Familienprofil gelöscht'); navigate('/families'); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleAddMember = (userId: string) => {
    addMember.mutate({ familyId: id!, data: { user_id: userId } }, {
      onSuccess: () => { toast.success('Mitglied hinzugefügt'); setMemberSearch(''); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleRemoveMember = (userId: string, name: string) => {
    if (!confirm(`${name} wirklich aus der Familie entfernen?`)) return;
    removeMember.mutate({ familyId: id!, userId }, {
      onSuccess: () => toast.success('Mitglied entfernt'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const existingUserIds = new Set((family.members || []).map((m: FamilyMember) => m.userId));
  const availableMembers = Array.isArray(allMembers) ? allMembers.filter((m: any) => !existingUserIds.has(m.id)) : [];
  const filteredMembers = memberSearch.trim().length >= 1
    ? availableMembers.filter((m: any) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(memberSearch.toLowerCase()))
      ).slice(0, 8)
    : [];

  return (
    <div>
      <PageHeader title={family.name}>
        <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="h-4 w-4 mr-1" />Bearbeiten</Button>
        <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-1" />Löschen</Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vertragspartner */}
        <Card className="bg-popover shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><UserCheck className="h-4 w-4" /> Vertragspartner</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Familienname *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>

                {/* VP from member */}
                <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <Label className="text-xs text-muted-foreground">Daten von Mitglied übernehmen (optional)</Label>
                  {vpLinkedMemberId ? (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{form.firstName} {form.lastName} <span className="text-muted-foreground font-normal">(verknüpft)</span></p>
                      <Button variant="ghost" size="sm" onClick={() => { setVpLinkedMemberId(null); setVpSearch(''); }}>
                        <X className="h-3.5 w-3.5 mr-1" />Lösen
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Mitglied suchen..."
                          value={vpSearch}
                          onChange={e => setVpSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      {vpSearch.trim().length >= 1 && (
                        vpFilteredMembers.length > 0 ? (
                          <div className="space-y-1 max-h-[180px] overflow-y-auto">
                            {vpFilteredMembers.map((m: any) => (
                              <button
                                key={m.id}
                                className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/60 transition-colors text-left"
                                onClick={() => fillFromMember(m)}
                              >
                                <div>
                                  <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                                  <p className="text-xs text-muted-foreground">{m.email || '–'}</p>
                                </div>
                                <UserCheck className="h-4 w-4 text-muted-foreground" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-1">Kein Mitglied gefunden.</p>
                        )
                      )}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Vorname *</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Nachname *</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">E-Mail</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Telefon</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Straße</Label><Input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">PLZ</Label><Input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Stadt</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Geburtsdatum</Label><Input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} /></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button disabled={updateFamily.isPending || !form.name || !form.firstName || !form.lastName} onClick={handleSave}>
                    {updateFamily.isPending ? 'Speichern...' : 'Speichern'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Abbrechen</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div><p className="text-xs text-muted-foreground">Name</p><p className="text-sm font-medium">{family.contractPartnerFirstName} {family.contractPartnerLastName}</p></div>
                <div><p className="text-xs text-muted-foreground">E-Mail</p><p className="text-sm font-medium">{family.contractPartnerEmail || '–'}</p></div>
                <div><p className="text-xs text-muted-foreground">Telefon</p><p className="text-sm font-medium">{family.contractPartnerPhone || '–'}</p></div>
                <div><p className="text-xs text-muted-foreground">Geburtsdatum</p><p className="text-sm font-medium">{family.contractPartnerBirthDate || '–'}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Adresse</p><p className="text-sm font-medium">{[family.contractPartnerStreet, `${family.contractPartnerZip || ''} ${family.contractPartnerCity || ''}`.trim()].filter(Boolean).join(', ') || '–'}</p></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verträge */}
        <Card className="bg-popover shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Verträge</CardTitle>
          </CardHeader>
          <CardContent>
            {family.contracts && family.contracts.length > 0 ? (
              <div className="space-y-3">
                {family.contracts.map((ct) => (
                  <div key={ct.id} className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/contracts/${ct.id}`)}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{ct.contractNumber}</span>
                      <Badge className={ct.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>{ct.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{ct.currentPrice?.toFixed(2)} € / {ct.billingPeriod === 'MONTHLY' ? 'Monat' : ct.billingPeriod === 'YEARLY' ? 'Jahr' : ct.billingPeriod}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Kein Vertrag vorhanden.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Familienmitglieder */}
      <Card className="bg-popover shadow-sm mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Familienmitglieder ({family.members?.length || 0})</CardTitle>
          <Button size="sm" variant={addMemberOpen ? 'outline' : 'default'} onClick={() => { setAddMemberOpen(!addMemberOpen); setMemberSearch(''); }}>
            {addMemberOpen ? <><X className="h-4 w-4 mr-1" />Schließen</> : <><Plus className="h-4 w-4 mr-1" />Mitglied hinzufügen</>}
          </Button>
        </CardHeader>
        <CardContent>
          {family.members && family.members.length > 0 ? (
            <div className="space-y-3">
              {family.members.map((m: FamilyMember) => (
                <div key={m.userId} className="border rounded-lg p-3 flex items-center justify-between">
                  <div className="cursor-pointer" onClick={() => navigate(`/members/${m.userId}`)}>
                    <p className="font-medium text-sm">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-muted-foreground">{m.email || '–'}</p>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => handleRemoveMember(m.userId, `${m.firstName} ${m.lastName}`)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Keine Mitglieder zugewiesen.</p>
          )}

          {addMemberOpen && (
            <div className="border rounded-lg p-4 mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name oder E-Mail eingeben..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              {memberSearch.trim().length >= 1 && (
                filteredMembers.length > 0 ? (
                  <div className="space-y-1 max-h-[240px] overflow-y-auto">
                    {filteredMembers.map((m: any) => (
                      <button
                        key={m.id}
                        className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-muted/60 transition-colors text-left"
                        disabled={addMember.isPending}
                        onClick={() => handleAddMember(m.id)}
                      >
                        <div>
                          <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                          <p className="text-xs text-muted-foreground">{m.email || '–'}</p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Kein Mitglied gefunden.</p>
                )
              )}
              {!memberSearch.trim() && (
                <p className="text-xs text-muted-foreground text-center">Tippen Sie einen Namen ein, um Mitglieder zu suchen.</p>
              )}
            </div>
          )}

          {(family.members?.length || 0) < 3 && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-4">
              <p className="text-sm text-warning font-medium">⚠ Mindestens 3 Mitglieder erforderlich für einen Familientarif.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
