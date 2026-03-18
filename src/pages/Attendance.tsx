import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Clock, MapPin } from 'lucide-react';
import { useEvents } from '@/hooks/use-api';

export default function Attendance() {
  const [dateFilter, setDateFilter] = useState('today');
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: eventsData, isLoading } = useEvents({ date: todayStr, per_page: '50' });
  const todayEvents = eventsData?.data ?? [];

  return (
    <div>
      <PageHeader title="Anwesenheit">
        <div className="mt-4">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Heute</SelectItem>
              <SelectItem value="week">Diese Woche</SelectItem>
              <SelectItem value="month">Diesen Monat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Termine werden geladen...</div>
      )}

      {!isLoading && todayEvents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">Heute keine Termine vorhanden.</div>
      )}

      {/* Today's Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {todayEvents.map((event: any) => {
          const pct = event.maxParticipants > 0 ? (event.participants / event.maxParticipants) * 100 : 0;
          return (
            <Card key={event.id} className="border border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{event.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="h-3.5 w-3.5" /> {event.timeStart}–{event.timeEnd}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {event.location}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {event.status}
                  </Badge>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Teilnehmer</span>
                    <span className="font-medium">{event.participants}/{event.maxParticipants}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
                <Button className="w-full" onClick={() => navigate(`/attendance/${event.id}`)}>
                  Check-In starten
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistics placeholder */}
      <Card className="border border-border">
        <CardHeader><CardTitle className="text-base">Statistiken</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm py-8 text-center">Anwesenheitsstatistiken werden bei ausreichend erfassten Daten angezeigt.</p>
        </CardContent>
      </Card>
    </div>
  );
}
