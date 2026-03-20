import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Clock, MapPin, Users, Euro, Edit, MoreHorizontal, UserPlus, Trash2 } from 'lucide-react';
import { useEvent, useDeleteEvent } from '@/hooks/use-api';
import { toast } from 'sonner';

const categoryBgClasses: Record<string, string> = {
  Training: 'bg-primary text-primary-foreground',
  Spiel: 'bg-destructive text-destructive-foreground',
  Event: 'bg-success text-success-foreground',
  Rookies: 'bg-warning text-warning-foreground',
  Laufschule: 'bg-primary-light text-primary-foreground',
  Sonstiges: 'bg-muted text-muted-foreground',
};

const statusStyles: Record<string, string> = {
  Aktiv: 'bg-success/10 text-success',
  Entwurf: 'bg-muted text-muted-foreground',
  Abgeschlossen: 'bg-primary-lightest text-primary',
  Abgesagt: 'bg-destructive/10 text-destructive',
};

const participantStatusStyles: Record<string, string> = {
  Angemeldet: 'bg-success/10 text-success',
  Warteliste: 'bg-warning/10 text-warning',
  Abgesagt: 'bg-destructive/10 text-destructive',
};

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: course, isLoading, error } = useEvent(id);
  const deleteEvent = useDeleteEvent();
  const [tab, setTab] = useState('info');

  const handleDelete = async () => {
    if (!id || deleteEvent.isPending) return;
    if (!confirm('Training wirklich löschen?')) return;
    try {
      await deleteEvent.mutateAsync(id);
      toast.success('Training gelöscht');
      navigate('/courses');
    } catch (err: any) {
      if (err.status === 404) {
        toast.success('Training wurde bereits gelöscht');
        navigate('/courses');
      } else {
        toast.error(err.message || 'Fehler beim Löschen');
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Training wird geladen...</div>;
  }

  if (error || !course) {
    return <div className="text-center py-12 text-muted-foreground">Training nicht gefunden.</div>;
  }

  const pct = course.maxParticipants > 0 ? Math.round((course.participants / course.maxParticipants) * 100) : 0;
  const isFull = pct >= 100;

  return (
    <div>
      <Button variant="ghost" className="mb-4 text-muted-foreground" onClick={() => navigate('/courses')}>
        <ArrowLeft className="h-4 w-4 mr-2" />Zurück zu Training
      </Button>

      {/* Hero */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
                <Badge className={categoryBgClasses[course.category]}>{course.category}</Badge>
                <Badge variant="outline" className={statusStyles[course.status]}>{course.status}</Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary-lightest text-primary text-xs">{course.instructorInitials}</AvatarFallback></Avatar>
                <div><p className="text-sm font-medium text-foreground">{course.instructorName}</p><p className="text-xs">Trainer</p></div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {(course.timeStart || course.timeEnd) && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{course.timeStart}{course.timeEnd ? ` – ${course.timeEnd}` : ''}</span>}
                {course.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{course.location}</span>}
                <span className="flex items-center gap-1"><Users className="h-4 w-4" />{course.participants}/{course.maxParticipants}</span>
                {course.price && <span className="flex items-center gap-1"><Euro className="h-4 w-4" />{course.price},00 €</span>}
              </div>
              {course.groups?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {course.groups.map(g => <Badge key={g.id} variant="outline">{g.name}</Badge>)}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {isFull ? (
                <Button variant="outline" className="border-warning text-warning hover:bg-warning/10"><UserPlus className="h-4 w-4 mr-2" />Auf Warteliste</Button>
              ) : (
                <Button><UserPlus className="h-4 w-4 mr-2" />Anmelden</Button>
              )}
              <Button variant="outline" onClick={() => navigate(`/courses/${id}/edit`)}><Edit className="h-4 w-4 mr-2" />Bearbeiten</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Training duplizieren</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Training absagen</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); handleDelete(); }}><Trash2 className="h-4 w-4 mr-2" />Training löschen</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="participants">Teilnehmer</TabsTrigger>
          <TabsTrigger value="attendance">Anwesenheit</TabsTrigger>
          <TabsTrigger value="stats">Statistiken</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Beschreibung</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground leading-relaxed">{course.description}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Beginn</span><span className="font-medium">{course.startDate}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ende</span><span className="font-medium">{course.endDate}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ort</span><span className="font-medium">{course.location}</span></div>
                {(course.timeStart || course.timeEnd) && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Uhrzeit</span><span className="font-medium">{course.timeStart}{course.timeEnd ? ` – ${course.timeEnd}` : ''}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Öffentlich</span><span className="font-medium">{course.isPublic ? 'Ja' : 'Nein'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Auto-Rechnung</span><span className="font-medium">{course.autoInvoice ? 'Ja' : 'Nein'}</span></div>
                {course.weekdays?.length > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Tage</span><span className="font-medium">{course.weekdays.join(', ')}</span></div>
                )}
                {course.groups?.length > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Mannschaft</span><span className="font-medium">{course.groups.map(g => g.name).join(', ')}</span></div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="participants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Teilnehmer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm py-8 text-center">Teilnehmerdaten werden über die Anmeldungen verwaltet.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle>Anwesenheitsmatrix</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm py-8 text-center">Anwesenheitsdaten werden über den Anwesenheits-Bereich erfasst.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader><CardTitle>Statistiken</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm py-8 text-center">Statistiken werden bei ausreichend Daten automatisch angezeigt.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
