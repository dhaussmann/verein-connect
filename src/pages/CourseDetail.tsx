import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Clock, MapPin, Users, Euro, Edit, MoreHorizontal, Check, X, Minus, UserPlus } from 'lucide-react';
import { courses, getCourseParticipants, getCourseAttendanceMatrix, categoryBgClasses } from '@/data/courseEventData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  const course = courses.find(c => c.id === id);
  const [tab, setTab] = useState('info');

  if (!course) {
    return <div className="text-center py-12 text-muted-foreground">Kurs nicht gefunden.</div>;
  }

  const participants = getCourseParticipants(course.id);
  const attendance = getCourseAttendanceMatrix(course.id);
  const pct = Math.round((course.participants / course.maxParticipants) * 100);
  const isFull = pct >= 100;

  const registrationData = [
    { month: 'Jan', count: 4 }, { month: 'Feb', count: 7 }, { month: 'Mär', count: course.participants },
  ];
  const ageData = [
    { name: 'U18', value: 35 }, { name: '18-30', value: 25 }, { name: '30-50', value: 30 }, { name: '50+', value: 10 },
  ];
  const pieColors = ['hsl(207,62%,28%)', 'hsl(207,62%,47%)', 'hsl(145,63%,32%)', 'hsl(48,90%,44%)'];

  return (
    <div>
      <Button variant="ghost" className="mb-4 text-muted-foreground" onClick={() => navigate('/courses')}>
        <ArrowLeft className="h-4 w-4 mr-2" />Zurück zu Kurse
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
                <div><p className="text-sm font-medium text-foreground">{course.instructorName}</p><p className="text-xs">Kursleiter</p></div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{course.schedule}</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{course.location}</span>
                <span className="flex items-center gap-1"><Users className="h-4 w-4" />{course.participants}/{course.maxParticipants}</span>
                {course.price && <span className="flex items-center gap-1"><Euro className="h-4 w-4" />{course.price},00 €</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {isFull ? (
                <Button variant="outline" className="border-warning text-warning hover:bg-warning/10"><UserPlus className="h-4 w-4 mr-2" />Auf Warteliste</Button>
              ) : (
                <Button><UserPlus className="h-4 w-4 mr-2" />Anmelden</Button>
              )}
              <Button variant="outline"><Edit className="h-4 w-4 mr-2" />Bearbeiten</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Kurs duplizieren</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Kurs absagen</DropdownMenuItem>
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
                <div className="flex justify-between"><span className="text-muted-foreground">Öffentlich</span><span className="font-medium">{course.isPublic ? 'Ja' : 'Nein'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Auto-Rechnung</span><span className="font-medium">{course.autoInvoice ? 'Ja' : 'Nein'}</span></div>
                {course.weekdays && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Tage</span><span className="font-medium">{course.weekdays.join(', ')}</span></div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="participants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Teilnehmer ({participants.length})</CardTitle>
              <Button size="sm" variant="outline">Liste exportieren</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Anmeldedatum</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((p, i) => (
                    <TableRow key={p.id} className={i % 2 === 1 ? 'bg-card' : ''}>
                      <TableCell className="flex items-center gap-2">
                        <Avatar className="h-7 w-7"><AvatarFallback className="text-xs bg-primary-lightest text-primary">{p.initials}</AvatarFallback></Avatar>
                        <span className="font-medium">{p.name}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.registrationDate}</TableCell>
                      <TableCell><Badge variant="outline" className={participantStatusStyles[p.status]}>{p.status}</Badge></TableCell>
                      <TableCell>{p.waitlistPosition ?? '–'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>Abmelden</DropdownMenuItem>
                            <DropdownMenuItem>Auf Warteliste setzen</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle>Anwesenheitsmatrix</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Teilnehmer</TableHead>
                    {attendance.dates.map(d => <TableHead key={d} className="text-center min-w-[60px]">{d}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.participants.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="flex items-center gap-2">
                        <Avatar className="h-6 w-6"><AvatarFallback className="text-xs bg-primary-lightest text-primary">{p.initials}</AvatarFallback></Avatar>
                        <span className="text-sm">{p.name}</span>
                      </TableCell>
                      {p.attendance.map((s, j) => (
                        <TableCell key={j} className="text-center cursor-pointer hover:bg-muted/50">
                          {s === 'present' && <Check className="h-4 w-4 text-success mx-auto" />}
                          {s === 'absent' && <X className="h-4 w-4 text-destructive mx-auto" />}
                          {s === 'excused' && <Minus className="h-4 w-4 text-warning mx-auto" />}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Anmeldungen über Zeit</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={registrationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,10%,85%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(207,62%,28%)" strokeWidth={2} dot={{ fill: 'hsl(207,62%,28%)' }} name="Anmeldungen" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Altersverteilung</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={ageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {ageData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
