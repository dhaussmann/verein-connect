import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, LayoutGrid, List, Clock, MapPin, Users, AlertCircle } from 'lucide-react';
import { useEvents } from '@/hooks/use-api';
import type { Event } from '@/lib/api';

const categoryBgClasses: Record<string, string> = {
  Training: 'bg-primary text-primary-foreground',
  Wettkampf: 'bg-destructive text-destructive-foreground',
  Lager: 'bg-success text-success-foreground',
  Workshop: 'bg-warning text-warning-foreground',
  Freizeit: 'bg-primary-light text-primary-foreground',
};

const statusStyles: Record<string, string> = {
  Aktiv: 'bg-success/10 text-success border-success/20',
  Entwurf: 'bg-muted text-muted-foreground border-border',
  Abgeschlossen: 'bg-primary-lightest text-primary border-primary/20',
  Abgesagt: 'bg-destructive/10 text-destructive border-destructive/20',
};

function participantPercent(c: Event) {
  return c.maxParticipants > 0 ? Math.round((c.participants / c.maxParticipants) * 100) : 0;
}

function progressColor(c: Event) {
  const p = participantPercent(c);
  if (p >= 100) return 'bg-destructive';
  if (p >= 80) return 'bg-warning';
  return 'bg-success';
}

export default function Courses() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const { data: eventsData, isLoading, error } = useEvents({ event_type: 'course', per_page: '200' });
  const courses: Event[] = eventsData?.data ?? [];

  const filtered = useMemo(() => {
    return courses.filter(c => {
      const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.instructorName.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === 'all' || c.category === catFilter;
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [search, catFilter, statusFilter, courses]);

  return (
    <div>
      <PageHeader
        title="Kurse"
        action={<Button onClick={() => navigate('/courses/new')}><Plus className="h-4 w-4 mr-2" />Neuer Kurs</Button>}
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Kurs oder Kursleiter suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Kategorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {['Training', 'Wettkampf', 'Lager', 'Workshop', 'Freizeit'].map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="Aktiv">Aktiv</SelectItem>
            <SelectItem value="Entwurf">Entwurf</SelectItem>
            <SelectItem value="Abgeschlossen">Abgeschlossen</SelectItem>
            <SelectItem value="Abgesagt">Abgesagt</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border border-border rounded-md overflow-hidden ml-auto">
          <Button variant={view === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setView('grid')} className="rounded-none"><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')} className="rounded-none"><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <CourseCard key={c.id} course={c} onClick={() => navigate(`/courses/${c.id}`)} />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kurs</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Kursleiter</TableHead>
                <TableHead>Zeitplan</TableHead>
                <TableHead>Teilnehmer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Preis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c, i) => (
                <TableRow key={c.id} className={`cursor-pointer hover:bg-muted/50 ${i % 2 === 1 ? 'bg-card' : ''}`} onClick={() => navigate(`/courses/${c.id}`)}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell><Badge variant="outline" className={categoryBgClasses[c.category] + ' text-xs'}>{c.category}</Badge></TableCell>
                  <TableCell>{c.instructorName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.schedule}</TableCell>
                  <TableCell>{c.participants}/{c.maxParticipants}</TableCell>
                  <TableCell><Badge variant="outline" className={statusStyles[c.status]}>{c.status}</Badge></TableCell>
                  <TableCell>{c.price ? `${c.price},00 €` : 'Kostenlos'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Kurse werden geladen...</div>
      )}
      {error && (
        <div className="text-center py-12 text-destructive">Fehler beim Laden: {error.message}</div>
      )}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">Keine Kurse gefunden.</div>
      )}
    </div>
  );
}

function CourseCard({ course: c, onClick }: { course: Event; onClick: () => void }) {
  const pct = participantPercent(c);
  const catColor = {
    Training: 'bg-primary',
    Wettkampf: 'bg-destructive',
    Lager: 'bg-success',
    Workshop: 'bg-warning',
    Freizeit: 'bg-primary-light',
  }[c.category];

  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex flex-col" onClick={onClick}>
      <div className={`h-1 ${catColor}`} />
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="outline" className={categoryBgClasses[c.category] + ' text-xs'}>{c.category}</Badge>
          <Badge variant="outline" className={statusStyles[c.status] + ' text-xs'}>{c.status}</Badge>
        </div>
        <h3 className="font-semibold text-foreground truncate mb-3">{c.title}</h3>

        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
          <Avatar className="h-6 w-6"><AvatarFallback className="text-xs bg-primary-lightest text-primary">{c.instructorInitials}</AvatarFallback></Avatar>
          <span>{c.instructorName}</span>
        </div>
        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /><span>{c.schedule}</span>
        </div>
        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /><span>{c.location}</span>
        </div>

        <div className="mt-auto">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-3.5 w-3.5" />{c.participants}/{c.maxParticipants} Plätze</span>
            <span className="text-xs text-muted-foreground">{pct}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${progressColor(c)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          {c.waitlist > 0 && (
            <p className="text-xs text-warning flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" />{c.waitlist} auf Warteliste</p>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onClick(); }}>Details</Button>
          {c.price ? <Badge variant="outline" className="bg-primary-lightest text-primary border-primary/20">{c.price},00 €</Badge> : <span className="text-xs text-muted-foreground">Kostenlos</span>}
        </div>
      </div>
    </Card>
  );
}
