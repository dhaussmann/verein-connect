import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, Calendar, Receipt, TrendingUp } from 'lucide-react';
import { useMembers, useEvents, useAuditLog } from '@/hooks/use-api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: membersData } = useMembers({ per_page: '1' });
  const totalMembers = membersData?.meta?.total ?? null;
  const { data: eventsData } = useEvents({ per_page: '5' });
  const events = eventsData?.data ?? [];
  const { data: auditData } = useAuditLog({ per_page: '8' });
  const activities = (auditData?.data ?? []) as any[];

  const kpis = useMemo(() => [
    { label: 'Aktive Mitglieder', value: totalMembers !== null ? String(totalMembers) : '–', sub: 'Aus der Datenbank', icon: Users, trend: true, highlight: true },
    { label: 'Kurse / Events', value: String(eventsData?.meta?.total ?? '–'), sub: 'Gesamt', icon: GraduationCap },
    { label: 'Nächster Termin', value: events.length > 0 ? new Date(events[0].startDate).toLocaleDateString('de-DE') : '–', sub: events.length > 0 ? events[0].title : 'Keine Termine', icon: Calendar },
    { label: 'Letzte Aktion', value: activities.length > 0 ? activities[0].action.slice(0, 20) : '–', sub: activities.length > 0 ? activities[0].user : '', icon: Receipt },
  ], [totalMembers, eventsData, events, activities]);

  const monthNames = ['', 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  return (
    <div>
      <PageHeader title="Dashboard" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <Card key={k.label} className={`shadow-sm ${k.highlight ? 'bg-primary-lightest' : 'bg-popover'}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-semibold">{k.value}</p>
                  <p className={`text-xs flex items-center gap-1 ${k.trend ? 'text-success' : 'text-muted-foreground'}`}>
                    {k.trend && <TrendingUp className="h-3 w-3" />}
                    {k.sub}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-popover/80 flex items-center justify-center">
                  <k.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Middle: Events + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Upcoming Events */}
        <Card className="lg:col-span-2 bg-popover shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Kommende Termine</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Keine kommenden Termine.</p>
            ) : (
              <div className="divide-y divide-border">
                {events.map((ev) => {
                  const d = new Date(ev.startDate);
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = d.getMonth() + 1;
                  return (
                    <div key={ev.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/events/${ev.id}`)}>
                      <div className="w-12 h-12 rounded-lg bg-accent flex flex-col items-center justify-center shrink-0">
                        <span className="text-sm font-semibold leading-none text-primary">{day}</span>
                        <span className="text-xs text-primary/70">{monthNames[month]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">{ev.timeStart} Uhr · {ev.eventType}</p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {ev.participants}/{ev.maxParticipants}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-popover shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Letzte Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Keine Aktivitäten vorhanden.</p>
            ) : (
              <div className="divide-y divide-border">
                {activities.map((a: any) => {
                  const initials = a.user ? a.user.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : '??';
                  const timeAgo = a.timestamp ? new Date(a.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
                  return (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-primary-foreground text-xs font-semibold">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{a.user}</span>{' '}
                          <span className="text-muted-foreground">{a.action}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
