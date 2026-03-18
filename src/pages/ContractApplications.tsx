import { useState } from 'react';
import { ClipboardList, Check, X, Eye } from 'lucide-react';
import { useContractApplications, useAcceptApplication, useRejectApplication } from '@/hooks/use-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'Ausstehend', variant: 'outline' },
  ACCEPTED: { label: 'Angenommen', variant: 'default' },
  REJECTED: { label: 'Abgelehnt', variant: 'destructive' },
};

export default function ContractApplications() {
  const [statusFilter, setStatusFilter] = useState('');
  const params: Record<string, string> = {};
  if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;

  const { data, isLoading } = useContractApplications(params);
  const acceptMut = useAcceptApplication();
  const rejectMut = useRejectApplication();

  const applications = data?.data || [];
  const meta = data?.meta;

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  const handleAccept = async (id: string) => {
    try {
      await acceptMut.mutateAsync(id);
      toast.success('Antrag angenommen – Mitglied und Vertrag erstellt');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReject = async () => {
    try {
      await rejectMut.mutateAsync({ id: rejectId, review_notes: rejectNotes });
      toast.success('Antrag abgelehnt');
      setRejectOpen(false);
      setRejectNotes('');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Beitrittsanträge</h1>
          <p className="text-muted-foreground">Anträge aus der Selbstregistrierung verwalten</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle</SelectItem>
            <SelectItem value="PENDING">Ausstehend</SelectItem>
            <SelectItem value="ACCEPTED">Angenommen</SelectItem>
            <SelectItem value="REJECTED">Abgelehnt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Laden...</div>
          ) : applications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Keine Anträge gefunden</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">E-Mail</th>
                    <th className="text-left p-3 font-medium">Typ</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Eingereicht</th>
                    <th className="text-right p-3 font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const st = statusMap[app.status] || { label: app.status, variant: 'outline' as const };
                    return (
                      <tr key={app.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{app.firstName} {app.lastName}</td>
                        <td className="p-3 text-muted-foreground">{app.email}</td>
                        <td className="p-3">{app.typeName || '-'}</td>
                        <td className="p-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                        <td className="p-3 text-xs">{new Date(app.submittedAt).toLocaleDateString('de-DE')}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(app); setDetailOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {app.status === 'PENDING' && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleAccept(app.id)} disabled={acceptMut.isPending}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setRejectId(app.id); setRejectOpen(true); }}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {meta && meta.total_pages > 1 && (
        <p className="text-sm text-muted-foreground text-center">Seite {meta.page} von {meta.total_pages}</p>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Antragsdetails</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm py-4">
              <Row label="Name" value={`${selected.firstName} ${selected.lastName}`} />
              <Row label="E-Mail" value={selected.email} />
              <Row label="Telefon" value={selected.phone || '-'} />
              <Row label="Adresse" value={selected.address || '-'} />
              <Row label="Geburtsdatum" value={selected.dateOfBirth ? new Date(selected.dateOfBirth).toLocaleDateString('de-DE') : '-'} />
              <Row label="Typ" value={selected.typeName || '-'} />
              <Row label="Abrechnungszeitraum" value={selected.billingPeriod || '-'} />
              <Row label="Status" value={statusMap[selected.status]?.label || selected.status} />
              {selected.reviewerName && <Row label="Bearbeitet von" value={selected.reviewerName} />}
              {selected.reviewedAt && <Row label="Bearbeitet am" value={new Date(selected.reviewedAt).toLocaleDateString('de-DE')} />}
              {selected.reviewNotes && <Row label="Notizen" value={selected.reviewNotes} />}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Antrag ablehnen</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Begründung (optional)</Label>
            <Textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMut.isPending}>Ablehnen</Button>
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
