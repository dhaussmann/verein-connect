import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Calendar, MapPin, Clock, Users } from 'lucide-react';
import { useMyEvents } from '@/hooks/use-api';

export default function MyCourses() {
  const { data: events, isLoading } = useMyEvents();

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      'Aktiv': 'bg-success/10 text-success border-success/30',
      'Entwurf': 'bg-muted text-muted-foreground',
      'Abgeschlossen': 'bg-muted text-muted-foreground',
      'Abgesagt': 'bg-destructive/10 text-destructive border-destructive/30',
    };
    return map[s] || '';
  };

  return (
    <div>
      <PageHeader title="Meine Kurse & Anmeldungen" />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Kurse werden geladen...</div>
      ) : !events || events.length === 0 ? (
        <Card className="border border-border">
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Du bist noch für keinen Kurs angemeldet.</p>
            <p className="text-sm text-muted-foreground mt-1">Sobald du dich für Kurse oder Termine anmeldest, erscheinen sie hier.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <Card key={event.id} className="border border-border hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                      {event.eventType === 'course' ? (
                        <GraduationCap className="h-5 w-5 text-primary" />
                      ) : (
                        <Calendar className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {event.startDate ? new Date(event.startDate).toLocaleDateString('de-DE') : ''}
                          {event.timeStart && ` · ${event.timeStart}`}
                          {event.timeEnd && ` – ${event.timeEnd}`}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {event.location}
                          </span>
                        )}
                        {event.maxParticipants && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" /> {event.participants}/{event.maxParticipants}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className={statusColor(event.status)}>{event.status}</Badge>
                    <Badge variant="secondary" className="text-xs">
                      {event.eventType === 'course' ? 'Kurs' : event.eventType === 'recurring' ? 'Serie' : 'Einzeltermin'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
