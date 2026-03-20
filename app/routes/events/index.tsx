/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react';
import { Link, useLoaderData, useSearchParams } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, Badge, Text, Group, Stack, Popover } from '@mantine/core';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, List, Clock, MapPin, Users } from 'lucide-react';
import { requireRouteData } from '@/core/runtime/route';
import { listCalendarEventsUseCase } from '@/modules/events/use-cases/events.use-cases';
import type { Event } from '@/lib/api';

const categoryBgClasses: Record<string, string> = {
  Training: 'bg-primary text-primary-foreground',
  Wettkampf: 'bg-destructive text-destructive-foreground',
  Lager: 'bg-success text-success-foreground',
  Workshop: 'bg-warning text-warning-foreground',
  Freizeit: 'bg-primary-light text-primary-foreground',
};

const statusColor: Record<string, string> = {
  Offen: 'green',
  Voll: 'yellow',
  Abgesagt: 'red',
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

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const apiCalendarEvents = await listCalendarEventsUseCase(env, user.orgId, { perPage: 200 });
  return { apiCalendarEvents };
}

export default function EventsIndexRoute() {
  const { apiCalendarEvents } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  const view = searchParams.get('view') === 'list' ? 'list' : 'calendar';
  const currentMonth = Number(searchParams.get('month') || now.getMonth());
  const currentYear = Number(searchParams.get('year') || now.getFullYear());

  const calendarEvents: Event[] = (apiCalendarEvents as Event[] | undefined) ?? [];

  const setCalendarState = (month: number, year: number, nextView = view) => {
    const next = new URLSearchParams(searchParams);
    next.set('month', String(month));
    next.set('year', String(year));
    next.set('view', nextView);
    setSearchParams(next);
  };

  const prevMonth = () => {
    if (currentMonth === 0) setCalendarState(11, currentYear - 1);
    else setCalendarState(currentMonth - 1, currentYear);
  };
  const nextMonth = () => {
    if (currentMonth === 11) setCalendarState(0, currentYear + 1);
    else setCalendarState(currentMonth + 1, currentYear);
  };
  const goToday = () => { const t = new Date(); setCalendarState(t.getMonth(), t.getFullYear()); };

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7;
    const days: { day: number; inMonth: boolean; dateStr: string }[] = [];

    const prevLast = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevLast - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({ day: d, inMonth: false, dateStr: formatDateStr(d, m, y) });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ day: d, inMonth: true, dateStr: formatDateStr(d, currentMonth, currentYear) });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({ day: d, inMonth: false, dateStr: formatDateStr(d, m, y) });
    }
    return days;
  }, [currentMonth, currentYear]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    calendarEvents.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, []);

  const listGroups = useMemo(() => {
    const sorted = [...calendarEvents].sort((a, b) => parseDateStr(a.date).getTime() - parseDateStr(b.date).getTime());
    const groups: { label: string; events: Event[] }[] = [];
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
  }, []);

  const isToday = (dateStr: string) => {
    const t = new Date();
    return dateStr === formatDateStr(t.getDate(), t.getMonth(), t.getFullYear());
  };

  return (
    <div>
      <PageHeader
        title="Termine"
        action={
          <Button component={Link} to="/events/new" leftSection={<Plus size={16} />}>
            Neuer Termin
          </Button>
        }
      />

      <Group justify="space-between" mb="lg">
        <Group gap="xs">
          <Button variant="outline" size="sm" onClick={prevMonth} px="xs">
            <ChevronLeft size={16} />
          </Button>
          <Text fw={600} size="lg" w={160} ta="center">{monthNames[currentMonth]} {currentYear}</Text>
          <Button variant="outline" size="sm" onClick={nextMonth} px="xs">
            <ChevronRight size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>Heute</Button>
        </Group>
        <Group gap={0} style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-sm)', overflow: 'hidden' }}>
          <Button
            variant={view === 'calendar' ? 'filled' : 'subtle'}
            size="sm"
            onClick={() => setCalendarState(currentMonth, currentYear, 'calendar')}
            style={{ borderRadius: 0 }}
            px="sm"
          >
            <CalendarDays size={16} />
          </Button>
          <Button
            variant={view === 'list' ? 'filled' : 'subtle'}
            size="sm"
            onClick={() => setCalendarState(currentMonth, currentYear, 'list')}
            style={{ borderRadius: 0 }}
            px="sm"
          >
            <List size={16} />
          </Button>
        </Group>
      </Group>

      {view === 'calendar' ? (
        <Card p={0} style={{ overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--mantine-color-default-border)' }}>
            {weekDays.map(d => (
              <Text key={d} size="xs" fw={500} c="dimmed" ta="center" p="xs">{d}</Text>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {calendarGrid.map((cell, i) => {
              const evts = eventsByDate[cell.dateStr] || [];
              return (
                <div
                  key={i}
                  style={{
                    minHeight: 100,
                    borderBottom: '1px solid var(--mantine-color-default-border)',
                    borderRight: '1px solid var(--mantine-color-default-border)',
                    padding: 4,
                    backgroundColor: !cell.inMonth
                      ? 'var(--mantine-color-gray-0)'
                      : isToday(cell.dateStr)
                      ? 'var(--mantine-color-blue-0)'
                      : undefined,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: isToday(cell.dateStr) ? 'var(--mantine-color-blue-6)' : undefined,
                      color: isToday(cell.dateStr)
                        ? 'white'
                        : cell.inMonth
                        ? 'var(--mantine-color-text)'
                        : 'var(--mantine-color-dimmed)',
                    }}
                  >
                    {cell.day}
                  </span>
                  <div style={{ marginTop: 2 }}>
                    {evts.slice(0, 3).map(ev => (
                      <Popover key={ev.id} position="right" withinPortal>
                        <Popover.Target>
                          <button
                            className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate ${categoryBgClasses[ev.category]} opacity-90 hover:opacity-100`}
                            style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: 10, padding: '2px 4px', borderRadius: 3, marginBottom: 2, border: 'none', cursor: 'pointer' }}
                          >
                            {ev.timeStart} {ev.title}
                          </button>
                        </Popover.Target>
                        <Popover.Dropdown p="sm" style={{ width: 256 }}>
                          <Text fw={600} size="sm" mb={4}>{ev.title}</Text>
                          <Stack gap={4}>
                            <Text size="xs" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} />{ev.timeStart}–{ev.timeEnd}
                            </Text>
                            <Text size="xs" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={12} />{ev.location}
                            </Text>
                            <Text size="xs" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Users size={12} />{ev.participants}/{ev.maxParticipants}
                            </Text>
                          </Stack>
                          <Badge mt="xs" size="xs" color={statusColor[ev.status] || 'gray'} variant="light">
                            {ev.status}
                          </Badge>
                        </Popover.Dropdown>
                      </Popover>
                    ))}
                    {evts.length > 3 && (
                      <Text size="xs" c="dimmed" pl={4}>+{evts.length - 3} mehr</Text>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Stack gap="xl">
          {listGroups.map(group => (
            <div key={group.label}>
              <Text size="sm" fw={600} c="dimmed" mb="xs">{group.label}</Text>
              <Stack gap="xs">
                {group.events.map(ev => {
                  const d = parseDateStr(ev.date);
                  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                  return (
                    <Card key={ev.id} p="md" withBorder style={{ cursor: 'default' }}>
                      <Group gap="md" wrap="nowrap">
                        <div
                          style={{
                            flexShrink: 0,
                            width: 56,
                            height: 56,
                            borderRadius: 8,
                            backgroundColor: 'var(--mantine-color-blue-0)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text size="lg" fw={700} c="blue">{d.getDate()}</Text>
                          <Text size="xs" fw={500} c="blue">{dayNames[d.getDay()]}</Text>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={600} truncate>{ev.title}</Text>
                          <Group gap="md" mt={4} wrap="wrap">
                            <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={14} />{ev.timeStart}–{ev.timeEnd}
                            </Text>
                            <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={14} />{ev.location}
                            </Text>
                            <Badge size="xs" variant="outline" className={categoryBgClasses[ev.category]}>
                              {ev.category}
                            </Badge>
                          </Group>
                        </div>
                        <Group gap="sm" style={{ flexShrink: 0 }}>
                          <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={16} />{ev.participants}/{ev.maxParticipants}
                          </Text>
                          <Badge variant="light" color={statusColor[ev.status] || 'gray'}>{ev.status}</Badge>
                          {ev.status === 'Offen' && <Button size="sm">Anmelden</Button>}
                        </Group>
                      </Group>
                    </Card>
                  );
                })}
              </Stack>
            </div>
          ))}
        </Stack>
      )}
    </div>
  );
}
