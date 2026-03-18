import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardCheck, TrendingUp } from 'lucide-react';
import { useMyAttendance } from '@/hooks/use-api';

export default function MyEvents() {
  const { data, isLoading } = useMyAttendance();

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      'Anwesend': 'bg-success/10 text-success border-success/30',
      'Abwesend': 'bg-destructive/10 text-destructive border-destructive/30',
      'Entschuldigt': 'bg-warning/10 text-warning border-warning/30',
    };
    return map[s] || '';
  };

  return (
    <div>
      <PageHeader title="Meine Anwesenheit" />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Daten werden geladen...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="border border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data?.stats.total ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Erfasste Termine</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data?.stats.present ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Anwesend</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <ClipboardCheck className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data?.stats.rate ?? 0}%</p>
                  <p className="text-sm text-muted-foreground">Anwesenheitsquote</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Records */}
          <Card className="border border-border">
            <CardHeader><CardTitle className="text-base">Anwesenheits-Verlauf</CardTitle></CardHeader>
            <CardContent>
              {(!data?.records || data.records.length === 0) ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Noch keine Anwesenheitseinträge vorhanden.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Veranstaltung</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.map((record, i) => (
                      <TableRow key={record.id} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                        <TableCell className="text-muted-foreground text-sm">
                          {record.date ? new Date(record.date).toLocaleDateString('de-DE') : '–'}
                        </TableCell>
                        <TableCell className="font-medium">{record.eventTitle}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColor(record.status)}>{record.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
