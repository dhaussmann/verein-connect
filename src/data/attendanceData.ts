export interface TodayEvent {
  id: string;
  title: string;
  time: string;
  location: string;
  totalParticipants: number;
  checkedIn: number;
  isActive: boolean;
}

export interface AttendanceParticipant {
  id: string;
  memberId: string;
  name: string;
  initials: string;
  status: 'anwesend' | 'abwesend' | 'entschuldigt' | 'offen';
  checkedInAt?: string;
}

export interface TopAttendee {
  memberId: string;
  name: string;
  initials: string;
  rate: number;
}

export interface CourseAttendanceRate {
  course: string;
  rate: number;
}

export const todayEvents: TodayEvent[] = [
  { id: 'te1', title: 'A-Jugend Training', time: '16:00–17:30', location: 'Halle 1', totalParticipants: 18, checkedIn: 12, isActive: true },
  { id: 'te2', title: 'Yoga für Senioren', time: '10:00–11:00', location: 'Raum 3', totalParticipants: 12, checkedIn: 12, isActive: false },
  { id: 'te3', title: 'Herren 1 Training', time: '19:00–20:30', location: 'Sportplatz', totalParticipants: 22, checkedIn: 0, isActive: false },
  { id: 'te4', title: 'Schwimmkurs Kinder', time: '15:00–16:00', location: 'Schwimmbad', totalParticipants: 10, checkedIn: 8, isActive: true },
  { id: 'te5', title: 'Leichtathletik U16', time: '17:00–18:30', location: 'Stadion', totalParticipants: 16, checkedIn: 0, isActive: false },
  { id: 'te6', title: 'Lauftreff Abend', time: '18:30–19:30', location: 'Treffpunkt Parkplatz', totalParticipants: 25, checkedIn: 0, isActive: false },
];

export const topAttendees: TopAttendee[] = [
  { memberId: '1', name: 'Anna Schmidt', initials: 'AS', rate: 98 },
  { memberId: '4', name: 'Thomas Fischer', initials: 'TF', rate: 95 },
  { memberId: '9', name: 'Julia Becker', initials: 'JB', rate: 93 },
  { memberId: '8', name: 'Klaus Wagner', initials: 'KW', rate: 91 },
  { memberId: '2', name: 'Peter Weber', initials: 'PW', rate: 88 },
];

export const courseAttendanceRates: CourseAttendanceRate[] = [
  { course: 'Yoga Senioren', rate: 92 },
  { course: 'A-Jugend Training', rate: 85 },
  { course: 'Herren 1', rate: 82 },
  { course: 'Schwimmkurs', rate: 78 },
  { course: 'Leichtathletik U16', rate: 75 },
  { course: 'Judo Anfänger', rate: 71 },
  { course: 'Lauftreff', rate: 68 },
];

export function getCheckInParticipants(eventId: string): AttendanceParticipant[] {
  const names = [
    { id: 'p1', memberId: '1', name: 'Anna Schmidt', initials: 'AS' },
    { id: 'p2', memberId: '2', name: 'Peter Weber', initials: 'PW' },
    { id: 'p3', memberId: '4', name: 'Thomas Fischer', initials: 'TF' },
    { id: 'p4', memberId: '6', name: 'Markus Schneider', initials: 'MS' },
    { id: 'p5', memberId: '7', name: 'Sophie Müller', initials: 'SM' },
    { id: 'p6', memberId: '8', name: 'Klaus Wagner', initials: 'KW' },
    { id: 'p7', memberId: '9', name: 'Julia Becker', initials: 'JB' },
    { id: 'p8', memberId: '10', name: 'Hans Richter', initials: 'HR' },
    { id: 'p9', memberId: '11', name: 'Lena Koch', initials: 'LK' },
    { id: 'p10', memberId: '12', name: 'Stefan Koch', initials: 'SK' },
    { id: 'p11', memberId: '14', name: 'Felix Zimmermann', initials: 'FZ' },
    { id: 'p12', memberId: '15', name: 'Claudia Schäfer', initials: 'CS' },
  ];

  const event = todayEvents.find(e => e.id === eventId);
  const count = event?.totalParticipants || 12;
  const checked = event?.checkedIn || 0;

  return names.slice(0, Math.min(count, names.length)).map((n, i) => ({
    ...n,
    status: i < checked ? 'anwesend' : 'offen',
    checkedInAt: i < checked ? `${16 + Math.floor(i / 4)}:${String(i * 3).padStart(2, '0')}` : undefined,
  }));
}
