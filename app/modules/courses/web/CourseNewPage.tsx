import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  Card,
  Select,
  Switch,
  Textarea,
  TextInput,
  Divider,
  Stack,
  Group,
  Text,
  SimpleGrid,
} from '@mantine/core';
import { ArrowLeft, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { notifications } from '@mantine/notifications';

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

type CourseTrainer = {
  id: string;
  firstName: string;
  lastName: string;
  roles?: string[];
};

type CourseMemberListData = {
  data?: CourseTrainer[];
};

type CreateCoursePayload = {
  title: string;
  description: string;
  eventType: string;
  location: string;
  startDate: string;
  endDate: string;
  timeStart: string;
  timeEnd: string;
  maxParticipants: number;
  price: number | null;
  autoInvoice: boolean;
  isPublic: boolean;
  showOnHomepage: boolean;
  instructorId?: string;
  weekdays: string[];
  status: string;
};

export default function CourseNew({
  membersData,
  actionData,
  navigationState,
}: {
  membersData: CourseMemberListData;
  actionData?: { success?: boolean; error?: string };
  navigationState: string;
}) {
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

  const trainers = (membersData?.data ?? []).filter(m => m.roles?.includes('Trainer') || m.roles?.includes('trainer'));
  useEffect(() => {
    if (actionData?.success) {
      notifications.show({ color: 'green', message: 'Kurs/Termin wurde erfolgreich erstellt!' });
      navigate('/courses');
    } else if (actionData?.error) {
      notifications.show({ color: 'red', message: actionData.error });
    }
  }, [actionData, navigate]);

  return (
    <div>
      <Button variant="subtle" mb="md" leftSection={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
        Zurück
      </Button>
      <PageHeader title="Neuer Kurs / Termin" />

      <form method="post" onSubmit={(e) => {
        const form = e.currentTarget;
        const payloadInput = form.querySelector<HTMLInputElement>('input[name="payload"]');
        if (!payloadInput) return;
        const fd = new FormData(form);
        const payload: CreateCoursePayload = {
          title: fd.get('title') as string,
          description: fd.get('description') as string || '',
          eventType: eventType === 'Einmalig' ? 'single' : eventType === 'Wiederkehrend' ? 'recurring' : 'course',
          location: fd.get('location') as string || '',
          startDate: startDate?.toISOString().slice(0, 10) || '',
          endDate: endDate?.toISOString().slice(0, 10) || '',
          timeStart: fd.get('timeStart') as string || '',
          timeEnd: fd.get('timeEnd') as string || '',
          maxParticipants: Number(fd.get('maxParticipants')) || 0,
          price: costEnabled ? Number(fd.get('price')) || null : null,
          autoInvoice,
          isPublic,
          showOnHomepage: showHomepage,
          weekdays: selectedDays,
          status: 'Entwurf',
        };
        const instructorId = fd.get('instructorId') as string;
        if (instructorId) payload.instructorId = instructorId;
        payloadInput.value = JSON.stringify(payload);
      }}>
        <input type="hidden" name="payload" value="" />
        <Stack gap="lg" maw={768}>
          {/* Section 1: Grunddaten */}
          <Card withBorder>
            <Text fw={600} mb="xs">Grunddaten</Text>
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <TextInput name="title" label="Titel *" placeholder="z.B. Judo-Anfänger" required />
                <Select
                  label="Kategorie"
                  defaultValue="Training"
                  data={[
                    { value: 'Training', label: 'Training' },
                    { value: 'Wettkampf', label: 'Wettkampf' },
                    { value: 'Lager', label: 'Lager' },
                    { value: 'Workshop', label: 'Workshop' },
                    { value: 'Freizeit', label: 'Freizeit' },
                  ]}
                />
              </SimpleGrid>
              <Select
                label="Typ"
                value={eventType}
                onChange={(val) => setEventType(val ?? 'Einmalig')}
                data={[
                  { value: 'Einmalig', label: 'Einmalig' },
                  { value: 'Wiederkehrend', label: 'Wiederkehrend' },
                  { value: 'Kurs-Serie', label: 'Kurs-Serie' },
                ]}
              />
              <Textarea name="description" label="Beschreibung" placeholder="Kursbeschreibung eingeben..." rows={4} />
            </Stack>
          </Card>

          {/* Section 2: Zeitplan */}
          <Card withBorder>
            <Text fw={600} mb="xs">Zeitplan</Text>
            <Stack gap="sm">
              {eventType === 'Einmalig' ? (
                <SimpleGrid cols={{ base: 1, md: 2 }}>
                  <DatePicker label="Start-Datum" date={startDate} onSelect={setStartDate} />
                  <DatePicker label="End-Datum" date={endDate} onSelect={setEndDate} />
                  <TextInput name="timeStart" type="time" label="Startzeit" defaultValue="18:00" />
                  <TextInput name="timeEnd" type="time" label="Endzeit" defaultValue="19:30" />
                </SimpleGrid>
              ) : (
                <>
                  <div>
                    <Text size="sm" fw={500} mb={6}>Wochentage</Text>
                    <Group gap="xs">
                      {weekdays.map(d => (
                        <button key={d} type="button" onClick={() => toggleDay(d)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            fontSize: 14,
                            fontWeight: 500,
                            border: '1px solid',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            background: selectedDays.includes(d) ? 'var(--mantine-color-blue-6)' : 'transparent',
                            color: selectedDays.includes(d) ? '#fff' : 'var(--mantine-color-dimmed)',
                            borderColor: selectedDays.includes(d) ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-4)',
                          }}
                        >{d}</button>
                      ))}
                    </Group>
                  </div>
                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <TextInput name="timeStart" type="time" label="Startzeit" defaultValue="18:00" />
                    <TextInput name="timeEnd" type="time" label="Endzeit" defaultValue="19:30" />
                    <DatePicker label="Serienbeginn" date={startDate} onSelect={setStartDate} />
                    <DatePicker label="Serienende" date={endDate} onSelect={setEndDate} />
                  </SimpleGrid>
                </>
              )}
            </Stack>
          </Card>

          {/* Section 3: Ort & Leitung */}
          <Card withBorder>
            <Text fw={600} mb="xs">Ort & Leitung</Text>
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <TextInput name="location" label="Ort" placeholder="z.B. Sporthalle A" />
              <Select
                name="instructorId"
                label="Kursleiter"
                placeholder="Kursleiter auswählen"
                data={trainers.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))}
              />
            </SimpleGrid>
          </Card>

          {/* Section 4: Teilnehmer */}
          <Card withBorder>
            <Text fw={600} mb="xs">Teilnehmer</Text>
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <TextInput name="maxParticipants" type="number" label="Max. Teilnehmer" placeholder="20" min={1} />
              </SimpleGrid>
              <Group justify="space-between">
                <Text size="sm">Warteliste aktivieren</Text>
                <Switch checked={waitlistEnabled} onChange={(e) => setWaitlistEnabled(e.currentTarget.checked)} />
              </Group>
            </Stack>
          </Card>

          {/* Section 5: Finanzen */}
          <Card withBorder>
            <Text fw={600} mb="xs">Finanzen</Text>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm">Kostenpflichtig</Text>
                <Switch checked={costEnabled} onChange={(e) => setCostEnabled(e.currentTarget.checked)} />
              </Group>
              {costEnabled && (
                <>
                  <TextInput name="price" type="number" step="0.01" label="Betrag (€)" placeholder="25,00" min={0} />
                  <Group justify="space-between">
                    <Text size="sm">Automatische Rechnung</Text>
                    <Switch checked={autoInvoice} onChange={(e) => setAutoInvoice(e.currentTarget.checked)} />
                  </Group>
                </>
              )}
            </Stack>
          </Card>

          {/* Section 6: Sichtbarkeit */}
          <Card withBorder>
            <Text fw={600} mb="xs">Sichtbarkeit</Text>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm">Öffentlich</Text>
                <Switch checked={isPublic} onChange={(e) => setIsPublic(e.currentTarget.checked)} />
              </Group>
              <Group justify="space-between">
                <Text size="sm">Auf Homepage anzeigen</Text>
                <Switch checked={showHomepage} onChange={(e) => setShowHomepage(e.currentTarget.checked)} />
              </Group>
            </Stack>
          </Card>

          <Divider />

          <Group justify="flex-end" pb="xl">
            <Button variant="subtle" type="button" onClick={() => navigate(-1)}>Abbrechen</Button>
            <Button type="submit" disabled={navigationState === 'submitting'}>
              {navigationState === 'submitting' ? 'Wird erstellt...' : 'Kurs erstellen'}
            </Button>
          </Group>
        </Stack>
      </form>
    </div>
  );
}

function DatePicker({ label, date, onSelect }: { label?: string; date?: Date; onSelect: (d: Date | undefined) => void }) {
  return (
    <TextInput
      label={label}
      type="date"
      value={date ? format(date, 'yyyy-MM-dd') : ''}
      onChange={e => {
        const val = e.currentTarget.value;
        onSelect(val ? new Date(val) : undefined);
      }}
      leftSection={<CalendarIcon size={16} />}
      placeholder="Datum wählen"
    />
  );
}
