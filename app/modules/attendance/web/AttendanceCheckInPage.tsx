import { useEffect, useState, useMemo } from 'react';
import { useFetcher } from 'react-router';
import { Card, Button, TextInput, Badge, Avatar, Tabs, ActionIcon, Text, Group } from '@mantine/core';
import { CheckCircle, XCircle, Clock, Search, QrCode, Camera } from 'lucide-react';
import { notifications } from '@mantine/notifications';

interface AttendanceParticipant {
  id: string;
  memberId: string;
  name: string;
  initials: string;
  status: 'anwesend' | 'abwesend' | 'entschuldigt' | 'offen';
  checkedInAt?: string;
}

type AttendanceEventSummary = {
  title?: string;
  timeStart?: string;
  timeEnd?: string;
  location?: string;
};

type AttendanceRecord = {
  id?: string;
  userId?: string;
  memberId?: string;
  memberName?: string;
  name?: string;
  status?: 'present' | 'absent' | 'excused' | 'pending';
  checkedInAt?: string;
};

type AttendanceActionData = {
  success?: boolean;
  error?: string;
};

export default function AttendanceCheckIn({
  eventId,
  event,
  attendanceData,
  actionData,
}: {
  eventId: string;
  event: AttendanceEventSummary | null;
  attendanceData: AttendanceRecord[];
  actionData?: AttendanceActionData;
}) {
  const fetcher = useFetcher<AttendanceActionData>();
  const apiParticipants: AttendanceParticipant[] = useMemo(() => {
    if (!Array.isArray(attendanceData)) return [];
    return attendanceData.map((a) => ({
      id: a.id || a.userId,
      memberId: a.userId || a.memberId,
      name: a.memberName || a.name || 'Unbekannt',
      initials: (a.memberName || a.name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      status: a.status === 'present' ? 'anwesend' as const : a.status === 'absent' ? 'abwesend' as const : a.status === 'excused' ? 'entschuldigt' as const : 'offen' as const,
      checkedInAt: a.checkedInAt,
    }));
  }, [attendanceData]);

  const [localOverrides, setLocalOverrides] = useState<Record<string, { status: AttendanceParticipant['status']; checkedInAt?: string }>>({});
  const [search, setSearch] = useState('');
  const [lastScan, setLastScan] = useState<string | null>(null);
  const eventLoading = false;

  useEffect(() => {
    const payload = fetcher.data || actionData;
    if (payload?.error) {
      notifications.show({ color: 'red', message: payload.error });
    }
  }, [fetcher.data, actionData]);

  const participants = useMemo(() =>
    apiParticipants.map(p => localOverrides[p.id] ? { ...p, ...localOverrides[p.id] } : p),
    [apiParticipants, localOverrides]
  );

  const filtered = useMemo(() =>
    participants.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [participants, search]
  );

  const counts = useMemo(() => ({
    anwesend: participants.filter(p => p.status === 'anwesend').length,
    total: participants.length,
  }), [participants]);

  const setStatus = (id: string, status: AttendanceParticipant['status']) => {
    const checkedInAt = status === 'anwesend' ? new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : undefined;
    setLocalOverrides(prev => ({ ...prev, [id]: { status, checkedInAt } }));

    const p = participants.find(x => x.id === id);
    if (p && eventId) {
      const apiStatus = status === 'anwesend' ? 'present' : status === 'abwesend' ? 'absent' : status === 'entschuldigt' ? 'excused' : 'pending';
      fetcher.submit({ userId: p.memberId, status: apiStatus }, { method: 'post' });
    }
  };

  const rowBg = (s: AttendanceParticipant['status']) => {
    if (s === 'anwesend') return 'var(--mantine-color-green-0)';
    if (s === 'abwesend') return 'var(--mantine-color-red-0)';
    if (s === 'entschuldigt') return 'var(--mantine-color-yellow-0)';
    return undefined;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <Text size="xl" fw={600}>{event?.title ?? 'Check-In'}</Text>
          <Text c="dimmed">{event?.timeStart}–{event?.timeEnd} · {event?.location}</Text>
        </div>
        <div className="text-center px-4 py-2 rounded-lg" style={{ background: 'var(--mantine-color-blue-0)' }}>
          <Text size="xl" fw={700} c="blue">{counts.anwesend}/{counts.total}</Text>
          <Text size="xs" c="dimmed">Anwesend</Text>
        </div>
      </div>

      {participants.length === 0 && !eventLoading && (
        <Text ta="center" py="xl" c="dimmed">Keine Teilnehmer für diesen Termin hinterlegt.</Text>
      )}

      <Tabs defaultValue="list">
        <Tabs.List mb="md">
          <Tabs.Tab value="list">Liste</Tabs.Tab>
          <Tabs.Tab value="qr">QR-Scan</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="list" pt="xs">
          <TextInput
            mb="sm"
            placeholder="Teilnehmer suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftSection={<Search size={16} />}
          />

          <div className="space-y-2">
            {filtered.map(p => (
              <div key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--mantine-color-gray-3)',
                  background: rowBg(p.status),
                  transition: 'background 0.15s',
                }}
              >
                <Avatar radius="xl">{p.initials}</Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={500}>{p.name}</Text>
                  {p.checkedInAt && p.status === 'anwesend' && (
                    <Text size="xs" c="dimmed">Eingecheckt um {p.checkedInAt}</Text>
                  )}
                </div>
                <Group gap="xs">
                  <Button
                    size="md"
                    variant={p.status === 'anwesend' ? 'filled' : 'outline'}
                    color="green"
                    onClick={() => setStatus(p.id, 'anwesend')}
                  >
                    <CheckCircle size={20} />
                  </Button>
                  <Button
                    size="md"
                    variant={p.status === 'abwesend' ? 'filled' : 'outline'}
                    color="red"
                    onClick={() => setStatus(p.id, 'abwesend')}
                  >
                    <XCircle size={20} />
                  </Button>
                  <Button
                    size="md"
                    variant={p.status === 'entschuldigt' ? 'filled' : 'outline'}
                    color="yellow"
                    onClick={() => setStatus(p.id, 'entschuldigt')}
                  >
                    <Clock size={20} />
                  </Button>
                </Group>
              </div>
            ))}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="qr" pt="xs">
          <Card withBorder mb="lg">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '16px 0' }}>
              <div style={{
                width: '100%',
                maxWidth: 320,
                aspectRatio: '1',
                background: 'var(--mantine-color-gray-1)',
                borderRadius: 8,
                border: '2px dashed var(--mantine-color-gray-4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
              }}>
                <Camera size={64} color="var(--mantine-color-dimmed)" />
                <Text c="dimmed" ta="center" size="sm">
                  QR-Scanner wird hier integriert<br />
                  <span style={{ fontSize: 12 }}>Kamera-Zugriff erforderlich</span>
                </Text>
              </div>
              {lastScan ? (
                <Group gap="xs">
                  <CheckCircle size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">Letzter Scan: <strong>{lastScan}</strong></Text>
                </Group>
              ) : (
                <Text size="sm" c="dimmed">Noch kein Scan durchgeführt</Text>
              )}
              <Button variant="outline" leftSection={<QrCode size={16} />} onClick={() => {
                const p = participants.find(x => x.status === 'offen');
                if (p) {
                  setStatus(p.id, 'anwesend');
                  setLastScan(`${p.name} – Eingecheckt um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`);
                }
              }}>
                Scan simulieren
              </Button>
            </div>
          </Card>

          <Text fw={600} mb="sm">Bereits eingecheckt</Text>
          <div className="space-y-2">
            {participants.filter(p => p.status === 'anwesend').map(p => (
              <div key={p.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
                borderRadius: 6,
                background: 'var(--mantine-color-green-0)',
              }}>
                <Avatar radius="xl" size="sm">{p.initials}</Avatar>
                <Text size="sm" fw={500} style={{ flex: 1 }}>{p.name}</Text>
                <Badge variant="outline" color="green" size="sm">{p.checkedInAt}</Badge>
              </div>
            ))}
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
