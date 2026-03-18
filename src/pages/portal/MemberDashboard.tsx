import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, GraduationCap, ClipboardCheck, MapPin, Clock, ChevronRight } from 'lucide-react';
import { useMyDashboard } from '@/hooks/use-api';
import { useAuthStore } from '@/stores/authStore';

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data, isLoading } = useMyDashboard();

  const roleLabel = (r: string) => {
    const map: Record<string, string> = { org_admin: 'Admin', trainer: 'Trainer', member: 'Mitglied' };
    return map[r] || r;
  };

  return (
    <div>
      <PageHeader title={`Willkommen, ${user?.firstName || ''}!`} />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Daten werden geladen...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="border border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/portal/courses')}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data?.registeredEvents ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Meine Kurse</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <ClipboardCheck className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data?.attendanceRate ?? 0}%</p>
                  <p className="text-sm text-muted-foreground">Anwesenheitsquote</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Calendar className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data?.upcomingEvents?.length ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Nächste Termine</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Roles */}
          {data?.roles && data.roles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="text-sm text-muted-foreground self-center mr-1">Deine Rollen:</span>
              {data.roles.map(r => (
                <Badge key={r} variant="outline" className={r === 'org_admin' ? 'bg-primary/10 text-primary border-primary/30' : ''}>
                  {roleLabel(r)}
                </Badge>
              ))}
            </div>
          )}

          {/* Upcoming Events */}
          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Nächste Termine</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/portal/events')}>
                Alle anzeigen <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {(!data?.upcomingEvents || data.upcomingEvents.length === 0) ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Keine anstehenden Termine.</p>
              ) : (
                <div className="space-y-3">
                  {data.upcomingEvents.map(event => (
                    <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{event.title}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {event.startDate ? new Date(event.startDate).toLocaleDateString('de-DE') : ''} {event.timeStart && `· ${event.timeStart}`}{event.timeEnd && ` – ${event.timeEnd}`}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <Button variant="outline" className="h-auto py-4 justify-start" onClick={() => navigate('/portal/profile')}>
              <div className="text-left">
                <p className="font-medium">Mein Profil</p>
                <p className="text-xs text-muted-foreground">Persönliche Daten einsehen & bearbeiten</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start" onClick={() => navigate('/portal/courses')}>
              <div className="text-left">
                <p className="font-medium">Meine Kurse</p>
                <p className="text-xs text-muted-foreground">Angemeldete Kurse & Termine</p>
              </div>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
