import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, Calendar, Receipt } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const stats = [
  { label: 'Mitglieder', value: '248', change: '+12 diesen Monat', icon: Users, color: 'text-primary' },
  { label: 'Aktive Kurse', value: '16', change: '3 diese Woche', icon: GraduationCap, color: 'text-primary-light' },
  { label: 'Termine', value: '8', change: 'Nächste 7 Tage', icon: Calendar, color: 'text-success' },
  { label: 'Offene Rechnungen', value: '1.240,00 €', change: '5 überfällig', icon: Receipt, color: 'text-warning' },
];

const memberData = [
  { month: 'Jan', count: 210 }, { month: 'Feb', count: 218 }, { month: 'Mär', count: 225 },
  { month: 'Apr', count: 230 }, { month: 'Mai', count: 235 }, { month: 'Jun', count: 248 },
];

const categoryData = [
  { name: 'Erwachsene', value: 120 },
  { name: 'Jugend', value: 68 },
  { name: 'Kinder', value: 45 },
  { name: 'Senioren', value: 15 },
];

const COLORS = ['hsl(207,62%,28%)', 'hsl(207,62%,47%)', 'hsl(145,63%,32%)', 'hsl(48,90%,44%)'];

const recentActivity = [
  { text: 'Anna Schmidt wurde als Mitglied aufgenommen', time: 'Vor 2 Stunden' },
  { text: 'Kurs "Yoga Montag" hat 3 neue Teilnehmer', time: 'Vor 4 Stunden' },
  { text: 'Rechnung #2024-089 wurde bezahlt (45,00 €)', time: 'Gestern' },
  { text: 'Termin "Jahreshauptversammlung" erstellt', time: 'Gestern' },
  { text: 'Peter Weber hat seine Adresse aktualisiert', time: 'Vor 2 Tagen' },
];

export default function Dashboard() {
  return (
    <div>
      <PageHeader title="Dashboard" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="bg-popover shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-semibold mt-1">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.change}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 bg-popover shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Mitgliederentwicklung</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={memberData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,10%,85%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(212,15%,43%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(212,15%,43%)" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(207,62%,28%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-popover shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Altersgruppen</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-foreground">{c.name}: {c.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity */}
      <Card className="bg-popover shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Letzte Aktivitäten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
                <p className="text-sm">{a.text}</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
