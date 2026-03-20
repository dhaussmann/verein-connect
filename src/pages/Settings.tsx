import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Upload, Copy, GripVertical, Search, Shield, Check, X, Globe, Link2, FileDown, UserPlus, Users, Lock, AlertCircle } from 'lucide-react';
import { useMembers, useCreateMember, useRoles, useAssignRole, useRemoveRole, useProfileFields, useAuditLog, useMembershipLevels, useCreateMembershipLevel, useUpdateMembershipLevel, useDeleteMembershipLevel, useUpdateProfileField, useDeleteProfileField, useCreateProfileField, useOrganizationSettings, useUpdateOrganization, useUploadLogo } from '@/hooks/use-api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Role, MembershipLevel } from '@/lib/api';

const permissionCategories = ['Mitglieder', 'Kurse', 'Termine', 'Finanzen', 'Kommunikation', 'Shop', 'Dateien', 'Einstellungen'];
const permissionActions = ['Lesen', 'Erstellen', 'Bearbeiten', 'Löschen'];
const retentionPolicies = [
  { dataType: 'Kontaktdaten', days: 90, description: 'Nach Austritt' },
  { dataType: 'Finanzdaten', days: 3650, description: '10 Jahre gesetzlich' },
  { dataType: 'Gesundheitsdaten', days: 365, description: 'Nach Austritt' },
  { dataType: 'Kommunikation', days: 180, description: 'Nach letzter Aktivität' },
  { dataType: 'Anwesenheitsdaten', days: 730, description: '2 Jahre' },
  { dataType: 'Fotos/Medien', days: 365, description: 'Nach Austritt' },
];

