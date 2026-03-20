import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, List, Clock, MapPin, Users } from 'lucide-react';
import { useEventCalendar } from '@/hooks/use-api';

interface CalendarEvent {
  id: string;
  courseId?: string;
  title: string;
  date: string;
  endDate?: string;
  timeStart: string;
  timeEnd: string;
  category: string;
  location: string;
  participants: number;
  maxParticipants: number;
  status: string;
  description?: string;
  groups?: { id: string; name: string }[];
}

const categoryBgClasses: Record<string, string> = {
  Training: 'bg-primary text-primary-foreground',
  Spiel: 'bg-destructive text-destructive-foreground',
  Event: 'bg-success text-success-foreground',
  Rookies: 'bg-warning text-warning-foreground',
  Laufschule: 'bg-primary-light text-primary-foreground',
  Sonstiges: 'bg-muted text-muted-foreground',
};

const statusBadge: Record<string, string> = {
  Offen: 'bg-success/10 text-success',
  Voll: 'bg-warning/10 text-warning',
  Abgesagt: 'bg-destructive/10 text-destructive',
};

const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function parseDateStr(d: string) {
  const [day, month, year] = d.split('.').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateStr(day: number, month: number, year: number) {
  return `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
}

export default function Events() {
  const navigate = useNavigate();
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const { data: apiCalendarEvents } = useEventCalendar({ per_page: '200' });
  const calendarEvents: CalendarEvent[] = (apiCalendarEvents as CalendarEvent[] | undefined) ?? [];

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };
  const goToday = () => { const t = new Date(); setCurrentMonth(t.getMonth()); setCurrentYear(t.getFullYear()); };

  // Build calendar grid
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Monday=0
    const days: { day: number; inMonth: boolean; dateStr: string }[] = [];

    // Previous month padding
    const prevLast = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevLast - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({ day: d, inMonth: false, dateStr: formatDateStr(d, m, y) });
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ day: d, inMonth: true, dateStr: formatDateStr(d, currentMonth, currentYear) });
    }
    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({ day: d, inMonth: false, dateStr: formatDateStr(d, m, y) });
    }
    return days;
  }, [currentMonth, currentYear]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    calendarEvents.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [calendarEvents]);

  // List view: grouped by week
  const listGroups = useMemo(() => {
    const sorted = [...calendarEvents].sort((a, b) => parseDateStr(a.date).getTime() - parseDateStr(b.date).getTime());
    const groups: { label: string; events: CalendarEvent[] }[] = [];
    let currentWeek = '';
    sorted.forEach(ev => {
      const d = parseDateStr(ev.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const label = `KW – ${weekStart.getDate()}.${weekStart.getMonth() + 1}. bis ${weekStart.getDate() + 6}.${weekStart.getMonth() + 1}.${weekStart.getFullYear()}`;
      if (label !== currentWeek) {
        groups.push({ label, events: [] });
        currentWeek = label;
      }
      groups[groups.length - 1].events.push(ev);
    });
    return groups;
  }, [calendarEvents]);

  const isToday = (dateStr: string) => {
    const t = new Date();
    return dateStr === formatDateStr(t.getDate(), t.getMonth(), t.getFullYear());
  };

  return (
    <div>
      <PageHeader
        title="Termine"
        action={<Button onClick={() => navigate('/events/new')}><Plus className="h-4 w-4 mr-2" />Neuer Termin</Button>}
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="text-lg font-semibold text-foreground min-w-[160px] text-center">{monthNames[currentMonth]} {currentYear}</h2>
          <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={goToday}>Heute</Button>
        </div>
        <div className="flex border border-border rounded-md overflow-hidden">
          <Button variant={view === 'calendar' ? 'default' : 'ghost'} size="sm" onClick={() => setView('calendar')} className="rounded-none"><CalendarDays className="h-4 w-4" /></Button>
          <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')} className="rounded-none"><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {view === 'calendar' ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {weekDays.map(d => (
                <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7">
              {calendarGrid.map((cell, i) => {
                const evts = eventsByDate[cell.dateStr] || [];
                return (
                  <div key={i} className={`min-h-[100px] border-b border-r border-border p-1 ${!cell.inMonth ? 'bg-muted/30' : ''} ${isToday(cell.dateStr) ? 'bg-primary-lightest/50' : ''}`}>
                    <span className={`text-xs font-medium inline-block w-6 h-6 flex items-center justify-center rounded-full ${isToday(cell.dateStr) ? 'bg-primary text-primary-foreground' : cell.inMonth ? 'text-foreground' : 'text-muted-foreground'}`}>{cell.day}</span>
                    <div className="space-y-0.5 mt-0.5">
                      {evts.slice(0, 3).map(ev => (
                        <Popover key={ev.id}>
                          <PopoverTrigger asChild>
                            <button className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate ${categoryBgClasses[ev.category]} opacity-90 hover:opacity-100`}>
                              {ev.timeStart} {ev.title}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" side="right">
                            <h4 className="font-semibold text-sm mb-1">{ev.title}</h4>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p className="flex items-center gap-1"><Clock className="h-3 w-3" />{ev.timeStart}–{ev.timeEnd}</p>
                              <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</p>
                              <p className="flex items-center gap-1"><Users className="h-3 w-3" />{ev.participants}/{ev.maxParticipants}</p>
                            </div>
                            {ev.groups && ev.groups.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {ev.groups.map(g => <Badge key={g.id} variant="outline" className="text-[10px] px-1 py-0">{g.name}</Badge>)}
                              </div>
                            )}
                            <Badge variant="outline" className={`mt-2 text-xs ${statusBadge[ev.status]}`}>{ev.status}</Badge>
                          </PopoverContent>
                        </Popover>
                      ))}
                      {evts.length > 3 && <span className="text-[10px] text-muted-foreground pl-1">+{evts.length - 3} mehr</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {listGroups.map(group => (
            <div key={group.label}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">{group.label}</h3>
              <div className="space-y-2">
                {group.events.map(ev => {
                  const d = parseDateStr(ev.date);
                  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                  return (
                    <Card key={ev.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-primary-lightest flex flex-col items-center justify-center">
                          <span className="text-lg font-bold text-primary">{d.getDate()}</span>
                          <span className="text-[10px] font-medium text-primary">{dayNames[d.getDay()]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">{ev.title}</h4>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{ev.timeStart}–{ev.timeEnd}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ev.location}</span>
                            <Badge variant="outline" className={categoryBgClasses[ev.category] + ' text-xs'}>{ev.category}</Badge>
                            {ev.groups && ev.groups.length > 0 && ev.groups.map(g => <Badge key={g.id} variant="outline" className="text-xs">{g.name}</Badge>)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm text-muted-foreground flex items-center gap-1"><Users className="h-4 w-4" />{ev.participants}/{ev.maxParticipants}</span>
                          <Badge variant="outline" className={statusBadge[ev.status]}>{ev.status}</Badge>
                          {ev.status === 'Offen' && <Button size="sm">Anmelden</Button>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
