import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Receipt, TrendingUp, AlertTriangle, Plus, MoreHorizontal, FileDown, Mail, Ban, CheckCircle, Search, Trash2 } from 'lucide-react';
import { useInvoices, useAccounting, useMarkInvoicePaid, useDeleteInvoice, useCreateAccountingEntry } from '@/hooks/use-api';
import type { Invoice } from '@/lib/api';
import { toast } from 'sonner';

const accountingCategories = [
  'Mitgliedsbeiträge', 'Kursgebühren', 'Sponsoring', 'Veranstaltungen',
  'Hallenmiete', 'Material', 'Versicherung', 'Personal', 'Sonstiges',
];

export default function Finance() {
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({ date: '', type: '', category: '', description: '', amount: '' });

  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({ per_page: '200' });
  const invoices = invoicesData?.data ?? [];
  const summary = (invoicesData as any)?.summary ?? { total_open: 0, total_paid: 0, total_overdue: 0 };

  const { data: accountingData } = useAccounting();
  const acctEntries = (accountingData as any)?.entries ?? [];
  const acctSummary = (accountingData as any)?.summary ?? { income: 0, expense: 0, balance: 0 };

  const markPaid = useMarkInvoicePaid();
  const deleteInvoice = useDeleteInvoice();
  const createEntry = useCreateAccountingEntry();

  const fmt = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €';

  const filteredInvoices = useMemo(() => invoices.filter((i: Invoice) =>
    (invoiceFilter === 'all' || i.status === invoiceFilter) &&
    (i.number.toLowerCase().includes(invoiceSearch.toLowerCase()) || i.memberName.toLowerCase().includes(invoiceSearch.toLowerCase()))
  ), [invoices, invoiceFilter, invoiceSearch]);

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      'Bezahlt': 'bg-success/10 text-success border-success/30',
      'Gesendet': 'bg-primary/10 text-primary border-primary/30',
      'Überfällig': 'bg-destructive/10 text-destructive border-destructive/30',
      'Entwurf': 'bg-muted text-muted-foreground',
      'Storniert': 'bg-muted text-muted-foreground line-through',
    };
    return map[s] || '';
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await markPaid.mutateAsync(id);
      toast.success('Rechnung als bezahlt markiert');
    } catch { toast.error('Fehler beim Markieren'); }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Rechnung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    try {
      await deleteInvoice.mutateAsync(id);
      toast.success('Rechnung gelöscht');
      setDetailInvoice(null);
    } catch { toast.error('Fehler beim Löschen'); }
  };

  const handleCreateEntry = async () => {
    try {
      await createEntry.mutateAsync({
        entry_date: entryForm.date,
        type: entryForm.type === 'Einnahme' ? 'income' : 'expense',
        category: entryForm.category,
        description: entryForm.description,
        amount: parseFloat(entryForm.amount) || 0,
      });
      toast.success('Buchungseintrag erstellt');
      setNewEntryOpen(false);
      setEntryForm({ date: '', type: '', category: '', description: '', amount: '' });
    } catch { toast.error('Fehler beim Erstellen'); }
  };

  return (
    <div>
      <PageHeader title="Finanzen" action={<Button><Plus className="h-4 w-4 mr-2" /> Neue Rechnung</Button>} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><Receipt className="h-5 w-5 text-warning" /></div>
            <div><p className="text-sm text-muted-foreground">Offene Rechnungen</p><p className="text-xl font-bold text-warning">{fmt(summary.total_open)}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><CheckCircle className="h-5 w-5 text-success" /></div>
            <div><p className="text-sm text-muted-foreground">Bezahlt</p><p className="text-xl font-bold text-success">{fmt(summary.total_paid)}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-sm text-muted-foreground">Überfällig</p><p className="text-xl font-bold text-destructive">{fmt(summary.total_overdue)}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Gesamt</p><p className="text-xl font-bold">{fmt(summary.total_open + summary.total_paid + summary.total_overdue)}</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList className="mb-6">
          <TabsTrigger value="invoices">Rechnungen</TabsTrigger>
          <TabsTrigger value="accounting">Buchhaltung</TabsTrigger>
        </TabsList>

        {/* RECHNUNGEN */}
        <TabsContent value="invoices">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechnungsnr. oder Name..." value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="Entwurf">Entwurf</SelectItem>
                <SelectItem value="Gesendet">Gesendet</SelectItem>
                <SelectItem value="Bezahlt">Bezahlt</SelectItem>
                <SelectItem value="Überfällig">Überfällig</SelectItem>
                <SelectItem value="Storniert">Storniert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="border border-border">
            {invoicesLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Rechnungen werden geladen...</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Keine Rechnungen vorhanden.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rechnungsnr.</TableHead>
                    <TableHead>Mitglied</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Fällig</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv: Invoice, i: number) => (
                    <TableRow key={inv.id} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <button className="text-primary hover:underline font-medium" onClick={() => setDetailInvoice(inv)}>{inv.number}</button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary-lightest text-primary text-xs">{inv.memberInitials}</AvatarFallback></Avatar>
                          <span className="text-sm">{inv.memberName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{inv.date}</TableCell>
                      <TableCell className="text-muted-foreground">{inv.dueDate}</TableCell>
                      <TableCell className="text-right font-medium">{inv.amount}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColor(inv.status)}>{inv.status}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><FileDown className="h-4 w-4 mr-2" /> PDF herunterladen</DropdownMenuItem>
                            <DropdownMenuItem><Mail className="h-4 w-4 mr-2" /> Mahnung senden</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkPaid(inv.id)}><CheckCircle className="h-4 w-4 mr-2" /> Bezahlt markieren</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive"><Ban className="h-4 w-4 mr-2" /> Stornieren</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteInvoice(inv.id)}><Trash2 className="h-4 w-4 mr-2" /> Löschen</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* BUCHHALTUNG */}
        <TabsContent value="accounting">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="border border-border"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Einnahmen</p><p className="text-xl font-bold text-success">{fmt(acctSummary.income)}</p></CardContent></Card>
            <Card className="border border-border"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Ausgaben</p><p className="text-xl font-bold text-destructive">{fmt(acctSummary.expense)}</p></CardContent></Card>
            <Card className="border border-border"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Saldo</p><p className={`text-xl font-bold ${acctSummary.balance >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(acctSummary.balance)}</p></CardContent></Card>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Buchungseinträge</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><FileDown className="h-4 w-4 mr-2" /> Excel Export</Button>
              <Button size="sm" onClick={() => setNewEntryOpen(true)}><Plus className="h-4 w-4 mr-2" /> Neuer Eintrag</Button>
            </div>
          </div>

          <Card className="border border-border">
            {acctEntries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Keine Buchungseinträge vorhanden.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acctEntries.map((e: any, i: number) => (
                    <TableRow key={e.id} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                      <TableCell className="text-muted-foreground">{e.date}</TableCell>
                      <TableCell><Badge variant="outline" className={e.type === 'Einnahme' ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}>{e.type}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                      <TableCell>{e.description}</TableCell>
                      <TableCell className={`text-right font-medium ${e.type === 'Einnahme' ? 'text-success' : 'text-destructive'}`}>{e.type === 'Ausgabe' ? '-' : '+'}{e.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!detailInvoice} onOpenChange={() => setDetailInvoice(null)}>
        <DialogContent className="max-w-2xl">
          {detailInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>Rechnung {detailInvoice.number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <div><p className="font-medium">{detailInvoice.memberName}</p></div>
                  <div className="text-right"><p>Rechnungsnr.: {detailInvoice.number}</p><p className="text-muted-foreground">Datum: {detailInvoice.date}</p></div>
                </div>
                {detailInvoice.positions && detailInvoice.positions.length > 0 && (
                  <Table>
                    <TableHeader><TableRow><TableHead>Beschreibung</TableHead><TableHead className="text-center">Menge</TableHead><TableHead className="text-right">Einzelpreis</TableHead><TableHead className="text-right">Gesamt</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detailInvoice.positions.map((p, i) => (
                        <TableRow key={i}><TableCell>{p.description}</TableCell><TableCell className="text-center">{p.quantity}</TableCell><TableCell className="text-right">{p.unitPrice}</TableCell><TableCell className="text-right">{p.total}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="text-right space-y-1 text-sm border-t border-border pt-3">
                  <p className="text-lg font-bold">Gesamt: {detailInvoice.amount}</p>
                </div>
                {detailInvoice.timeline && detailInvoice.timeline.length > 0 && (
                  <div className="flex items-center gap-4 text-sm">
                    {detailInvoice.timeline.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${t.date ? 'bg-success' : 'bg-border'}`} />
                        <div><p className="font-medium">{t.step}</p>{t.date && <p className="text-xs text-muted-foreground">{t.date}</p>}</div>
                        {i < detailInvoice.timeline.length - 1 && <div className="h-px w-8 bg-border" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline"><FileDown className="h-4 w-4 mr-2" /> PDF</Button>
                <Button variant="outline"><Mail className="h-4 w-4 mr-2" /> Per E-Mail senden</Button>
                <Button onClick={() => { handleMarkPaid(detailInvoice.id); setDetailInvoice(null); }}><CheckCircle className="h-4 w-4 mr-2" /> Als bezahlt markieren</Button>
                <Button variant="destructive" onClick={() => handleDeleteInvoice(detailInvoice.id)}><Trash2 className="h-4 w-4 mr-2" /> Löschen</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Entry Dialog */}
      <Dialog open={newEntryOpen} onOpenChange={setNewEntryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neuer Buchungseintrag</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Datum</label><Input type="date" value={entryForm.date} onChange={e => setEntryForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Typ</label>
              <Select value={entryForm.type} onValueChange={v => setEntryForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                <SelectContent><SelectItem value="Einnahme">Einnahme</SelectItem><SelectItem value="Ausgabe">Ausgabe</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">Kategorie</label>
              <Select value={entryForm.category} onValueChange={v => setEntryForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Kategorie" /></SelectTrigger>
                <SelectContent>{accountingCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">Beschreibung</label><Input placeholder="Beschreibung..." value={entryForm.description} onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Betrag (€)</label><Input type="number" step="0.01" placeholder="0,00" value={entryForm.amount} onChange={e => setEntryForm(f => ({ ...f, amount: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setNewEntryOpen(false)}>Abbrechen</Button><Button onClick={handleCreateEntry} disabled={createEntry.isPending}>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
