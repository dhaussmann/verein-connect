import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Filter, MoreHorizontal, Eye, XCircle, Receipt } from 'lucide-react';
import { useContracts, useCancelContract, useCreateContractInvoice } from '@/hooks/use-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: 'Aktiv', variant: 'default' },
  CANCELLED: { label: 'Gekündigt', variant: 'destructive' },
  EXPIRED: { label: 'Abgelaufen', variant: 'secondary' },
  PAUSED: { label: 'Pausiert', variant: 'outline' },
};

const periodMap: Record<string, string> = {
  MONTHLY: 'Monatlich',
  QUARTERLY: 'Vierteljährlich',
  HALF_YEARLY: 'Halbjährlich',
  YEARLY: 'Jährlich',
};

export default function Contracts() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelId, setCancelId] = useState('');
  const [cancelDate, setCancelDate] = useState(new Date().toISOString().slice(0, 10));

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
  if (kindFilter && kindFilter !== 'ALL') params.contract_kind = kindFilter;

  const { data, isLoading } = useContracts(params);
  const cancelMutation = useCancelContract();
  const invoiceMutation = useCreateContractInvoice();

  const contracts = data?.data || [];
  const meta = data?.meta;

  // KPIs
  const active = contracts.filter(c => c.status === 'ACTIVE').length;
  const cancelled = contracts.filter(c => c.status === 'CANCELLED').length;
  const totalRevenue = contracts.reduce((sum, c) => sum + (c.currentPrice || 0), 0);

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ id: cancelId, cancellation_date: cancelDate });
      toast.success('Vertrag wurde gekündigt');
      setCancelDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Fehler beim Kündigen');
    }
  };

  const handleCreateInvoice = async (id: string) => {
    try {
      await invoiceMutation.mutateAsync(id);
      toast.success('Rechnung erstellt');
    } catch (e: any) {
      toast.error(e.message || 'Fehler');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Verträge</h1>
          <p className="text-muted-foreground">Verwalten Sie alle Mitgliederverträge</p>
        </div>
        <Button onClick={() => navigate('/contracts/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Vertrag
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{active}</p>
                <p className="text-xs text-muted-foreground">Aktive Verträge</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cancelled}</p>
                <p className="text-xs text-muted-foreground">Gekündigte Verträge</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRevenue.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">Monatl. Einnahmen (aktiv)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Vertragsnummer suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Status</SelectItem>
            <SelectItem value="ACTIVE">Aktiv</SelectItem>
            <SelectItem value="CANCELLED">Gekündigt</SelectItem>
            <SelectItem value="EXPIRED">Abgelaufen</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Vertragsart" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Arten</SelectItem>
            <SelectItem value="MEMBERSHIP">Mitgliedschaft</SelectItem>
            <SelectItem value="TARIF">Tarif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Laden...</div>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Keine Verträge gefunden</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Nr.</th>
                    <th className="text-left p-3 font-medium">Mitglied</th>
                    <th className="text-left p-3 font-medium">Typ</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Preis</th>
                    <th className="text-left p-3 font-medium">Laufzeit</th>
                    <th className="text-left p-3 font-medium">Abrechnungszeitraum</th>
                    <th className="text-right p-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => {
                    const st = statusMap[c.status || ''] || { label: c.status, variant: 'outline' as const };
                    return (
                      <tr
                        key={c.id}
                        className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/contracts/${c.id}`)}
                      >
                        <td className="p-3 font-mono text-xs">{c.contractNumber}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {c.familyName ? c.familyName.charAt(0).toUpperCase() : c.memberInitials}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{c.familyName || c.memberName}</p>
                              <p className="text-xs text-muted-foreground">{c.familyName ? 'Familientarif' : c.memberEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="text-sm">{c.typeName || '-'}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.contractKind === 'MEMBERSHIP' ? 'Mitgliedschaft' : 'Tarif'}
                            </p>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={st.variant}>{st.label}</Badge>
                          {c.cancellationDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Kündigung: {new Date(c.cancellationDate).toLocaleDateString('de-DE')}
                            </p>
                          )}
                        </td>
                        <td className="p-3 font-medium">{c.currentPrice?.toFixed(2)} €</td>
                        <td className="p-3 text-xs">
                          {c.startDate ? new Date(c.startDate).toLocaleDateString('de-DE') : '-'}
                          {c.endDate && ` – ${new Date(c.endDate).toLocaleDateString('de-DE')}`}
                        </td>
                        <td className="p-3 text-xs">{periodMap[c.billingPeriod || ''] || '-'}</td>
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/contracts/${c.id}`)}>
                                <Eye className="h-4 w-4 mr-2" /> Details
                              </DropdownMenuItem>
                              {c.status === 'ACTIVE' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleCreateInvoice(c.id)}>
                                    <Receipt className="h-4 w-4 mr-2" /> Rechnung erstellen
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => { setCancelId(c.id); setCancelDialogOpen(true); }}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" /> Kündigen
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
        <p className="text-sm text-muted-foreground text-center">
          Seite {meta.page} von {meta.total_pages} ({meta.total} Verträge)
        </p>
      )}

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vertrag kündigen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Kündigungsdatum</Label>
              <Input
                type="date"
                value={cancelDate}
                onChange={(e) => setCancelDate(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Das effektive Enddatum wird basierend auf der Kündigungsfrist berechnet.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? 'Wird gekündigt...' : 'Kündigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