export default function Settings() {
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [fieldEditorOpen, setFieldEditorOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<MembershipLevel | null>(null);
  const [levelForm, setLevelForm] = useState({ name: '', description: '', color: '#3b82f6', isDefault: false });
  const [deleteLevelConfirm, setDeleteLevelConfirm] = useState<MembershipLevel | null>(null);
  const [deleteFieldConfirm, setDeleteFieldConfirm] = useState<{ id: string; label: string } | null>(null);
  const [fieldForm, setFieldForm] = useState({ name: '', label: '', type: 'text', required: false, searchable: true, visibleRegistration: false, gdprDays: 0 });
  const [orgName, setOrgName] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');

  // API hooks
  const { data: membersData, isLoading: membersLoading } = useMembers({ per_page: '200' });
  const { data: apiRoles } = useRoles();
  const { data: profileFieldsData } = useProfileFields();
  const { data: auditLogData } = useAuditLog({ per_page: '50' });
  const { data: levelsData } = useMembershipLevels();
  const { data: orgData } = useOrganizationSettings();
  const createMember = useCreateMember();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();
  const createLevel = useCreateMembershipLevel();
  const updateLevel = useUpdateMembershipLevel();
  const deleteLevel = useDeleteMembershipLevel();
  const updateProfileField = useUpdateProfileField();
  const deleteProfileField = useDeleteProfileField();
  const createProfileField = useCreateProfileField();
  const updateOrganization = useUpdateOrganization();
  const uploadLogo = useUploadLogo();

  const membershipLevels: MembershipLevel[] = levelsData?.data ?? [];

  const roles: Role[] = apiRoles ?? [];
  const fieldDefinitions: any[] = Array.isArray(profileFieldsData) ? profileFieldsData : (profileFieldsData as any)?.data ?? [];
  const auditLog: any[] = Array.isArray(auditLogData) ? auditLogData : (auditLogData as any)?.data ?? [];

  const allUsers = membersData?.data ?? [];
  const filteredUsers = allUsers.filter(u =>
    !userSearch ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const systemRoles = (apiRoles ?? []).filter(r => ['org_admin', 'trainer', 'member'].includes(r.name));

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const selectedRoleIds = (apiRoles ?? [])
      .filter(r => fd.get(`role_${r.id}`) === 'on')
      .map(r => r.id);
    try {
      await createMember.mutateAsync({
        firstName: fd.get('firstName') as string,
        lastName: fd.get('lastName') as string,
        email: fd.get('email') as string,
        password: fd.get('password') as string,
        role_ids: selectedRoleIds.length > 0 ? selectedRoleIds : undefined,
      } as any);
      toast.success('Benutzer wurde erfolgreich erstellt!');
      setUserDialogOpen(false);
      form.reset();
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Erstellen');
    }
  };

  const handleToggleAdminRole = async (userId: string, currentRoles: string[]) => {
    const adminRole = (apiRoles ?? []).find(r => r.name === 'org_admin');
    if (!adminRole) return;
    const isAdmin = currentRoles.includes('org_admin');
    try {
      if (isAdmin) {
        await removeRole.mutateAsync({ roleId: adminRole.id, userId });
        toast.success('Admin-Rolle entfernt');
      } else {
        await assignRole.mutateAsync({ roleId: adminRole.id, userId });
        toast.success('Admin-Rolle zugewiesen');
      }
    } catch (err: any) {
      toast.error(err.message || 'Fehler bei Rollenzuweisung');
    }
  };

  const openRoleEditor = (role?: Role) => {
    setEditingRole(role || null);
    setRoleEditorOpen(true);
  };

  const openLevelEditor = (level?: MembershipLevel) => {
    setEditingLevel(level || null);
    setLevelForm(level ? { name: level.name, description: level.description || '', color: level.color, isDefault: level.isDefault } : { name: '', description: '', color: '#3b82f6', isDefault: false });
    setLevelDialogOpen(true);
  };

  const handleSaveLevel = async () => {
    try {
      if (editingLevel) {
        await updateLevel.mutateAsync({ id: editingLevel.id, name: levelForm.name, description: levelForm.description, color: levelForm.color, is_default: levelForm.isDefault });
        toast.success('Level aktualisiert');
      } else {
        await createLevel.mutateAsync({ name: levelForm.name, description: levelForm.description, color: levelForm.color, is_default: levelForm.isDefault });
        toast.success('Level erstellt');
      }
      setLevelDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Speichern');
    }
  };

  const handleConfirmDeleteLevel = async () => {
    if (!deleteLevelConfirm) return;
    try {
      await deleteLevel.mutateAsync(deleteLevelConfirm.id);
      toast.success(`Level "${deleteLevelConfirm.name}" gelöscht`);
      setDeleteLevelConfirm(null);
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Löschen');
    }
  };

  const handleToggleFieldProp = async (fieldId: string, prop: string, currentValue: boolean) => {
    try {
      await updateProfileField.mutateAsync({ id: fieldId, [prop]: !currentValue });
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Aktualisieren');
    }
  };

  const handleConfirmDeleteField = async () => {
    if (!deleteFieldConfirm) return;
    try {
      await deleteProfileField.mutateAsync(deleteFieldConfirm.id);
      toast.success(`Feld "${deleteFieldConfirm.label}" gelöscht`);
      setDeleteFieldConfirm(null);
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Löschen');
    }
  };

  const handleSaveField = async () => {
    try {
      await createProfileField.mutateAsync({
        name: fieldForm.name,
        label: fieldForm.label,
        type: fieldForm.type,
        required: fieldForm.required,
        searchable: fieldForm.searchable,
        visible_registration: fieldForm.visibleRegistration,
        gdpr_retention_days: fieldForm.gdprDays || null,
      });
      toast.success('Feld erstellt');
      setFieldEditorOpen(false);
      setFieldForm({ name: '', label: '', type: 'text', required: false, searchable: true, visibleRegistration: false, gdprDays: 0 });
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Erstellen');
    }
  };

  const handleSaveOrg = async () => {
    try {
      await updateOrganization.mutateAsync({ name: orgName });
      toast.success('Vereinsdaten gespeichert');
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Speichern');
    }
  };

  const org = orgData as any;
  useEffect(() => {
    if (org?.name && !orgName) setOrgName(org.name);
  }, [org?.name]);

  const standardFields = [
    { name: 'firstName', label: 'Vorname', locked: true, required: true, onForm: true, editable: true, visible: true, adminOnly: false },
    { name: 'lastName', label: 'Nachname', locked: true, required: true, onForm: true, editable: true, visible: true, adminOnly: false },
    { name: 'email', label: 'E-Mail', locked: true, required: true, onForm: true, editable: true, visible: true, adminOnly: false },
    { name: 'birthDate', label: 'Geburtsdatum', locked: false, required: false, onForm: true, editable: false, visible: true, adminOnly: false },
    { name: 'gender', label: 'Geschlecht', locked: false, required: false, onForm: true, editable: false, visible: true, adminOnly: false },
    { name: 'mobile', label: 'Mobiltelefon', locked: false, required: false, onForm: true, editable: true, visible: true, adminOnly: false },
    { name: 'street', label: 'Postanschrift', locked: false, required: false, onForm: true, editable: true, visible: false, adminOnly: false },
    { name: 'zip', label: 'Postleitzahl', locked: false, required: false, onForm: true, editable: true, visible: false, adminOnly: false },
    { name: 'city', label: 'Ort', locked: false, required: true, onForm: true, editable: true, visible: true, adminOnly: false },
    { name: 'phone', label: 'Telefon', locked: false, required: false, onForm: false, editable: true, visible: false, adminOnly: false },
    { name: 'memberNumber', label: 'Mitgliedsnummer', locked: false, required: false, onForm: false, editable: false, visible: true, adminOnly: true },
  ];

  const location = useLocation();
  const activeTab = useMemo(() => {
    const seg = location.pathname.split('/').pop();
    const validTabs = ['users', 'general', 'roles', 'fields', 'notifications', 'integrations', 'gdpr', 'members'];
    return validTabs.includes(seg || '') ? seg! : 'general';
  }, [location.pathname]);

  return (
    <div>
      <PageHeader title="Einstellungen" />

      <Tabs value={activeTab} className="flex flex-col gap-6">
        <div className="flex-1 min-w-0">
          {/* BENUTZER */}
          <TabsContent value="users">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Benutzer verwalten</h2>
              <Button onClick={() => setUserDialogOpen(true)}><UserPlus className="h-4 w-4 mr-2" /> Neuer Benutzer</Button>
            </div>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Benutzer suchen..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            {membersLoading ? (
              <div className="text-center py-12 text-muted-foreground">Benutzer werden geladen...</div>
            ) : (
              <Card className="border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benutzer</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Rollen</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user, i) => {
                      const isAdmin = user.roles?.includes('org_admin');
                      return (
                        <TableRow key={user.id} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary-lightest text-primary text-xs">{user.avatarInitials || `${(user.firstName?.[0] || '')}${(user.lastName?.[0] || '')}`}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.firstName} {user.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(user.roles || []).map(r => (
                                <Badge key={r} variant="outline" className={r === 'org_admin' ? 'bg-primary/10 text-primary border-primary/30' : ''}>{r === 'org_admin' ? 'Admin' : r === 'trainer' ? 'Trainer' : r === 'member' ? 'Mitglied' : r}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={user.status === 'Aktiv' ? 'bg-success/10 text-success border-success/30' : 'bg-muted text-muted-foreground'}>{user.status}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={isAdmin}
                              onCheckedChange={() => handleToggleAdminRole(user.id, user.roles || [])}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Keine Benutzer gefunden.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
            <p className="text-xs text-muted-foreground mt-3">{allUsers.length} Benutzer insgesamt</p>
          </TabsContent>

          {/* ALLGEMEIN */}
          <TabsContent value="general">
            <Tabs defaultValue="basisdaten">
              <TabsList className="mb-4">
                <TabsTrigger value="basisdaten">Basisdaten</TabsTrigger>
                <TabsTrigger value="vereinsbedingungen">Vereinsbedingungen</TabsTrigger>
                <TabsTrigger value="kommunikation">Kommunikation</TabsTrigger>
              </TabsList>

              <TabsContent value="basisdaten">
                <Card className="border border-border">
                  <CardHeader><CardTitle>Vereinsdaten</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Vereinsname</label>
                        <Input value={orgName} onChange={e => setOrgName(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Slug</label>
                        <Input value={org?.slug || ''} disabled className="bg-muted" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Logo</label>
                      <div className="flex items-center gap-4">
                        {org?.logoUrl ? (
                          <img
                            src={`${import.meta.env.VITE_API_URL || 'https://verein-connect-api.cloudflareone-demo-account.workers.dev'}${org.logoUrl}?t=${Date.now()}`}
                            alt="Vereinslogo"
                            className="w-16 h-16 rounded-lg object-contain border"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                            <Upload className="h-6 w-6" />
                          </div>
                        )}
                        <div className="flex-1">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept="image/png,image/jpeg,image/svg+xml,image/webp"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 2 * 1024 * 1024) { toast.error('Datei zu groß (max 2MB)'); return; }
                                try {
                                  await uploadLogo.mutateAsync(file);
                                  toast.success('Logo hochgeladen');
                                } catch (err: any) {
                                  toast.error(err.message || 'Upload fehlgeschlagen');
                                }
                              }}
                            />
                            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center text-muted-foreground hover:bg-muted/50 transition-colors">
                              <p className="text-sm">{uploadLogo.isPending ? 'Wird hochgeladen...' : 'Logo hochladen (PNG, JPG, SVG, max 2MB)'}</p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Zeitzone</label>
                        <Select defaultValue="europe_berlin"><SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="europe_berlin">Europe/Berlin (CET)</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Sprache</label>
                        <Select defaultValue="de"><SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="de">Deutsch</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Card className="bg-muted/50 border"><CardContent className="p-4 flex items-center justify-between">
                      <div><p className="font-medium">{org?.plan || 'Pro'} Plan</p><p className="text-sm text-muted-foreground">Gültig bis 01.01.2027</p></div>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30">Aktiv</Badge>
                    </CardContent></Card>
                    <Button onClick={handleSaveOrg} disabled={updateOrganization.isPending}>
                      {updateOrganization.isPending ? 'Speichert...' : 'Änderungen speichern'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vereinsbedingungen">
                <Card className="border border-border">
                  <CardHeader><CardTitle>Geschäftsbedingungen / Vereinssatzung</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">Hinterlegen Sie hier Ihre Vereinssatzung, AGB oder allgemeine Geschäftsbedingungen. Diese werden bei der Anmeldung neuer Mitglieder angezeigt.</p>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Link zur Satzung (optional)</label>
                      <Input placeholder="https://www.meinverein.de/satzung" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Vereinssatzung / AGB</label>
                      <Textarea rows={12} placeholder="Hier den vollständigen Text der Vereinssatzung oder AGB eingeben..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Beitragsordnung</label>
                      <Textarea rows={8} placeholder="Hier die Beitragsordnung eingeben..." />
                    </div>
                    <Button>Speichern</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="kommunikation">
                <Card className="border border-border">
                  <CardHeader><CardTitle>Standardnachrichten</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">Konfigurieren Sie hier die Standardnachrichten, die bei verschiedenen Aktionen automatisch versendet werden. Diese Funktion wird in Kürze verfügbar sein.</p>
                    <div className="grid gap-4">
                      {['Willkommensnachricht', 'Bestätigung Mitgliedsantrag', 'Kündigungsbestätigung', 'Zahlungserinnerung', 'Termin-Erinnerung'].map(tmpl => (
                        <Card key={tmpl} className="border border-border">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{tmpl}</p>
                              <p className="text-xs text-muted-foreground">Noch nicht konfiguriert</p>
                            </div>
                            <Button variant="outline" size="sm" disabled>Bearbeiten</Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ROLLEN */}
          <TabsContent value="roles">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Rollen & Berechtigungen</h2>
              <Button onClick={() => openRoleEditor()}><Plus className="h-4 w-4 mr-2" /> Neue Rolle</Button>
            </div>
            <div className="space-y-3">
              {roles.map(role => (
                <Card key={role.id} className="border border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{role.name}</h3>
                          <Badge variant="secondary">{role.category}</Badge>
                          {role.isSystem && <Badge variant="outline" className="text-xs">System</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{role.description}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{role.memberCount} Mitglieder</span>
                          {role.permissions.length > 0 && (
                            <>
                              <span>·</span>
                              <div className="flex flex-wrap gap-1">
                                {role.permissions.slice(0, 3).map(p => (
                                  <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                                ))}
                                {role.permissions.length > 3 && <Badge variant="outline" className="text-xs">+{role.permissions.length - 3}</Badge>}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openRoleEditor(role)}><Edit className="h-4 w-4" /></Button>
                        {!role.isSystem && <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {roles.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">Keine Rollen vorhanden.</p>
              )}
            </div>
          </TabsContent>

          {/* PROFILFELDER */}
          <TabsContent value="fields">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Profilfelder</h2>
              <Button onClick={() => setFieldEditorOpen(true)}><Plus className="h-4 w-4 mr-2" /> Neues Feld</Button>
            </div>
            <Card className="border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Feldname</TableHead>
                    <TableHead>Anzeigename</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="text-center">Pflicht</TableHead>
                    <TableHead className="text-center">Suchbar</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fieldDefinitions.map((f: any, i: number) => (
                    <TableRow key={f.id || i} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                      <TableCell><GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" /></TableCell>
                      <TableCell className="font-mono text-sm">{f.internalName || f.name || f.field_name}</TableCell>
                      <TableCell className="font-medium">{f.displayName || f.label || f.display_name}</TableCell>
                      <TableCell><Badge variant="secondary">{f.type || f.field_type}</Badge></TableCell>
                      <TableCell className="text-center">{f.required || f.is_required ? <Check className="h-4 w-4 text-success mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</TableCell>
                      <TableCell className="text-center">{f.searchable || f.is_searchable ? <Search className="h-4 w-4 text-primary mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {fieldDefinitions.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Keine Profilfelder vorhanden.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* MITGLIEDER */}
          <TabsContent value="members">
            <Tabs defaultValue="levels">
              <TabsList className="mb-4">
                <TabsTrigger value="levels">Mitgliedschaftslevel</TabsTrigger>
                <TabsTrigger value="memberfields">Mitgliedsfelder</TabsTrigger>
              </TabsList>

              {/* Mitgliedschaftslevel */}
              <TabsContent value="levels">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">Mitgliedschaftslevel</h2>
                    <p className="text-sm text-muted-foreground">Definieren Sie die verschiedenen Mitgliedschaftsstufen in Ihrem Verein.</p>
                  </div>
                  <Button onClick={() => openLevelEditor()}><Plus className="h-4 w-4 mr-2" /> Neues Level</Button>
                </div>
                <Card className="border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farbe</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Beschreibung</TableHead>
                        <TableHead className="text-center">Mitglieder</TableHead>
                        <TableHead className="text-center">Standard</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {membershipLevels.map((level, i) => (
                        <TableRow key={level.id} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                          <TableCell>
                            <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: level.color }} />
                          </TableCell>
                          <TableCell className="font-medium">{level.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{level.description || '–'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{level.memberCount}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {level.isDefault ? <Check className="h-4 w-4 text-success mx-auto" /> : <span className="text-muted-foreground">–</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openLevelEditor(level)}><Edit className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteLevelConfirm(level)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {membershipLevels.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Keine Mitgliedschaftslevel vorhanden.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* Mitgliedsfelder */}
              <TabsContent value="memberfields">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 mb-6 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-800">Hier können die im Verein verwendeten Mitgliedsfelder definiert werden. Für Felder kann eingestellt werden, ob diese bei der Neuanmeldung von Mitglieder erforderlich sind.</p>
                </div>

                <h3 className="text-base font-semibold mb-3">Standardfelder</h3>
                <p className="text-sm text-muted-foreground mb-4">Definiere die in der Mitgliederliste zu verwendenden Felder einschließlich ihrer Statusalternativen.</p>
                <Card className="border border-border mb-8">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">Feld</TableHead>
                          <TableHead className="text-center text-xs min-w-[100px]">Erforderliches Feld</TableHead>
                          <TableHead className="text-center text-xs min-w-[120px]">Auf dem Anmeldeformular</TableHead>
                          <TableHead className="text-center text-xs min-w-[120px]">Von Mitgliedern bearbeitbar</TableHead>
                          <TableHead className="text-center text-xs min-w-[110px]">Für Mitglieder sichtbar</TableHead>
                          <TableHead className="text-center text-xs min-w-[140px]">Nur für Vereinsverantwortliche</TableHead>
                          <TableHead className="text-center text-xs min-w-[100px]">Nicht in Verwendung</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {standardFields.map((field, i) => (
                          <TableRow key={field.name} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1.5">
                                {field.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                                {field.label}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {field.required ? <Check className="h-4 w-4 text-success mx-auto" /> : <span className="text-muted-foreground">–</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              {field.onForm ? <Check className="h-4 w-4 text-success mx-auto" /> : <span className="text-muted-foreground">–</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              {field.editable ? <Check className="h-4 w-4 text-success mx-auto" /> : <span className="text-muted-foreground">–</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              {field.visible ? <Check className="h-4 w-4 text-success mx-auto" /> : <span className="text-muted-foreground">–</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              {field.adminOnly ? <Check className="h-4 w-4 text-success mx-auto" /> : <span className="text-muted-foreground">–</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              {!field.required && !field.onForm && !field.editable && !field.visible && !field.adminOnly
                                ? <X className="h-4 w-4 text-destructive mx-auto" />
                                : <span className="text-muted-foreground">–</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-base font-semibold">Zusatzfelder</h3>
                    <p className="text-sm text-muted-foreground">Du kannst eigene Zusatzfelder nach dem Bedarf des Vereins erstellen.</p>
                  </div>
                  <Button onClick={() => setFieldEditorOpen(true)} variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" /> Neues Zusatzfeld</Button>
                </div>
                <Card className="border border-border">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">Feld</TableHead>
                          <TableHead className="text-center text-xs min-w-[100px]">Erforderliches Feld</TableHead>
                          <TableHead className="text-center text-xs min-w-[120px]">Auf dem Anmeldeformular</TableHead>
                          <TableHead className="text-center text-xs min-w-[120px]">Von Mitgliedern bearbeitbar</TableHead>
                          <TableHead className="text-center text-xs min-w-[110px]">Für Mitglieder sichtbar</TableHead>
                          <TableHead className="text-center text-xs min-w-[140px]">Nur für Vereinsverantwortliche</TableHead>
                          <TableHead className="text-center text-xs min-w-[100px]">Nicht in Verwendung</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fieldDefinitions.map((f: any, i: number) => (
                          <TableRow key={f.id || i} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                            <TableCell className="font-medium text-primary">{f.label || f.display_name || f.name}</TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={!!f.required} onCheckedChange={() => handleToggleFieldProp(f.id, 'required', !!f.required)} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={!!f.onRegistrationForm} onCheckedChange={() => handleToggleFieldProp(f.id, 'on_registration_form', !!f.onRegistrationForm)} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={!!f.editableByMember} onCheckedChange={() => handleToggleFieldProp(f.id, 'editable_by_member', !!f.editableByMember)} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={!!f.visibleToMember} onCheckedChange={() => handleToggleFieldProp(f.id, 'visible_to_member', !!f.visibleToMember)} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={!!f.adminOnly} onCheckedChange={() => handleToggleFieldProp(f.id, 'admin_only', !!f.adminOnly)} />
                            </TableCell>
                            <TableCell className="text-center">
                              {!f.required && !f.onRegistrationForm && !f.editableByMember && !f.visibleToMember && !f.adminOnly
                                ? <Badge variant="outline" className="text-xs text-muted-foreground">Inaktiv</Badge>
                                : <span className="text-muted-foreground">–</span>}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteFieldConfirm({ id: f.id, label: f.label || f.name })}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {fieldDefinitions.length === 0 && (
                          <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Keine Zusatzfelder vorhanden.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* BENACHRICHTIGUNGEN */}
          <TabsContent value="notifications">
            <Card className="border border-border mb-6">
              <CardHeader><CardTitle>E-Mail-Einstellungen</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium">Absendername</label><Input defaultValue="TSV Beispielverein" /></div>
                  <div><label className="text-sm font-medium">Absender-E-Mail</label><Input defaultValue="info@tsv-beispiel.de" /></div>
                </div>
                <div><label className="text-sm font-medium">Signatur</label><Textarea rows={3} defaultValue="Mit sportlichen Grüßen,&#10;TSV Beispielverein 1900 e.V." /></div>
                <Button>Speichern</Button>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardHeader><CardTitle>Push-Benachrichtigungen</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><label className="text-sm font-medium">Push-Benachrichtigungen aktiviert</label><Switch defaultChecked /></div>
                <div className="space-y-3">
                  {['Neue Anmeldung', 'Kursabsage', 'Chat-Nachricht', 'Neue Rechnung', 'Zahlung eingegangen', 'Termin-Erinnerung'].map(type => (
                    <div key={type} className="flex items-center gap-3">
                      <Checkbox defaultChecked id={`push-${type}`} />
                      <label htmlFor={`push-${type}`} className="text-sm">{type}</label>
                    </div>
                  ))}
                </div>
                <Button>Speichern</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INTEGRATIONEN */}
          <TabsContent value="integrations">
            <div className="space-y-4">
              <Card className="border border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><Link2 className="h-5 w-5 text-primary" /></div>
                    <div><p className="font-medium">Stripe</p><p className="text-sm text-muted-foreground">Zahlungsabwicklung</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Nicht verbunden</Badge>
                    <Button variant="outline" size="sm">Verbinden</Button>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border">
                <CardHeader><CardTitle>Homepage-Widget</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Betten Sie Clubboard-Widgets auf Ihrer Homepage ein:</p>
                  {['Terminkalender', 'Kursanmeldung', 'Mitglieder-Login', 'Nachrichten-Feed'].map(widget => (
                    <div key={widget} className="space-y-1">
                      <label className="text-sm font-medium">{widget}</label>
                      <div className="flex gap-2">
                        <Input readOnly value={`<script src="https://app.clubboard.de/widget/${widget.toLowerCase().replace(/[^a-z]/g, '-')}.js"></script>`} className="font-mono text-xs" />
                        <Button variant="outline" size="icon"><Copy className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* DSGVO */}
          <TabsContent value="gdpr">
            <div className="space-y-6">
              <Card className="border border-border">
                <CardHeader><CardTitle>Datenschutzerklärung</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input defaultValue="https://www.tsv-beispiel.de/datenschutz" />
                  <Textarea rows={4} placeholder="Oder Text direkt eingeben..." />
                  <Button>Speichern</Button>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader><CardTitle>Datenaufbewahrungsfristen</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Datentyp</TableHead><TableHead>Aufbewahrung (Tage)</TableHead><TableHead>Beschreibung</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {retentionPolicies.map((p, i) => (
                        <TableRow key={i} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                          <TableCell className="font-medium">{p.dataType}</TableCell>
                          <TableCell>{p.days === 0 ? 'Unbegrenzt' : p.days}</TableCell>
                          <TableCell className="text-muted-foreground">{p.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Audit-Log</CardTitle>
                    <Button variant="outline" size="sm"><FileDown className="h-4 w-4 mr-2" /> Exportieren</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Zeitpunkt</TableHead><TableHead>Benutzer</TableHead><TableHead>Aktion</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {auditLog.map((entry: any, i: number) => {
                        const userName = entry.user || entry.userName || entry.user_name || '–';
                        const initials = entry.userInitials || userName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <TableRow key={entry.id || i} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{entry.timestamp || entry.created_at}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6"><AvatarFallback className="bg-primary-lightest text-primary text-[10px]">{initials}</AvatarFallback></Avatar>
                                <span className="text-sm">{userName}</span>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="secondary" className="text-xs">{entry.action}</Badge></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{entry.details || entry.description}</TableCell>
                          </TableRow>
                        );
                      })}
                      {auditLog.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Keine Audit-Log-Einträge vorhanden.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div><p className="font-medium">Datenexport</p><p className="text-sm text-muted-foreground">Alle Daten eines Mitglieds als JSON/ZIP exportieren</p></div>
                  <Button variant="outline"><FileDown className="h-4 w-4 mr-2" /> Daten exportieren</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Role Editor Dialog */}
      <Dialog open={roleEditorOpen} onOpenChange={setRoleEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingRole ? `Rolle bearbeiten: ${editingRole.name}` : 'Neue Rolle'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Name</label><Input defaultValue={editingRole?.name || ''} /></div>
              <div><label className="text-sm font-medium">Kategorie</label>
                <Select defaultValue={editingRole?.category || 'Verein'}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="System">System</SelectItem><SelectItem value="Verein">Verein</SelectItem><SelectItem value="Sport">Sport</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-sm font-medium">Beschreibung</label><Input defaultValue={editingRole?.description || ''} /></div>
            <div>
              <label className="text-sm font-medium mb-2 block">Berechtigungs-Matrix</label>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bereich</TableHead>
                      {permissionActions.map(a => <TableHead key={a} className="text-center text-xs">{a}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissionCategories.map(cat => (
                      <TableRow key={cat}>
                        <TableCell className="font-medium text-sm">{cat}</TableCell>
                        {permissionActions.map(act => {
                          const permKey = `${cat.toLowerCase()}:${act.toLowerCase()}`;
                          return (
                            <TableCell key={act} className="text-center">
                              <Checkbox defaultChecked={editingRole?.permissions?.includes(permKey)} />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setRoleEditorOpen(false)}>Abbrechen</Button><Button>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Create Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Neuen Benutzer anlegen</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Vorname *</label><Input name="firstName" required /></div>
              <div><label className="text-sm font-medium">Nachname *</label><Input name="lastName" required /></div>
            </div>
            <div><label className="text-sm font-medium">E-Mail *</label><Input name="email" type="email" required /></div>
            <div><label className="text-sm font-medium">Passwort *</label><Input name="password" type="password" required minLength={8} placeholder="Mind. 8 Zeichen" /></div>
            <div>
              <label className="text-sm font-medium mb-2 block">Rollen zuweisen</label>
              <div className="space-y-2">
                {(apiRoles ?? []).map(role => (
                  <div key={role.id} className="flex items-center gap-2">
                    <Checkbox name={`role_${role.id}`} id={`newuser-role-${role.id}`} defaultChecked={role.name === 'member'} />
                    <label htmlFor={`newuser-role-${role.id}`} className="text-sm">
                      {role.name === 'org_admin' ? 'Admin' : role.name === 'member' ? 'Mitglied' : role.name === 'trainer' ? 'Trainer' : role.name}
                      {role.isSystem && <span className="text-muted-foreground ml-1">(System)</span>}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setUserDialogOpen(false)}>Abbrechen</Button>
              <Button type="submit" disabled={createMember.isPending}>{createMember.isPending ? 'Erstelle...' : 'Benutzer erstellen'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Field Editor Dialog */}
      <Dialog open={fieldEditorOpen} onOpenChange={(open) => { setFieldEditorOpen(open); if (!open) setFieldForm({ name: '', label: '', type: 'text', required: false, searchable: true, visibleRegistration: false, gdprDays: 0 }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neues Zusatzfeld</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Interner Name *</label>
              <Input value={fieldForm.name} onChange={e => setFieldForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. shoeSize" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Anzeigename *</label>
              <Input value={fieldForm.label} onChange={e => setFieldForm(f => ({ ...f, label: e.target.value }))} placeholder="z.B. Schuhgröße" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Feldtyp</label>
              <Select value={fieldForm.type} onValueChange={v => setFieldForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Zahl</SelectItem>
                  <SelectItem value="date">Datum</SelectItem>
                  <SelectItem value="select">Auswahl</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Pflichtfeld</label>
              <Switch checked={fieldForm.required} onCheckedChange={v => setFieldForm(f => ({ ...f, required: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Durchsuchbar</label>
              <Switch checked={fieldForm.searchable} onCheckedChange={v => setFieldForm(f => ({ ...f, searchable: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Im Anmeldeformular anzeigen</label>
              <Switch checked={fieldForm.visibleRegistration} onCheckedChange={v => setFieldForm(f => ({ ...f, visibleRegistration: v }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">DSGVO Auto-Löschung (Tage, 0=nie)</label>
              <Input type="number" value={fieldForm.gdprDays} onChange={e => setFieldForm(f => ({ ...f, gdprDays: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFieldEditorOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveField} disabled={!fieldForm.name || !fieldForm.label || createProfileField.isPending}>
              {createProfileField.isPending ? 'Speichert...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Membership Level Editor Dialog */}
      <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingLevel ? `Level bearbeiten: ${editingLevel.name}` : 'Neues Mitgliedschaftslevel'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Name *</label>
              <Input value={levelForm.name} onChange={e => setLevelForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Ehrenmitglied" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Beschreibung</label>
              <Input value={levelForm.description} onChange={e => setLevelForm(f => ({ ...f, description: e.target.value }))} placeholder="Kurze Beschreibung" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Farbe</label>
              <div className="flex items-center gap-3">
                <input type="color" value={levelForm.color} onChange={e => setLevelForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded border border-border cursor-pointer" />
                <Input value={levelForm.color} onChange={e => setLevelForm(f => ({ ...f, color: e.target.value }))} className="w-32 font-mono text-sm" />
                <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: levelForm.color }} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <label className="text-sm font-medium">Standardlevel</label>
                <p className="text-xs text-muted-foreground">Wird neuen Mitgliedern automatisch zugewiesen</p>
              </div>
              <Switch checked={levelForm.isDefault} onCheckedChange={v => setLevelForm(f => ({ ...f, isDefault: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLevelDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveLevel} disabled={!levelForm.name || createLevel.isPending || updateLevel.isPending}>
              {createLevel.isPending || updateLevel.isPending ? 'Speichert...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Level Confirmation */}
      <AlertDialog open={!!deleteLevelConfirm} onOpenChange={open => !open && setDeleteLevelConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Level löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie das Level <strong>"{deleteLevelConfirm?.name}"</strong> wirklich löschen?
              {(deleteLevelConfirm?.memberCount ?? 0) > 0 && (
                <> Es sind noch <strong>{deleteLevelConfirm?.memberCount} Mitglieder</strong> diesem Level zugeordnet. Die Zuordnung wird entfernt.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteLevel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLevel.isPending ? 'Löscht...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Field Confirmation */}
      <AlertDialog open={!!deleteFieldConfirm} onOpenChange={open => !open && setDeleteFieldConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zusatzfeld löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie das Feld <strong>"{deleteFieldConfirm?.label}"</strong> wirklich löschen? Alle gespeicherten Werte für dieses Feld gehen verloren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteField} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteProfileField.isPending ? 'Löscht...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
