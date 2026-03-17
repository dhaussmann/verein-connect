import { useState } from 'react';
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
import { Plus, Edit, Trash2, Upload, Copy, GripVertical, Search, Shield, Check, X, Globe, Link2, FileDown } from 'lucide-react';
import { roles, fieldDefinitions, auditLog, permissionCategories, permissionActions, retentionPolicies, type RoleDefinition } from '@/data/settingsData';

export default function Settings() {
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [fieldEditorOpen, setFieldEditorOpen] = useState(false);

  const openRoleEditor = (role?: RoleDefinition) => {
    setEditingRole(role || null);
    setRoleEditorOpen(true);
  };

  return (
    <div>
      <PageHeader title="Einstellungen" />

      <Tabs defaultValue="general" orientation="vertical" className="flex flex-col md:flex-row gap-6">
        <TabsList className="flex md:flex-col h-auto md:w-56 bg-transparent gap-1 shrink-0">
          {[
            ['general', 'Allgemein'],
            ['roles', 'Rollen & Berechtigungen'],
            ['fields', 'Profilfelder'],
            ['notifications', 'Benachrichtigungen'],
            ['integrations', 'Integrationen'],
            ['gdpr', 'DSGVO & Datenschutz'],
          ].map(([val, label]) => (
            <TabsTrigger key={val} value={val} className="justify-start w-full data-[state=active]:bg-accent">{label}</TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 min-w-0">
          {/* ALLGEMEIN */}
          <TabsContent value="general">
            <Card className="border border-border">
              <CardHeader><CardTitle>Vereinsdaten</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium">Vereinsname</label><Input defaultValue="TSV Beispielverein 1900 e.V." /></div>
                  <div><label className="text-sm font-medium">Website</label><Input defaultValue="https://www.tsv-beispiel.de" /></div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Logo</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground cursor-pointer hover:bg-muted/50">
                    <Upload className="h-8 w-8 mx-auto mb-2" /><p className="text-sm">Logo hochladen (PNG, SVG, max 2MB)</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium">Zeitzone</label>
                    <Select defaultValue="europe_berlin"><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="europe_berlin">Europe/Berlin (CET)</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-sm font-medium">Sprache</label>
                    <Select defaultValue="de"><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="de">Deutsch</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <Card className="bg-muted/50 border"><CardContent className="p-4 flex items-center justify-between">
                  <div><p className="font-medium">Pro Plan</p><p className="text-sm text-muted-foreground">Gültig bis 01.01.2027</p></div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">Aktiv</Badge>
                </CardContent></Card>
                <Button>Änderungen speichern</Button>
              </CardContent>
            </Card>
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
                          <span>·</span>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(role.permissions).slice(0, 3).map(([cat, acts]) => (
                              <Badge key={cat} variant="outline" className="text-xs">{cat}: {acts.join(', ')}</Badge>
                            ))}
                            {Object.keys(role.permissions).length > 3 && <Badge variant="outline" className="text-xs">+{Object.keys(role.permissions).length - 3}</Badge>}
                          </div>
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
                  {fieldDefinitions.map((f, i) => (
                    <TableRow key={f.id} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                      <TableCell><GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" /></TableCell>
                      <TableCell className="font-mono text-sm">{f.internalName}</TableCell>
                      <TableCell className="font-medium">{f.displayName}</TableCell>
                      <TableCell><Badge variant="secondary">{f.type}</Badge></TableCell>
                      <TableCell className="text-center">{f.required ? <Check className="h-4 w-4 text-success mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</TableCell>
                      <TableCell className="text-center">{f.searchable ? <Search className="h-4 w-4 text-primary mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
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
                      {auditLog.map((entry, i) => (
                        <TableRow key={entry.id} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                          <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{entry.timestamp}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6"><AvatarFallback className="bg-primary-lightest text-primary text-[10px]">{entry.userInitials}</AvatarFallback></Avatar>
                              <span className="text-sm">{entry.user}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs">{entry.action}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{entry.details}</TableCell>
                        </TableRow>
                      ))}
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
                        {permissionActions.map(act => (
                          <TableCell key={act} className="text-center">
                            <Checkbox defaultChecked={editingRole?.permissions[cat]?.includes(act)} />
                          </TableCell>
                        ))}
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

      {/* Field Editor Dialog */}
      <Dialog open={fieldEditorOpen} onOpenChange={setFieldEditorOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neues Profilfeld</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Interner Name</label><Input placeholder="z.B. shoeSize" /></div>
            <div><label className="text-sm font-medium">Anzeigename</label><Input placeholder="z.B. Schuhgröße" /></div>
            <div><label className="text-sm font-medium">Feldtyp</label>
              <Select><SelectTrigger><SelectValue placeholder="Typ wählen" /></SelectTrigger>
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
            <div className="flex items-center justify-between"><label className="text-sm font-medium">Pflichtfeld</label><Switch /></div>
            <div className="flex items-center justify-between"><label className="text-sm font-medium">Durchsuchbar</label><Switch /></div>
            <div className="flex items-center justify-between"><label className="text-sm font-medium">Im Anmeldeformular anzeigen</label><Switch /></div>
            <div><label className="text-sm font-medium">DSGVO Auto-Löschung (Tage, 0=nie)</label><Input type="number" defaultValue={0} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setFieldEditorOpen(false)}>Abbrechen</Button><Button>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
