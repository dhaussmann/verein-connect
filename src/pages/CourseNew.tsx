import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { members } from '@/data/mockData';
import { toast } from 'sonner';

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function CourseNew() {
  const navigate = useNavigate();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Kurs/Termin wurde erfolgreich erstellt!');
    navigate('/courses');
  };

  const trainers = members.filter(m => m.roles.includes('Trainer'));

  return (
    <div>
      <Button variant="ghost" className="mb-4 text-muted-foreground" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />Zurück
      </Button>
      <PageHeader title="Neuer Kurs / Termin" />

      <form onSubmit={handleSubmit}>
        <div className="space-y-6 max-w-3xl">
          {/* Section 1: Grunddaten */}
          <Card>
            <CardHeader><CardTitle>Grunddaten</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel *</Label>
                  <Input id="title" placeholder="z.B. Judo-Anfänger" required />
                </div>
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select defaultValue="Training">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Training">Training</SelectItem>
                      <SelectItem value="Wettkampf">Wettkampf</SelectItem>
                      <SelectItem value="Lager">Lager</SelectItem>
                      <SelectItem value="Workshop">Workshop</SelectItem>
                      <SelectItem value="Freizeit">Freizeit</SelectItem>
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
                    <SelectItem value="Kurs-Serie">Kurs-Serie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea placeholder="Kursbeschreibung eingeben..." rows={4} />
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
                    <Input type="time" defaultValue="18:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Endzeit</Label>
                    <Input type="time" defaultValue="19:30" />
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
                    <div className="space-y-2"><Label>Startzeit</Label><Input type="time" defaultValue="18:00" /></div>
                    <div className="space-y-2"><Label>Endzeit</Label><Input type="time" defaultValue="19:30" /></div>
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
                  <Input placeholder="z.B. Sporthalle A" />
                </div>
                <div className="space-y-2">
                  <Label>Kursleiter</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Kursleiter auswählen" /></SelectTrigger>
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
                  <Input type="number" placeholder="20" min={1} />
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
                    <Input type="number" step="0.01" placeholder="25,00" min={0} />
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

          <Separator />

          <div className="flex justify-end gap-3 pb-8">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Abbrechen</Button>
            <Button type="submit">Kurs erstellen</Button>
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
