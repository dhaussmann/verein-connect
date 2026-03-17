import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Search, QrCode, Camera } from 'lucide-react';
import { todayEvents, getCheckInParticipants, type AttendanceParticipant } from '@/data/attendanceData';

export default function AttendanceCheckIn() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = todayEvents.find(e => e.id === eventId) || todayEvents[0];

  const [participants, setParticipants] = useState<AttendanceParticipant[]>(() =>
    getCheckInParticipants(eventId || 'te1')
  );
  const [search, setSearch] = useState('');
  const [lastScan, setLastScan] = useState<string | null>(null);

  const filtered = useMemo(() =>
    participants.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [participants, search]
  );

  const counts = useMemo(() => ({
    anwesend: participants.filter(p => p.status === 'anwesend').length,
    total: participants.length,
  }), [participants]);

  const setStatus = (id: string, status: AttendanceParticipant['status']) => {
    setParticipants(prev => prev.map(p =>
      p.id === id ? { ...p, status, checkedInAt: status === 'anwesend' ? new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : p.checkedInAt } : p
    ));
  };

  const statusBg = (s: AttendanceParticipant['status']) => {
    if (s === 'anwesend') return 'bg-success/10';
    if (s === 'abwesend') return 'bg-destructive/10';
    if (s === 'entschuldigt') return 'bg-warning/10';
    return '';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{event.title}</h1>
          <p className="text-muted-foreground">{event.time} · {event.location}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">{counts.anwesend}/{counts.total}</div>
            <div className="text-xs text-muted-foreground">Anwesend</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="mb-4">
          <TabsTrigger value="list">Liste</TabsTrigger>
          <TabsTrigger value="qr">QR-Scan</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Teilnehmer suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="space-y-2">
            {filtered.map(p => (
              <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border border-border transition-colors ${statusBg(p.status)}`}>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary-lightest text-primary text-sm">{p.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{p.name}</div>
                  {p.checkedInAt && p.status === 'anwesend' && (
                    <span className="text-xs text-muted-foreground">Eingecheckt um {p.checkedInAt}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="lg" variant={p.status === 'anwesend' ? 'default' : 'outline'}
                    className={p.status === 'anwesend' ? 'bg-success hover:bg-success/90 text-success-foreground' : 'border-success text-success hover:bg-success/10'}
                    onClick={() => setStatus(p.id, 'anwesend')}>
                    <CheckCircle className="h-5 w-5" />
                  </Button>
                  <Button size="lg" variant={p.status === 'abwesend' ? 'default' : 'outline'}
                    className={p.status === 'abwesend' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : 'border-destructive text-destructive hover:bg-destructive/10'}
                    onClick={() => setStatus(p.id, 'abwesend')}>
                    <XCircle className="h-5 w-5" />
                  </Button>
                  <Button size="lg" variant={p.status === 'entschuldigt' ? 'default' : 'outline'}
                    className={p.status === 'entschuldigt' ? 'bg-warning hover:bg-warning/90 text-warning-foreground' : 'border-warning text-warning hover:bg-warning/10'}
                    onClick={() => setStatus(p.id, 'entschuldigt')}>
                    <Clock className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="qr">
          <Card className="border border-border mb-6">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <div className="w-full max-w-sm aspect-square bg-muted rounded-lg flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border">
                <Camera className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground text-center">QR-Scanner wird hier integriert<br /><span className="text-xs">Kamera-Zugriff erforderlich</span></p>
              </div>
              {lastScan ? (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Letzter Scan: <strong>{lastScan}</strong></span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Noch kein Scan durchgeführt</p>
              )}
              <Button variant="outline" onClick={() => {
                const p = participants.find(x => x.status === 'offen');
                if (p) {
                  setStatus(p.id, 'anwesend');
                  setLastScan(`${p.name} – Eingecheckt um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`);
                }
              }}>
                <QrCode className="h-4 w-4 mr-2" /> Scan simulieren
              </Button>
            </CardContent>
          </Card>

          <h3 className="font-semibold mb-3 text-foreground">Bereits eingecheckt</h3>
          <div className="space-y-2">
            {participants.filter(p => p.status === 'anwesend').map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-md bg-success/5">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary-lightest text-primary text-xs">{p.initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{p.name}</span>
                <Badge variant="outline" className="ml-auto text-success border-success text-xs">{p.checkedInAt}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
