import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Clock, MapPin, Trophy } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { todayEvents, topAttendees, courseAttendanceRates } from '@/data/attendanceData';

const COLORS = ['hsl(207,62%,28%)', 'hsl(207,62%,47%)', 'hsl(207,73%,91%)'];

export default function Attendance() {
  const [dateFilter, setDateFilter] = useState('today');
  const navigate = useNavigate();
  const overallRate = 82;

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

      {/* Today's Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {todayEvents.map((event) => {
          const pct = event.totalParticipants > 0 ? (event.checkedIn / event.totalParticipants) * 100 : 0;
          return (
            <Card key={event.id} className="border border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{event.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="h-3.5 w-3.5" /> {event.time}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {event.location}
                    </div>
                  </div>
                  <Badge variant={event.isActive ? 'default' : 'secondary'}
                    className={event.isActive ? 'bg-success text-success-foreground' : ''}>
                    {event.isActive ? 'Aktiv' : 'Ausstehend'}
                  </Badge>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Anwesend</span>
                    <span className="font-medium">{event.checkedIn}/{event.totalParticipants}</span>
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

      {/* Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <Card className="border border-border">
          <CardHeader><CardTitle className="text-base">Durchschn. Anwesenheitsquote</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <div className="relative">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={[{ value: overallRate }, { value: 100 - overallRate }]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} startAngle={90} endAngle={-270} dataKey="value">
                    <Cell fill="hsl(207,62%,28%)" />
                    <Cell fill="hsl(210,10%,85%)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{overallRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Attendees */}
        <Card className="border border-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-warning" /> Top 5 Anwesenheit</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topAttendees.map((a, i) => (
              <div key={a.memberId} className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}.</span>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary-lightest text-primary text-xs">{a.initials}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium">{a.name}</span>
                <span className="text-sm font-semibold text-success">{a.rate}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="border border-border">
          <CardHeader><CardTitle className="text-base">Anwesenheit nach Kurs</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={courseAttendanceRates} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="course" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="rate" fill="hsl(207,62%,28%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
