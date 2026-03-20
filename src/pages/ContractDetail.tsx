import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, User, Calendar, Receipt, Pause, Play, XCircle, Edit, Trash2,
} from 'lucide-react';
import { useContract, useCancelContract, usePauseContract, useCreateContractInvoice, useDeleteContract } from '@/hooks/use-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: 'Aktiv', variant: 'default' },
  CANCELLED: { label: 'Gekündigt', variant: 'destructive' },
  EXPIRED: { label: 'Abgelaufen', variant: 'secondary' },
  PAUSED: { label: 'Pausiert', variant: 'outline' },
};

const periodMap: Record<string, string> = {
  MONTHLY: 'Monatlich', QUARTERLY: 'Vierteljährlich', HALF_YEARLY: 'Halbjährlich', YEARLY: 'Jährlich',
};

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: contract, isLoading } = useContract(id);
  const cancelMutation = useCancelContract();
  const pauseMutation = usePauseContract();
  const invoiceMutation = useCreateContractInvoice();
  const deleteMutation = useDeleteContract();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelDate, setCancelDate] = useState(new Date().toISOString().slice(0, 10));
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseFrom, setPauseFrom] = useState('');
  const [pauseUntil, setPauseUntil] = useState('');
  const [pauseReason, setPauseReason] = useState('');

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Laden...</div>;
  if (!contract) return <div className="p-8 text-center text-muted-foreground">Vertrag nicht gefunden</div>;

  const st = statusMap[contract.status || ''] || { label: contract.status, variant: 'outline' as const };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ id: contract.id, cancellation_date: cancelDate });
      toast.success('Vertrag gekündigt');
      setCancelOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handlePause = async () => {
    try {
      await pauseMutation.mutateAsync({ id: contract.id, pause_from: pauseFrom, pause_until: pauseUntil, reason: pauseReason });
      toast.success('Pause eingetragen');
      setPauseOpen(false);
      setPauseFrom(''); setPauseUntil(''); setPauseReason('');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleInvoice = async () => {
    try {
      await invoiceMutation.mutateAsync(contract.id);
      toast.success('Rechnung erstellt');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!confirm('Vertrag endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    try {
      await deleteMutation.mutateAsync(contract.id);
      toast.success('Vertrag gelöscht');
      navigate('/contracts');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contracts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{contract.contractNumber}</h1>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
          <p className="text-muted-foreground">
            {contract.typeName} · {contract.contractKind === 'MEMBERSHIP' ? 'Mitgliedschaft' : 'Tarif'}
          </p>
        </div>
        <div className="flex gap-2">
          {contract.status === 'ACTIVE' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setPauseOpen(true)}>
                <Pause className="h-4 w-4 mr-1" /> Pausieren
              </Button>
              <Button variant="outline" size="sm" onClick={handleInvoice}>
                <Receipt className="h-4 w-4 mr-1" /> Rechnung
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                <XCircle className="h-4 w-4 mr-1" /> Kündigen
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" /> Löschen
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Basisdaten</TabsTrigger>
          <TabsTrigger value="invoices">Rechnungen ({contract.invoices?.length || 0})</TabsTrigger>
          <TabsTrigger value="pauses">Pausen ({contract.pauses?.length || 0})</TabsTrigger>
          <TabsTrigger value="log">Protokoll</TabsTrigger>
        </TabsList>

        {/* Basisdaten */}
        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vertragsdaten */}
            <Card>
              <CardHeader><CardTitle className="text-base">Vertragsdaten</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Vertragsnummer" value={contract.contractNumber} />
                <Row label="Art" value={contract.contractKind === 'MEMBERSHIP' ? 'Mitgliedschaft' : 'Tarif'} />
                <Row label="Typ / Tarif" value={contract.typeName || '-'} />
                <Row label="Gruppe" value={contract.groupName || '-'} />
                <Row label="Status" value={st.label} />
                <Row label="Startdatum" value={fmtDate(contract.startDate)} />
                <Row label="Enddatum" value={fmtDate(contract.endDate)} />
                <Row label="Preis" value={`${(contract.currentPrice || 0).toFixed(2)} €`} />
                <Row label="Abrechnungszeitraum" value={periodMap[contract.billingPeriod || ''] || '-'} />
                <Row label="Auto-Verlängerung" value={contract.autoRenew ? 'Ja' : 'Nein'} />
                <Row label="Bezahlt bis" value={fmtDate(contract.paidUntil)} />
                <Row label="Kündigungsfrist" value={contract.cancellationNoticeDays ? `${contract.cancellationNoticeDays} ${contract.cancellationNoticeDays === 1 ? 'Monat' : 'Monate'}` : '-'} />
                {contract.cancellationDate && (
                  <>
                    <Row label="Kündigungsdatum" value={fmtDate(contract.cancellationDate)} />
                    <Row label="Wirksam ab" value={fmtDate(contract.cancellationEffectiveDate)} />
                  </>
                )}
                <Row label="Erstellt von" value={contract.createdByName || '-'} />
                <Row label="Erstellt am" value={fmtDate(contract.createdAt)} />
                {contract.notes && <Row label="Notizen" value={contract.notes} />}
              </CardContent>
            </Card>

            {/* Mitglied */}
            <Card>
              <CardHeader><CardTitle className="text-base">Mitglied</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {contract.member ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                        {(contract.member.firstName?.[0] || '')}{(contract.member.lastName?.[0] || '')}
                      </div>
                      <div>
                        <p className="font-medium">{contract.member.firstName} {contract.member.lastName}</p>
                        <p className="text-muted-foreground text-xs">{contract.member.email}</p>
                      </div>
                    </div>
                    <Row label="Telefon" value={contract.member.phone || '-'} />
                    <Row label="Mobil" value={contract.member.mobile || '-'} />
                    <Row label="Straße" value={contract.member.street || '-'} />
                    <Row label="PLZ / Ort" value={[contract.member.zip, contract.member.city].filter(Boolean).join(' ') || '-'} />
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate(`/members/${contract.member!.id}`)}>
                      <User className="h-4 w-4 mr-1" /> Profil öffnen
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground">Kein Mitglied verknüpft</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Familienmitglieder (for Familientarif) */}
          {contract.familyMembers && contract.familyMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Familienmitglieder{contract.familyName ? ` – ${contract.familyName}` : ''}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contract.familyMembers.map((fm: any) => (
                    <div key={fm.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
                          {(fm.firstName?.[0] || '')}{(fm.lastName?.[0] || '')}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{fm.firstName} {fm.lastName}</p>
                          <p className="text-xs text-muted-foreground">{fm.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {fm.relationship && <Badge variant="outline" className="text-xs">{fm.relationship}</Badge>}
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/members/${fm.id}`)}>
                          <User className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Child contracts */}
          {contract.children && contract.children.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Verknüpfte Verträge</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contract.children.map((child: any) => (
                    <div key={child.id} className="flex items-center justify-between p-2 rounded border hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/contracts/${child.id}`)}>
                      <div>
                        <p className="font-medium text-sm">{child.contractNumber}</p>
                        <p className="text-xs text-muted-foreground">{child.contractKind}</p>
                      </div>
                      <Badge variant={statusMap[child.status]?.variant || 'outline'}>{statusMap[child.status]?.label || child.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rechnungen */}
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {!contract.invoices?.length ? (
                <div className="p-8 text-center text-muted-foreground">Keine Rechnungen</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Nr.</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Betrag</th>
                      <th className="text-left p-3 font-medium">Fällig</th>
                      <th className="text-left p-3 font-medium">Erstellt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract.invoices.map((inv: any) => (
                      <tr key={inv.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="p-3"><Badge variant="outline">{inv.status}</Badge></td>
                        <td className="p-3 font-medium">{inv.total?.toFixed(2)} €</td>
                        <td className="p-3 text-xs">{fmtDate(inv.dueDate)}</td>
                        <td className="p-3 text-xs">{fmtDate(inv.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pausen */}
        <TabsContent value="pauses" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {!contract.pauses?.length ? (
                <div className="p-8 text-center text-muted-foreground">Keine Pausen</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Von</th>
                      <th className="text-left p-3 font-medium">Bis</th>
                      <th className="text-left p-3 font-medium">Grund</th>
                      <th className="text-left p-3 font-medium">Gutschrift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract.pauses.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="p-3 text-xs">{fmtDate(p.pauseFrom)}</td>
                        <td className="p-3 text-xs">{fmtDate(p.pauseUntil)}</td>
                        <td className="p-3 text-sm">{p.reason || '-'}</td>
                        <td className="p-3 font-medium">{(p.creditAmount || 0).toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protokoll */}
        <TabsContent value="log" className="mt-4">
          <Card>
            <CardContent className="py-6">
              <div className="space-y-3 text-sm">
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium">Vertrag erstellt</p>
                    <p className="text-muted-foreground text-xs">
                      {fmtDate(contract.createdAt)} · {contract.createdByName || 'System'}
                    </p>
                  </div>
                </div>
                {contract.cancellationDate && (
                  <div className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium">Vertrag gekündigt</p>
                      <p className="text-muted-foreground text-xs">
                        Zum {fmtDate(contract.cancellationDate)} · Wirksam ab {fmtDate(contract.cancellationEffectiveDate)}
                      </p>
                    </div>
                  </div>
                )}
                {contract.pauses?.map((p) => (
                  <div key={p.id} className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium">Pause eingetragen</p>
                      <p className="text-muted-foreground text-xs">
                        {fmtDate(p.pauseFrom)} – {fmtDate(p.pauseUntil)} · {p.reason || 'Ohne Grund'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vertrag kündigen</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Kündigungsdatum</Label>
              <Input type="date" value={cancelDate} onChange={(e) => setCancelDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>Kündigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Dialog */}
      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vertrag pausieren</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Von</Label>
              <Input type="date" value={pauseFrom} onChange={(e) => setPauseFrom(e.target.value)} />
            </div>
            <div>
              <Label>Bis</Label>
              <Input type="date" value={pauseUntil} onChange={(e) => setPauseUntil(e.target.value)} />
            </div>
            <div>
              <Label>Grund (optional)</Label>
              <Textarea value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseOpen(false)}>Abbrechen</Button>
            <Button onClick={handlePause} disabled={pauseMutation.isPending || !pauseFrom || !pauseUntil}>Pause eintragen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('de-DE'); } catch { return d; }
}
