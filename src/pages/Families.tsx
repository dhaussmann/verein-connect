import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Users, FileText, Search, UserCheck, X } from 'lucide-react';
import { useFamilies, useCreateFamily, useMembers } from '@/hooks/use-api';
import type { FamilyProfile } from '@/lib/api';
import { toast } from 'sonner';

export default function Families() {
  const navigate = useNavigate();
  const { data: families, isLoading } = useFamilies();
  const createFamily = useCreateFamily();
  const { data: membersData } = useMembers();
  const allMembers = (membersData as any)?.data || membersData || [];
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', firstName: '', lastName: '', email: '', phone: '',
    street: '', zip: '', city: '', birthDate: '',
  });
  const [vpSearch, setVpSearch] = useState('');
  const [vpLinkedMemberId, setVpLinkedMemberId] = useState<string | null>(null);

  const vpFilteredMembers = vpSearch.trim().length >= 1
    ? (Array.isArray(allMembers) ? allMembers : []).filter((m: any) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(vpSearch.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(vpSearch.toLowerCase()))
      ).slice(0, 6)
    : [];

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

  const filtered = (families || []).filter((f: FamilyProfile) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    `${f.contractPartnerFirstName} ${f.contractPartnerLastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!form.name || !form.firstName || !form.lastName) return;
    createFamily.mutate({
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
    }, {
      onSuccess: (res) => {
        toast.success('Familienprofil erstellt');
        setCreateOpen(false);
        setForm({ name: '', firstName: '', lastName: '', email: '', phone: '', street: '', zip: '', city: '', birthDate: '' });
        setVpLinkedMemberId(null); setVpSearch('');
        navigate(`/families/${res.id}`);
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div>
      <PageHeader title="Familienprofile">
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />Neues Familienprofil</Button>
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Wird geladen...</p>
      ) : filtered.length === 0 ? (
        <Card className="bg-popover"><CardContent className="p-8 text-center"><p className="text-muted-foreground text-sm">Keine Familienprofile vorhanden.</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f: FamilyProfile) => (
            <Card key={f.id} className="bg-popover shadow-sm cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/families/${f.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-base">{f.name}</h3>
                    <p className="text-sm text-muted-foreground">VP: {f.contractPartnerFirstName} {f.contractPartnerLastName}</p>
                  </div>
                  {f.hasActiveContract && (
                    <Badge className="bg-success/10 text-success"><FileText className="h-3 w-3 mr-1" />{f.activeContractNumber}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{f.memberCount} Mitglieder</span>
                  {f.contractPartnerEmail && <span className="truncate">{f.contractPartnerEmail}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Neues Familienprofil</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Familienname *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Familie Müller" />
            </div>
            <p className="text-sm font-semibold pt-2">Vertragspartner</p>
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
                    <Input placeholder="Mitglied suchen..." value={vpSearch} onChange={e => setVpSearch(e.target.value)} className="pl-9" />
                  </div>
                  {vpSearch.trim().length >= 1 && (
                    vpFilteredMembers.length > 0 ? (
                      <div className="space-y-1 max-h-[180px] overflow-y-auto">
                        {vpFilteredMembers.map((m: any) => (
                          <button key={m.id} className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/60 transition-colors text-left" onClick={() => fillFromMember(m)}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
            <Button disabled={createFamily.isPending || !form.name || !form.firstName || !form.lastName} onClick={handleCreate}>
              {createFamily.isPending ? 'Erstellen...' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
