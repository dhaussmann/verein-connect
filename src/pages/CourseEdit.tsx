import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useEvent, useUpdateEvent, useMembers, useGroups } from '@/hooks/use-api';
import { toast } from 'sonner';

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function CourseEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: course, isLoading } = useEvent(id);
  const updateEvent = useUpdateEvent();

  const [eventType, setEventType] = useState('Einmalig');
  const [costEnabled, setCostEnabled] = useState(false);
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [autoInvoice, setAutoInvoice] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [showHomepage, setShowHomepage] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const { data: membersData } = useMembers({ per_page: '200' });
  const trainers = (membersData?.data ?? []).filter(m => m.roles?.includes('Trainer') || m.roles?.includes('trainer'));
  const { data: groupsData } = useGroups();
  const groups = (groupsData as any)?.data ?? groupsData ?? [];
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const toggleGroup = (gid: string) => {
    setSelectedGroupIds(prev => prev.includes(gid) ? prev.filter(g => g !== gid) : [...prev, gid]);
  };

  const [category, setCategory] = useState('Training');
  const [trainerId, setTrainerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [timeStart, setTimeStart] = useState('18:00');
  const [timeEnd, setTimeEnd] = useState('19:30');
  const [maxParticipants, setMaxParticipants] = useState('20');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('draft');

  // Pre-fill form when course data loads
  useEffect(() => {
    if (!course) return;
    setTitle(course.title || '');
    setDescription(course.description || '');
    setLocation(course.location || '');
    setTimeStart(course.timeStart || '');
    setTimeEnd(course.timeEnd || '');
    setMaxParticipants(String(course.maxParticipants || ''));
    setPrice(String(course.price || ''));
    setCategory(course.category || 'Training');
    setIsPublic(!!course.isPublic);
    setAutoInvoice(!!course.autoInvoice);
    setCostEnabled(!!(course.price && Number(course.price) > 0));
    if (course.weekdays?.length) setSelectedDays(course.weekdays);
    if (course.groupIds?.length) setSelectedGroupIds(course.groupIds);
    if (course.startDate) {
      // Handle both YYYY-MM-DD and dd.MM.yyyy
      const d = course.startDate.includes('-')
        ? new Date(course.startDate + 'T00:00:00')
        : (() => { const p = course.startDate.split('.'); return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])); })();
      if (!isNaN(d.getTime())) setStartDate(d);
    }
    if (course.endDate) {
      const d = course.endDate.includes('-')
        ? new Date(course.endDate + 'T00:00:00')
        : (() => { const p = course.endDate.split('.'); return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])); })();
      if (!isNaN(d.getTime())) setEndDate(d);
    }
    // Map event type
    if (course.eventType === 'single') setEventType('Einmalig');
    else if (course.eventType === 'recurring') setEventType('Wiederkehrend');
    else if (course.eventType === 'course') setEventType('Kurs-Serie');
    // Map status
    const statusMap: Record<string, string> = { 'Aktiv': 'active', 'Entwurf': 'draft', 'Abgeschlossen': 'completed', 'Abgesagt': 'cancelled' };
    setStatus(statusMap[course.status] || course.status || 'draft');
    // Leaders
    if (course.leaders?.length) setTrainerId(course.leaders[0].userId);
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const payload: Record<string, any> = {
        title,
        description,
        location,
        time_start: timeStart,
        time_end: timeEnd,
        max_participants: Number(maxParticipants) || 0,
        auto_invoice: autoInvoice,
        is_public: isPublic,
        status,
      };
      if (startDate) payload.start_date = startDate.toISOString().slice(0, 10);
      if (endDate) payload.end_date = endDate.toISOString().slice(0, 10);
      if (costEnabled && price) payload.fee_amount = Number(price);
      await updateEvent.mutateAsync({ id, data: payload as any });
      toast.success('Training wurde aktualisiert!');
      navigate(`/courses/${id}`);
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Speichern');
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Training wird geladen...</div>;
  }

  return (
    <div>
      <Button variant="ghost" className="mb-4 text-muted-foreground" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />Zurück
      </Button>
      <PageHeader title="Training bearbeiten" />

      <form onSubmit={handleSubmit}>
        <div className="space-y-6 max-w-3xl">
          {/* Section 1: Grunddaten */}
          <Card>
            <CardHeader><CardTitle>Grunddaten</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel *</Label>
                  <Input id="title" placeholder="z.B. Judo-Anfänger" required value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Training">Training</SelectItem>
                      <SelectItem value="Spiel">Spiel</SelectItem>
                      <SelectItem value="Event">Event</SelectItem>
                      <SelectItem value="Rookies">Rookies</SelectItem>
                      <SelectItem value="Laufschule">Laufschule</SelectItem>
                      <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Einmalig">Einmalig</SelectItem>
                    <SelectItem value="Wiederkehrend">Wiederkehrend</SelectItem>
                    <SelectItem value="Kurs-Serie">Serie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea placeholder="Beschreibung eingeben..." rows={4} value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Entwurf</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="completed">Abgeschlossen</SelectItem>
                    <SelectItem value="cancelled">Abgesagt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Zeitplan */}
          <Card>
            <CardHeader><CardTitle>Zeitplan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {eventType === 'Einmalig' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start-Datum</Label>
                    <DatePicker date={startDate} onSelect={setStartDate} />
                  </div>
                  <div className="space-y-2">
                    <Label>End-Datum</Label>
                    <DatePicker date={endDate} onSelect={setEndDate} />
                  </div>
                  <div className="space-y-2">
                    <Label>Startzeit</Label>
                    <Input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Endzeit</Label>
                    <Input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="mb-2 block">Wochentage</Label>
                    <div className="flex gap-2 flex-wrap">
                      {weekdays.map(d => (
                        <button key={d} type="button" onClick={() => toggleDay(d)}
                          className={cn('px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                            selectedDays.includes(d) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:bg-muted'
                          )}>{d}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Startzeit</Label><Input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Endzeit</Label><Input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Serienbeginn</Label><DatePicker date={startDate} onSelect={setStartDate} /></div>
                    <div className="space-y-2"><Label>Serienende</Label><DatePicker date={endDate} onSelect={setEndDate} /></div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Ort & Leitung */}
          <Card>
            <CardHeader><CardTitle>Ort & Leitung</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ort</Label>
                  <Input placeholder="z.B. Sporthalle A" value={location} onChange={e => setLocation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Trainer</Label>
                  <Select value={trainerId} onValueChange={setTrainerId}>
                    <SelectTrigger><SelectValue placeholder="Trainer auswählen" /></SelectTrigger>
                    <SelectContent>
                      {trainers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Teilnehmer */}
          <Card>
            <CardHeader><CardTitle>Teilnehmer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max. Teilnehmer</Label>
                  <Input type="number" placeholder="20" min={1} value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Warteliste aktivieren</Label>
                <Switch checked={waitlistEnabled} onCheckedChange={setWaitlistEnabled} />
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Finanzen */}
          <Card>
            <CardHeader><CardTitle>Finanzen</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Kostenpflichtig</Label>
                <Switch checked={costEnabled} onCheckedChange={setCostEnabled} />
              </div>
              {costEnabled && (
                <>
                  <div className="space-y-2">
                    <Label>Betrag (€)</Label>
                    <Input type="number" step="0.01" placeholder="25,00" min={0} value={price} onChange={e => setPrice(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Automatische Rechnung</Label>
                    <Switch checked={autoInvoice} onCheckedChange={setAutoInvoice} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Section 6: Sichtbarkeit */}
          <Card>
            <CardHeader><CardTitle>Sichtbarkeit</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Öffentlich</Label>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Auf Homepage anzeigen</Label>
                <Switch checked={showHomepage} onCheckedChange={setShowHomepage} />
              </div>
            </CardContent>
          </Card>

          {/* Section: Mannschaft */}
          <Card>
            <CardHeader><CardTitle>Mannschaft</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Wähle mindestens eine Mannschaft aus, für die dieses Training gilt.</p>
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Keine Gruppen vorhanden.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {groups.map((g: any) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroup(g.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                        selectedGroupIds.includes(g.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end gap-3 pb-8">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Abbrechen</Button>
            <Button type="submit" disabled={updateEvent.isPending}>{updateEvent.isPending ? 'Speichern...' : 'Training speichern'}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function DatePicker({ date, onSelect }: { date?: Date; onSelect: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'dd.MM.yyyy', { locale: de }) : 'Datum wählen'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}
