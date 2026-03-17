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
  Download, Link as LinkIcon, Calendar as CalIcon,
} from 'lucide-react';
import {
  members, customFieldDefinitions, availableRoles,
  getMemberRoleAssignments, getMemberCourses, getMemberAttendance,
  getMemberInvoices, getMemberFamily,
} from '@/data/mockData';

const statusClass = (s: string) =>
  s === 'Aktiv' ? 'bg-success/10 text-success' : s === 'Inaktiv' ? 'bg-muted text-muted-foreground' : 'bg-warning/10 text-warning';

const attendanceDot = (s: string) =>
  s === 'Anwesend' ? 'bg-success' : s === 'Abwesend' ? 'bg-destructive' : 'bg-warning';

const courseStatusClass = (s: string) =>
  s === 'Angemeldet' ? 'bg-primary-lightest text-primary' : s === 'Warteliste' ? 'bg-warning/10 text-warning' : s === 'Teilgenommen' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive';

const invoiceStatusClass = (s: string) =>
  s === 'Bezahlt' ? 'bg-success/10 text-success' : s === 'Offen' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive';

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const member = members.find((m) => m.id === id);
  const [editing, setEditing] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState('');

  if (!member) {
    return (
      <div>
        <PageHeader title="Mitglied nicht gefunden" />
        <p className="text-muted-foreground">Das Mitglied mit ID "{id}" wurde nicht gefunden.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/members')}>Zurück zur Liste</Button>
      </div>
    );
  }

  const roleAssignments = getMemberRoleAssignments(member.id);
  const courses = getMemberCourses(member.id);
  const attendance = getMemberAttendance(member.id);
  const invoices = getMemberInvoices(member.id);
  const family = getMemberFamily(member.id);

  const profileFields = [
    { label: 'Vorname', value: member.firstName },
    { label: 'Nachname', value: member.lastName },
    { label: 'Geburtsdatum', value: member.birthDate },
    { label: 'Geschlecht', value: member.gender },
    { label: 'E-Mail', value: member.email },
    { label: 'Telefon', value: member.phone || '–' },
    { label: 'Mobil', value: member.mobile || '–' },
    { label: 'Adresse', value: `${member.street}, ${member.zip} ${member.city}` },
    ...customFieldDefinitions
      .filter((cf) => member.customFields[cf.key])
      .map((cf) => ({ label: cf.label, value: member.customFields[cf.key] === 'true' ? 'Ja' : member.customFields[cf.key] === 'false' ? 'Nein' : member.customFields[cf.key] })),
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
                  <DropdownMenuItem><UserMinus className="h-4 w-4 mr-2" />Deaktivieren</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Löschen</DropdownMenuItem>
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
          <TabsTrigger value="finanzen">Finanzen</TabsTrigger>
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
                      <TableCell className="text-muted-foreground">{ra.endDate || '–'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-2">Gruppen / Mannschaften</h3>
                <div className="flex gap-2 flex-wrap">
                  {member.groups.map((g) => <Badge key={g}>{g}</Badge>)}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Kurse */}
        <TabsContent value="kurse">
          <Card className="bg-popover shadow-sm">
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="hidden sm:table-cell">Zeitraum</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{c.period}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${courseStatusClass(c.status)}`}>{c.status}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Anwesenheit */}
        <TabsContent value="anwesenheit">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Card className="bg-popover shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Anwesenheitsquote</p>
                <p className="text-3xl font-semibold text-primary mt-1">{attendance.rate}%</p>
              </CardContent>
            </Card>
            <Card className="bg-popover shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Letzte Anwesenheit</p>
                <p className="text-lg font-semibold mt-1">{attendance.lastPresent}</p>
              </CardContent>
            </Card>
            <Card className="bg-popover shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Fehlzeiten (Quartal)</p>
                <p className="text-3xl font-semibold text-destructive mt-1">{attendance.absencesQuarter}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="bg-popover shadow-sm">
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Veranstaltung</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">{r.date}</TableCell>
                      <TableCell>{r.eventTitle}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${attendanceDot(r.status)}`} />
                          <span className="text-sm">{r.status}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Finanzen */}
        <TabsContent value="finanzen">
          <Card className="bg-popover shadow-sm">
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rechnungsnr.</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                      <TableCell className="text-muted-foreground">{inv.date}</TableCell>
                      <TableCell>{inv.description}</TableCell>
                      <TableCell className="text-right font-medium">{inv.amount}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${invoiceStatusClass(inv.status)}`}>{inv.status}</span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Familie */}
        <TabsContent value="familie">
          {family ? (
            <div className="space-y-4">
              <Card className="bg-popover shadow-sm">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Familienname</p>
                      <p className="font-medium">{family.familyName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Familienrabatt</p>
                      <p className="font-medium">{family.discount}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Gesamtbeitrag</p>
                      <p className="font-medium">{family.totalFee}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-popover shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Familienmitglieder</CardTitle>
                  <Button size="sm" variant="outline"><LinkIcon className="h-4 w-4 mr-1" />Verknüpfen</Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {family.members.map((fm) => (
                      <div key={fm.memberId} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/members/${fm.memberId}`)}>
                        <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                          <span className="text-primary-foreground text-sm font-semibold">{fm.initials}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{fm.name}</p>
                          <p className="text-xs text-muted-foreground">{fm.relation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-popover shadow-sm">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground text-sm">Kein Familienprofil vorhanden.</p>
                <Button variant="outline" className="mt-4"><LinkIcon className="h-4 w-4 mr-1" />Familienmitglied verknüpfen</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
                  {availableRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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
