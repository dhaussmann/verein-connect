import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, Calendar, Receipt, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { upcomingEvents, recentActivities, memberGrowthData } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';

const kpis = [
  { label: 'Aktive Mitglieder', value: '247', sub: '+12 diesen Monat', icon: Users, trend: true, highlight: true },
  { label: 'Offene Kurse', value: '18', sub: '3 diese Woche', icon: GraduationCap },
  { label: 'Nächster Termin', value: 'Heute 18:00', sub: 'A-Jugend Training', icon: Calendar },
  { label: 'Offene Rechnungen', value: '2.450 €', sub: '14 ausstehend', icon: Receipt, warning: true },
];

const eventStatusClass = (s: string) =>
  s === 'Offen' ? 'bg-success/10 text-success' : s === 'Voll' ? 'bg-primary-lightest text-primary' : 'bg-destructive/10 text-destructive';

export default function Dashboard() {
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
                  <p className={`text-xs flex items-center gap-1 ${k.warning ? 'text-warning' : k.trend ? 'text-success' : 'text-muted-foreground'}`}>
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
            <div className="divide-y divide-border">
              {upcomingEvents.map((ev) => {
                const [day, month] = ev.date.split('.');
                const monthNames = ['', 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
                return (
                  <div key={ev.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-accent flex flex-col items-center justify-center shrink-0">
                      <span className="text-sm font-semibold leading-none text-primary">{day}</span>
                      <span className="text-xs text-primary/70">{monthNames[parseInt(month)]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">{ev.time} Uhr · {ev.type}</p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {ev.participants}/{ev.maxParticipants}
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${eventStatusClass(ev.status)}`}>
                      {ev.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-popover shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Letzte Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentActivities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-primary-foreground text-xs font-semibold">{a.initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{a.memberName}</span>{' '}
                      <span className="text-muted-foreground">{a.action}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Growth Chart */}
      <Card className="bg-popover shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Mitgliederentwicklung (letzte 12 Monate)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={memberGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,10%,85%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(212,15%,43%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(212,15%,43%)" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="newMembers" name="Neuanmeldungen" stroke="hsl(207,62%,28%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="departures" name="Abgänge" stroke="hsl(4,64%,46%)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
