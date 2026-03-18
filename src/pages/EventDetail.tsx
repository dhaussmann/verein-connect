import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, MapPin, Users, Edit } from 'lucide-react';
import { categoryBgClasses } from '@/data/courseEventData';
import { useEvent } from '@/hooks/use-api';

const statusBadge: Record<string, string> = {
  Offen: 'bg-success/10 text-success',
  Voll: 'bg-warning/10 text-warning',
  Abgesagt: 'bg-destructive/10 text-destructive',
};

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEvent(id);

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Termin wird geladen...</div>;
  }

  if (error || !event) {
    return <div className="text-center py-12 text-muted-foreground">Termin nicht gefunden.</div>;
  }

  return (
    <div>
      <Button variant="ghost" className="mb-4 text-muted-foreground" onClick={() => navigate('/events')}>
        <ArrowLeft className="h-4 w-4 mr-2" />Zurück zu Termine
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
                <Badge className={categoryBgClasses[event.category]}>{event.category}</Badge>
                <Badge variant="outline" className={statusBadge[event.status]}>{event.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{event.startDate}, {event.timeStart}–{event.timeEnd}</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{event.location}</span>
                <span className="flex items-center gap-1"><Users className="h-4 w-4" />{event.participants}/{event.maxParticipants} Teilnehmer</span>
              </div>
              {event.description && <p className="text-muted-foreground mt-2">{event.description}</p>}
            </div>
            <div className="flex gap-2">
              {event.status === 'Offen' && <Button>Anmelden</Button>}
              <Button variant="outline"><Edit className="h-4 w-4 mr-2" />Bearbeiten</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
