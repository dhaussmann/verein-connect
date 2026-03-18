import { Receipt, Play, AlertCircle, CheckCircle } from 'lucide-react';
import { useBillingSchedule, useBillingRun } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

export default function ContractBilling() {
  const { data, isLoading, refetch } = useBillingSchedule();
  const billingRun = useBillingRun();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);

  const schedule = data;
  const contracts = schedule?.contracts || [];

  const handleRun = async () => {
    try {
      const res = await billingRun.mutateAsync();
      setResult(res);
      setConfirmOpen(false);
      toast.success(`${res.created} Rechnungen erstellt`);
      refetch();
    } catch (e: any) {
      toast.error(e.message || 'Fehler beim Abrechnungslauf');
    }
  };

  const periodMap: Record<string, string> = {
    MONTHLY: 'Monatlich', QUARTERLY: 'Vierteljährlich', HALF_YEARLY: 'Halbjährlich', YEARLY: 'Jährlich',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Abrechnung</h1>
          <p className="text-muted-foreground">Abrechnungslauf durchführen und ausstehende Rechnungen verwalten</p>
        </div>
        <Button onClick={() => setConfirmOpen(true)} disabled={billingRun.isPending || contracts.length === 0}>
          <Play className="h-4 w-4 mr-2" />
          Abrechnungslauf starten
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{schedule?.pendingContracts || 0}</p>
                <p className="text-xs text-muted-foreground">Ausstehende Verträge</p>
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
                <p className="text-2xl font-bold">
                  {contracts.reduce((sum: number, c: any) => sum + (c.currentPrice || 0), 0).toFixed(2)} €
                </p>
                <p className="text-xs text-muted-foreground">Erwarteter Rechnungsbetrag</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{schedule?.settings?.invoicePublishMode === 'AUTO_PUBLISH' ? 'Auto' : 'Entwurf'}</p>
                <p className="text-xs text-muted-foreground">Veröffentlichungsmodus</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Contracts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ausstehende Abrechnungen</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Laden...</div>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Alle Verträge sind aktuell abgerechnet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Vertragsnr.</th>
                    <th className="text-left p-3 font-medium">Preis</th>
                    <th className="text-left p-3 font-medium">Zeitraum</th>
                    <th className="text-left p-3 font-medium">Bezahlt bis</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c: any) => (
                    <tr key={c.contractId} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{c.contractNumber}</td>
                      <td className="p-3 font-medium">{(c.currentPrice || 0).toFixed(2)} €</td>
                      <td className="p-3">{periodMap[c.billingPeriod] || c.billingPeriod}</td>
                      <td className="p-3 text-xs">
                        {c.paidUntil ? new Date(c.paidUntil).toLocaleDateString('de-DE') : 'Nie'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Result */}
      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base">Letztes Ergebnis</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium">{result.created} Rechnungen erstellt</span>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrechnungslauf bestätigen</DialogTitle></DialogHeader>
          <div className="py-4 space-y-2">
            <p className="text-sm">
              Es werden <strong>{contracts.length} Rechnungen</strong> erstellt für einen Gesamtbetrag von{' '}
              <strong>{contracts.reduce((sum: number, c: any) => sum + (c.currentPrice || 0), 0).toFixed(2)} €</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Modus: {schedule?.settings?.invoicePublishMode === 'AUTO_PUBLISH' ? 'Rechnungen werden automatisch versendet' : 'Rechnungen werden als Entwurf erstellt'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Abbrechen</Button>
            <Button onClick={handleRun} disabled={billingRun.isPending}>
              {billingRun.isPending ? 'Wird ausgeführt...' : 'Abrechnungslauf starten'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
