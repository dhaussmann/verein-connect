import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pencil, MessageSquare, QrCode, MoreHorizontal, UserMinus, Trash2,
  Link as LinkIcon, Calendar as CalIcon, FileText, X, Plus, Building2,
} from 'lucide-react';
import { useMember, useUpdateMember, useDeleteMember, useContracts, useGroups, useAddGroupMember, useRemoveGroupMember, useRoles, useProfileFields, useBankAccount, useUpsertBankAccount, useDeleteBankAccount } from '@/hooks/use-api';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const statusClass = (s: string) =>
  s === 'Aktiv' ? 'bg-success/10 text-success' : s === 'Inaktiv' ? 'bg-muted text-muted-foreground' : 'bg-warning/10 text-warning';


export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: member, isLoading, error } = useMember(id);
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const [editing, setEditing] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const { data: contractsData } = useContracts(id ? { member_id: id } : undefined);
  const { data: groupsData } = useGroups();
  const addGroupMember = useAddGroupMember();
  const removeGroupMember = useRemoveGroupMember();
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const { data: rolesData } = useRoles();
  const { data: profileFieldsData } = useProfileFields();
  const { data: bankAccount, isLoading: bankLoading } = useBankAccount(id);
  const upsertBank = useUpsertBankAccount();
  const deleteBank = useDeleteBankAccount();
  const [bankEditing, setBankEditing] = useState(false);
  const [bankForm, setBankForm] = useState({ accountHolder: '', iban: '', bic: '', bankName: '', sepaMandate: false, sepaMandateDate: '', sepaMandateRef: '' });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="" />
        <p className="text-muted-foreground">Mitglied wird geladen...</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div>
        <PageHeader title="Mitglied nicht gefunden" />
        <p className="text-muted-foreground">Das Mitglied mit ID "{id}" wurde nicht gefunden.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/members')}>Zurück zur Liste</Button>
      </div>
    );
  }

  const allRoles = rolesData || [];
  const customFieldDefs = (profileFieldsData || []) as any[];

  const roleAssignments = member.roles.map((r: string) => ({ role: r, startDate: member.joinDate }));

  const profileFields = [
    { label: 'Vorname', value: member.firstName },
    { label: 'Nachname', value: member.lastName },
    { label: 'Geburtsdatum', value: member.birthDate },
    { label: 'Geschlecht', value: member.gender },
    { label: 'E-Mail', value: member.email },
    { label: 'Telefon', value: member.phone || '–' },
    { label: 'Mobil', value: member.mobile || '–' },
    { label: 'Adresse', value: `${member.street}, ${member.zip} ${member.city}` },
    ...customFieldDefs
      .filter((cf: any) => member.customFields[cf.name])
      .map((cf: any) => ({ label: cf.label, value: member.customFields[cf.name] === 'true' ? 'Ja' : member.customFields[cf.name] === 'false' ? 'Nein' : member.customFields[cf.name] })),
  ];

  return (
    <div>
      <PageHeader title="" />

      {/* Hero card */}
      <Card className="bg-popover shadow-sm mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-2xl font-semibold">{member.avatarInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold">{member.firstName} {member.lastName}</h1>
              <p className="text-sm text-muted-foreground font-mono">{member.memberNumber}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(member.status)}`}>{member.status}</span>
                {member.roles.map((r) => <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
                <Pencil className="h-4 w-4 mr-1" />{editing ? 'Abbrechen' : 'Bearbeiten'}
              </Button>
              <Button variant="outline" size="sm"><MessageSquare className="h-4 w-4 mr-1" />Nachricht</Button>
              <Button variant="outline" size="sm"><QrCode className="h-4 w-4 mr-1" />QR-Karte</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    if (confirm('Mitglied deaktivieren?')) {
                      updateMember.mutate({ id: id!, data: { status: 'Inaktiv' } }, {
                        onSuccess: () => toast.success('Mitglied deaktiviert'),
                        onError: (e: any) => toast.error(e.message),
                      });
                    }
                  }}><UserMinus className="h-4 w-4 mr-2" />Deaktivieren</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => {
                    if (confirm('Mitglied endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
                      deleteMember.mutate(id!, {
                        onSuccess: () => { toast.success('Mitglied gelöscht'); navigate('/members'); },
                        onError: (e: any) => toast.error(e.message),
                      });
                    }
                  }}><Trash2 className="h-4 w-4 mr-2" />Löschen</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profil">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="rollen">Rollen & Gruppen</TabsTrigger>
          <TabsTrigger value="kurse">Kurse & Termine</TabsTrigger>
          <TabsTrigger value="anwesenheit">Anwesenheit</TabsTrigger>
          <TabsTrigger value="vertraege">Verträge</TabsTrigger>
          <TabsTrigger value="finanzen">Finanzen</TabsTrigger>
          <TabsTrigger value="kontoverbindung">Kontoverbindung</TabsTrigger>
          <TabsTrigger value="familie">Familie</TabsTrigger>
        </TabsList>

        {/* Tab: Profil */}
        <TabsContent value="profil">
          <Card className="bg-popover shadow-sm">
            <CardContent className="p-6">
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profileFields.map((f) => (
                    <div key={f.label} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{f.label}</Label>
                      <Input defaultValue={f.value} />
                    </div>
                  ))}
                  <div className="md:col-span-2 flex gap-2 pt-2">
                    <Button onClick={() => setEditing(false)}>Speichern</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>Abbrechen</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profileFields.map((f) => (
                    <div key={f.label}>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-sm font-medium">{f.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Rollen */}
        <TabsContent value="rollen">
          <Card className="bg-popover shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Zugewiesene Rollen</CardTitle>
              <Button size="sm" onClick={() => setRoleModalOpen(true)}>Rolle zuweisen</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Seit</TableHead>
                    <TableHead>Ende</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleAssignments.map((ra) => (
                    <TableRow key={ra.role}>
                      <TableCell><Badge variant="secondary">{ra.role}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{ra.startDate}</TableCell>
                      <TableCell className="text-muted-foreground">–</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Gruppen / Mannschaften</h3>
                  <Button size="sm" variant="outline" onClick={() => setGroupModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />Gruppe zuweisen
                  </Button>
                </div>
                {member.groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Gruppen zugewiesen.</p>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {member.groups.map((g) => (
                      <Badge key={g.id} variant={g.category === 'team' ? 'default' : 'secondary'} className="flex items-center gap-1 pr-1">
                        {g.name}
                        {g.category === 'team' && <span className="text-[10px] opacity-70 ml-1">Team</span>}
                        <button
                          className="ml-1 rounded-full hover:bg-black/20 p-0.5"
                          onClick={() => {
                            if (confirm(`'${g.name}' entfernen?`)) {
                              removeGroupMember.mutate({ groupId: g.id, userId: id! }, {
                                onSuccess: () => toast.success(`Aus '${g.name}' entfernt`),
                                onError: (e: any) => toast.error(e.message),
                              });
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Kurse */}
        <TabsContent value="kurse">
          <Card className="bg-popover shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground">Kursanmeldungen werden hier angezeigt, sobald das Mitglied in Kurse eingeschrieben ist.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Anwesenheit */}
        <TabsContent value="anwesenheit">
          <Card className="bg-popover shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground">Anwesenheitsdaten werden hier angezeigt, sobald Einträge vorhanden sind.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Verträge */}
        <TabsContent value="vertraege">
          <Card className="bg-popover shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Verträge</CardTitle>
              <Button size="sm" onClick={() => navigate('/contracts/new')}>
                <FileText className="h-4 w-4 mr-1" />Neuer Vertrag
              </Button>
            </CardHeader>
            <CardContent>
              {(contractsData?.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Keine Verträge vorhanden.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vertragsnr.</TableHead>
                      <TableHead>Art</TableHead>
                      <TableHead>Typ / Tarif</TableHead>
                      <TableHead>Startdatum</TableHead>
                      <TableHead>Enddatum</TableHead>
                      <TableHead className="text-right">Preis</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contractsData!.data.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/contracts/${c.id}`)}>
                        <TableCell className="font-mono text-xs">{c.contractNumber}</TableCell>
                        <TableCell>{c.contractKind === 'MEMBERSHIP' ? 'Mitgliedschaft' : 'Tarif'}</TableCell>
                        <TableCell>{c.typeName || '–'}</TableCell>
                        <TableCell className="text-muted-foreground">{c.startDate ? new Date(c.startDate).toLocaleDateString('de-DE') : '–'}</TableCell>
                        <TableCell className="text-muted-foreground">{c.endDate ? new Date(c.endDate).toLocaleDateString('de-DE') : '–'}</TableCell>
                        <TableCell className="text-right font-medium">{c.currentPrice != null ? `${c.currentPrice.toFixed(2)} €` : '–'}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === 'ACTIVE' ? 'default' : c.status === 'CANCELLED' ? 'destructive' : 'secondary'}>
                            {c.status === 'ACTIVE' ? 'Aktiv' : c.status === 'CANCELLED' ? 'Gekündigt' : c.status === 'PAUSED' ? 'Pausiert' : c.status === 'EXPIRED' ? 'Abgelaufen' : c.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Finanzen */}
        <TabsContent value="finanzen">
          <Card className="bg-popover shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground">Rechnungen werden hier angezeigt, sobald Rechnungen für dieses Mitglied vorhanden sind.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Kontoverbindung */}
        <TabsContent value="kontoverbindung">
          <Card className="bg-popover shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Kontoverbindung</CardTitle>
              {bankAccount && !bankEditing && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    setBankForm({
                      accountHolder: bankAccount.accountHolder || '',
                      iban: bankAccount.iban || '',
                      bic: bankAccount.bic || '',
                      bankName: bankAccount.bankName || '',
                      sepaMandate: !!bankAccount.sepaMandate,
                      sepaMandateDate: bankAccount.sepaMandateDate || '',
                      sepaMandateRef: bankAccount.sepaMandateRef || '',
                    });
                    setBankEditing(true);
                  }}><Pencil className="h-4 w-4 mr-1" />Bearbeiten</Button>
                  <Button size="sm" variant="destructive" onClick={() => {
                    if (confirm('Kontoverbindung wirklich löschen?')) {
                      deleteBank.mutate(id!, {
                        onSuccess: () => toast.success('Kontoverbindung gelöscht'),
                        onError: (e: any) => toast.error(e.message),
                      });
                    }
                  }}><Trash2 className="h-4 w-4 mr-1" />Löschen</Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {bankLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Wird geladen...</p>
              ) : !bankAccount && !bankEditing ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">Keine Kontoverbindung hinterlegt.</p>
                  <Button variant="outline" onClick={() => {
                    setBankForm({ accountHolder: `${member.firstName} ${member.lastName}`, iban: '', bic: '', bankName: '', sepaMandate: false, sepaMandateDate: '', sepaMandateRef: '' });
                    setBankEditing(true);
                  }}><Plus className="h-4 w-4 mr-1" />Kontoverbindung anlegen</Button>
                </div>
              ) : bankEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Kontoinhaber *</Label>
                    <Input value={bankForm.accountHolder} onChange={e => setBankForm(f => ({ ...f, accountHolder: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">IBAN *</Label>
                    <Input value={bankForm.iban} onChange={e => setBankForm(f => ({ ...f, iban: e.target.value.toUpperCase() }))} placeholder="DE89 3704 0044 0532 0130 00" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">BIC</Label>
                    <Input value={bankForm.bic} onChange={e => setBankForm(f => ({ ...f, bic: e.target.value.toUpperCase() }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Bank</Label>
                    <Input value={bankForm.bankName} onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <p className="text-sm font-medium mb-3">SEPA-Lastschriftmandat</p>
                    <div className="flex items-center gap-2 mb-3">
                      <Checkbox checked={bankForm.sepaMandate} onCheckedChange={v => setBankForm(f => ({ ...f, sepaMandate: !!v }))} id="sepa-check" />
                      <label htmlFor="sepa-check" className="text-sm">SEPA-Lastschriftmandat erteilt</label>
                    </div>
                    {bankForm.sepaMandate && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Mandatsdatum</Label>
                          <Input type="date" value={bankForm.sepaMandateDate} onChange={e => setBankForm(f => ({ ...f, sepaMandateDate: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Mandatsreferenz</Label>
                          <Input value={bankForm.sepaMandateRef} onChange={e => setBankForm(f => ({ ...f, sepaMandateRef: e.target.value }))} placeholder="z.B. SEPA-001-2026" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2 flex gap-2 pt-2">
                    <Button disabled={upsertBank.isPending || !bankForm.accountHolder || !bankForm.iban} onClick={() => {
                      upsertBank.mutate({ memberId: id!, data: {
                        account_holder: bankForm.accountHolder,
                        iban: bankForm.iban,
                        bic: bankForm.bic || null,
                        bank_name: bankForm.bankName || null,
                        sepa_mandate: bankForm.sepaMandate,
                        sepa_mandate_date: bankForm.sepaMandateDate || null,
                        sepa_mandate_ref: bankForm.sepaMandateRef || null,
                      }}, {
                        onSuccess: () => { toast.success('Kontoverbindung gespeichert'); setBankEditing(false); },
                        onError: (e: any) => toast.error(e.message),
                      });
                    }}>{upsertBank.isPending ? 'Speichern...' : 'Speichern'}</Button>
                    <Button variant="outline" onClick={() => setBankEditing(false)}>Abbrechen</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><p className="text-xs text-muted-foreground">Kontoinhaber</p><p className="text-sm font-medium">{bankAccount!.accountHolder}</p></div>
                  <div><p className="text-xs text-muted-foreground">IBAN</p><p className="text-sm font-medium font-mono">{bankAccount!.iban}</p></div>
                  <div><p className="text-xs text-muted-foreground">BIC</p><p className="text-sm font-medium">{bankAccount!.bic || '–'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Bank</p><p className="text-sm font-medium">{bankAccount!.bankName || '–'}</p></div>
                  <div className="md:col-span-2 border-t pt-3 mt-1">
                    <p className="text-xs text-muted-foreground mb-1">SEPA-Lastschriftmandat</p>
                    {bankAccount!.sepaMandate ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30">Erteilt</Badge>
                        {bankAccount!.sepaMandateDate && <span className="text-sm text-muted-foreground">Datum: {bankAccount!.sepaMandateDate}</span>}
                        {bankAccount!.sepaMandateRef && <span className="text-sm text-muted-foreground">Ref: {bankAccount!.sepaMandateRef}</span>}
                      </div>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">Nicht erteilt</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Familie */}
        <TabsContent value="familie">
          <Card className="bg-popover shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground text-sm">Kein Familienprofil vorhanden.</p>
              <Button variant="outline" className="mt-4"><LinkIcon className="h-4 w-4 mr-1" />Familienmitglied verknüpfen</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Group assign modal */}
      <Dialog open={groupModalOpen} onOpenChange={setGroupModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Gruppe zuweisen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Gruppe</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger><SelectValue placeholder="Gruppe wählen..." /></SelectTrigger>
                <SelectContent>
                  {(groupsData?.data || [])
                    .filter((g) => !member.groups.some((mg) => mg.id === g.id))
                    .map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} {g.category === 'team' ? '(Team)' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setGroupModalOpen(false); setSelectedGroupId(''); }}>Abbrechen</Button>
            <Button
              disabled={!selectedGroupId || addGroupMember.isPending}
              onClick={() => {
                addGroupMember.mutate({ groupId: selectedGroupId, userId: id! }, {
                  onSuccess: () => {
                    toast.success('Gruppe zugewiesen');
                    setGroupModalOpen(false);
                    setSelectedGroupId('');
                  },
                  onError: (e: any) => toast.error(e.message),
                });
              }}
            >
              {addGroupMember.isPending ? 'Wird zugewiesen...' : 'Zuweisen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role assign modal */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Rolle zuweisen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rolle</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue placeholder="Rolle wählen" /></SelectTrigger>
                <SelectContent>
                  {allRoles.map((r) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Startdatum</Label>
              <Input type="text" placeholder="TT.MM.JJJJ" defaultValue="17.03.2026" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleModalOpen(false)}>Abbrechen</Button>
            <Button onClick={() => setRoleModalOpen(false)}>Zuweisen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
