import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package, Edit, ImageIcon } from 'lucide-react';
import { products, orders, productCategories } from '@/data/shopData';

export default function Shop() {
  const [productModalOpen, setProductModalOpen] = useState(false);

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      'Offen': 'bg-warning/10 text-warning border-warning/30',
      'Bezahlt': 'bg-primary/10 text-primary border-primary/30',
      'Versendet': 'bg-accent text-accent-foreground',
      'Abgeschlossen': 'bg-success/10 text-success border-success/30',
    };
    return map[s] || '';
  };

  return (
    <div>
      <PageHeader title="Webshop" action={<Button onClick={() => setProductModalOpen(true)}><Plus className="h-4 w-4 mr-2" /> Neues Produkt</Button>} />

      <Tabs defaultValue="products">
        <TabsList className="mb-6">
          <TabsTrigger value="products">Produkte</TabsTrigger>
          <TabsTrigger value="orders">Bestellungen</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => (
              <Card key={p.id} className="border border-border overflow-hidden">
                <div className="h-40 bg-muted flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{p.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                    </div>
                    <Badge variant="secondary">{p.price}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {p.stock === 0 ? (
                        <Badge variant="destructive">Ausverkauft</Badge>
                      ) : p.stock !== null ? (
                        <span className="text-muted-foreground">{p.stock} verfügbar</span>
                      ) : (
                        <span className="text-muted-foreground">Unbegrenzt</span>
                      )}
                      {p.membersOnly && <Badge variant="outline" className="text-xs">Nur Mitglieder</Badge>}
                    </div>
                    <Button variant="outline" size="sm"><Edit className="h-3.5 w-3.5 mr-1" /> Bearbeiten</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bestell-Nr.</TableHead>
                  <TableHead>Käufer</TableHead>
                  <TableHead>Produkte</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o, i) => (
                  <TableRow key={o.id} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                    <TableCell className="font-medium">{o.orderNumber}</TableCell>
                    <TableCell>{o.buyerName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {o.products.map((p, j) => <Badge key={j} variant="secondary" className="text-xs">{p}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{o.totalAmount}</TableCell>
                    <TableCell className="text-muted-foreground">{o.date}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(o.status)}>{o.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Modal */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neues Produkt</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Name</label><Input placeholder="Produktname" /></div>
            <div><label className="text-sm font-medium">Beschreibung</label><Textarea placeholder="Beschreibung..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Preis (€)</label><Input type="number" step="0.01" placeholder="0,00" /></div>
              <div><label className="text-sm font-medium">Kategorie</label>
                <Select><SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
                  <SelectContent>{productCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground cursor-pointer hover:bg-muted/50">
              <Package className="h-8 w-8 mx-auto mb-2" /><p className="text-sm">Bild hochladen</p>
            </div>
            <div><label className="text-sm font-medium">Lagerbestand</label><Input type="number" placeholder="Anzahl" /></div>
            <div className="flex items-center justify-between"><label className="text-sm font-medium">Nur für Mitglieder</label><Switch /></div>
            <div className="flex items-center justify-between"><label className="text-sm font-medium">Aktiv</label><Switch defaultChecked /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setProductModalOpen(false)}>Abbrechen</Button><Button>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
