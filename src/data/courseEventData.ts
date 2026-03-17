// Course & Event mock data — replace with API calls later

export type CourseCategory = 'Training' | 'Wettkampf' | 'Lager' | 'Workshop' | 'Freizeit';
export type CourseStatus = 'Aktiv' | 'Entwurf' | 'Abgeschlossen' | 'Abgesagt';
export type EventType = 'Einmalig' | 'Wiederkehrend' | 'Kurs-Serie';

export const categoryColors: Record<CourseCategory, string> = {
  Training: 'hsl(207,62%,28%)',      // primary
  Wettkampf: 'hsl(4,64%,46%)',       // destructive
  Lager: 'hsl(145,63%,32%)',         // success
  Workshop: 'hsl(48,90%,44%)',       // warning
  Freizeit: 'hsl(207,62%,47%)',      // primary-light
};

export const categoryBgClasses: Record<CourseCategory, string> = {
  Training: 'bg-primary text-primary-foreground',
  Wettkampf: 'bg-destructive text-destructive-foreground',
  Lager: 'bg-success text-success-foreground',
  Workshop: 'bg-warning text-warning-foreground',
  Freizeit: 'bg-primary-light text-primary-foreground',
};

export interface Course {
  id: string;
  title: string;
  category: CourseCategory;
  status: CourseStatus;
  description: string;
  instructorId: string;
  instructorName: string;
  instructorInitials: string;
  schedule: string;
  location: string;
  participants: number;
  maxParticipants: number;
  waitlist: number;
  price: number | null; // null = kostenlos
  startDate: string;
  endDate: string;
  weekdays?: string[];
  timeStart: string;
  timeEnd: string;
  isPublic: boolean;
  showOnHomepage: boolean;
  targetRoles: string[];
  autoInvoice: boolean;
}

export interface CourseParticipant {
  id: string;
  memberId: string;
  name: string;
  initials: string;
  registrationDate: string;
  status: 'Angemeldet' | 'Warteliste' | 'Abgesagt';
  waitlistPosition?: number;
}

export interface CalendarEvent {
  id: string;
  courseId?: string;
  title: string;
  date: string; // DD.MM.YYYY
  endDate?: string;
  timeStart: string;
  timeEnd: string;
  category: CourseCategory;
  location: string;
  participants: number;
  maxParticipants: number;
  status: 'Offen' | 'Voll' | 'Abgesagt';
  description?: string;
}

export const courses: Course[] = [
  {
    id: 'c1', title: 'Judo-Anfänger', category: 'Training', status: 'Aktiv',
    description: 'Einsteigerkurs für Kinder und Erwachsene. Grundtechniken, Fallschule und erste Würfe. Keine Vorkenntnisse erforderlich.',
    instructorId: '1', instructorName: 'Anna Schmidt', instructorInitials: 'AS',
    schedule: 'Di & Do, 17:00–18:30', location: 'Sporthalle A',
    participants: 14, maxParticipants: 20, waitlist: 0,
    price: 25, startDate: '01.01.2026', endDate: '30.06.2026',
    weekdays: ['Di', 'Do'], timeStart: '17:00', timeEnd: '18:30',
    isPublic: true, showOnHomepage: true, targetRoles: ['Mitglied'], autoInvoice: true,
  },
  {
    id: 'c2', title: 'Leichtathletik U16', category: 'Training', status: 'Aktiv',
    description: 'Leistungsorientiertes Training für Jugendliche. Sprint, Weitsprung, Kugelstoßen und Ausdauer.',
    instructorId: '9', instructorName: 'Julia Becker', instructorInitials: 'JB',
    schedule: 'Mo, Mi & Fr, 16:00–17:30', location: 'Leichtathletikstadion',
    participants: 18, maxParticipants: 20, waitlist: 3,
    price: null, startDate: '01.09.2025', endDate: '31.07.2026',
    weekdays: ['Mo', 'Mi', 'Fr'], timeStart: '16:00', timeEnd: '17:30',
    isPublic: true, showOnHomepage: true, targetRoles: ['Mitglied'], autoInvoice: false,
  },
  {
    id: 'c3', title: 'Yoga für Senioren', category: 'Freizeit', status: 'Aktiv',
    description: 'Sanftes Yoga speziell für ältere Teilnehmer. Fokus auf Beweglichkeit, Gleichgewicht und Entspannung.',
    instructorId: '15', instructorName: 'Claudia Schäfer', instructorInitials: 'CS',
    schedule: 'Mo, 10:00–11:00', location: 'Gymnastikraum',
    participants: 15, maxParticipants: 15, waitlist: 2,
    price: 10, startDate: '01.01.2026', endDate: '31.12.2026',
    weekdays: ['Mo'], timeStart: '10:00', timeEnd: '11:00',
    isPublic: true, showOnHomepage: false, targetRoles: ['Mitglied'], autoInvoice: true,
  },
  {
    id: 'c4', title: 'Schwimmkurs Bronze', category: 'Training', status: 'Aktiv',
    description: 'Schwimmkurs für das Deutsche Schwimmabzeichen Bronze. Brustschwimmen, Tauchen und Sprung vom Beckenrand.',
    instructorId: '4', instructorName: 'Thomas Fischer', instructorInitials: 'TF',
    schedule: 'Sa, 09:00–10:30', location: 'Hallenbad Süd',
    participants: 10, maxParticipants: 12, waitlist: 5,
    price: 45, startDate: '15.01.2026', endDate: '15.04.2026',
    weekdays: ['Sa'], timeStart: '09:00', timeEnd: '10:30',
    isPublic: true, showOnHomepage: true, targetRoles: ['Mitglied'], autoInvoice: true,
  },
  {
    id: 'c5', title: 'Fitness-Bootcamp', category: 'Training', status: 'Aktiv',
    description: 'Intensives Ganzkörpertraining im Freien. HIIT, Kraft und Ausdauer in einer Gruppe.',
    instructorId: '9', instructorName: 'Julia Becker', instructorInitials: 'JB',
    schedule: 'Mi & Sa, 07:00–08:00', location: 'Sportplatz B',
    participants: 8, maxParticipants: 25, waitlist: 0,
    price: 15, startDate: '01.03.2026', endDate: '30.09.2026',
    weekdays: ['Mi', 'Sa'], timeStart: '07:00', timeEnd: '08:00',
    isPublic: true, showOnHomepage: true, targetRoles: ['Mitglied'], autoInvoice: true,
  },
  {
    id: 'c6', title: 'Erste-Hilfe-Workshop', category: 'Workshop', status: 'Aktiv',
    description: 'Kompakter Workshop zu Erster Hilfe im Sport. Pflicht für alle Trainer und Übungsleiter.',
    instructorId: '10', instructorName: 'Hans Richter', instructorInitials: 'HR',
    schedule: 'Sa 21.03.2026, 09:00–16:00', location: 'Vereinsheim',
    participants: 12, maxParticipants: 20, waitlist: 0,
    price: 35, startDate: '21.03.2026', endDate: '21.03.2026',
    timeStart: '09:00', timeEnd: '16:00',
    isPublic: false, showOnHomepage: false, targetRoles: ['Trainer', 'Vorstand'], autoInvoice: true,
  },
  {
    id: 'c7', title: 'Sommerlager 2026', category: 'Lager', status: 'Entwurf',
    description: 'Einwöchiges Sportlager am Bodensee für Jugendliche (12–17 Jahre). Sport, Spaß und Teambuilding.',
    instructorId: '6', instructorName: 'Markus Schneider', instructorInitials: 'MS',
    schedule: '20.07.–26.07.2026', location: 'Bodensee Jugendherberge',
    participants: 0, maxParticipants: 40, waitlist: 0,
    price: 280, startDate: '20.07.2026', endDate: '26.07.2026',
    timeStart: '10:00', timeEnd: '18:00',
    isPublic: false, showOnHomepage: false, targetRoles: ['Mitglied'], autoInvoice: true,
  },
  {
    id: 'c8', title: 'Volleyball Mixed', category: 'Freizeit', status: 'Aktiv',
    description: 'Lockeres Volleyballspiel für alle Altersgruppen. Kein Leistungsdruck, nur Spaß!',
    instructorId: '2', instructorName: 'Peter Weber', instructorInitials: 'PW',
    schedule: 'Fr, 19:00–21:00', location: 'Sporthalle C',
    participants: 16, maxParticipants: 24, waitlist: 0,
    price: null, startDate: '01.01.2026', endDate: '31.12.2026',
    weekdays: ['Fr'], timeStart: '19:00', timeEnd: '21:00',
    isPublic: true, showOnHomepage: false, targetRoles: ['Mitglied'], autoInvoice: false,
  },
  {
    id: 'c9', title: 'Wettkampfvorbereitung Judo', category: 'Wettkampf', status: 'Aktiv',
    description: 'Intensives Vorbereitungstraining für die Landesmeisterschaften. Nur für fortgeschrittene Judoka.',
    instructorId: '1', instructorName: 'Anna Schmidt', instructorInitials: 'AS',
    schedule: 'Di & Do, 19:00–21:00', location: 'Sporthalle A',
    participants: 8, maxParticipants: 10, waitlist: 1,
    price: null, startDate: '01.02.2026', endDate: '15.04.2026',
    weekdays: ['Di', 'Do'], timeStart: '19:00', timeEnd: '21:00',
    isPublic: false, showOnHomepage: false, targetRoles: ['Mitglied'], autoInvoice: false,
  },
  {
    id: 'c10', title: 'Eltern-Kind-Turnen', category: 'Freizeit', status: 'Abgeschlossen',
    description: 'Spielerische Bewegung für Eltern mit Kleinkindern (1–3 Jahre).',
    instructorId: '15', instructorName: 'Claudia Schäfer', instructorInitials: 'CS',
    schedule: 'Mi, 09:30–10:30', location: 'Gymnastikraum',
    participants: 12, maxParticipants: 15, waitlist: 0,
    price: 8, startDate: '01.09.2025', endDate: '31.01.2026',
    weekdays: ['Mi'], timeStart: '09:30', timeEnd: '10:30',
    isPublic: true, showOnHomepage: false, targetRoles: ['Mitglied'], autoInvoice: true,
  },
];

export function getCourseParticipants(courseId: string): CourseParticipant[] {
  const maps: Record<string, CourseParticipant[]> = {
    c1: [
      { id: 'cp1', memberId: '7', name: 'Sophie Müller', initials: 'SM', registrationDate: '05.01.2026', status: 'Angemeldet' },
      { id: 'cp2', memberId: '11', name: 'Lena Koch', initials: 'LK', registrationDate: '08.01.2026', status: 'Angemeldet' },
      { id: 'cp3', memberId: '14', name: 'Felix Zimmermann', initials: 'FZ', registrationDate: '10.01.2026', status: 'Angemeldet' },
      { id: 'cp4', memberId: '3', name: 'Maria Braun', initials: 'MB', registrationDate: '15.01.2026', status: 'Abgesagt' },
    ],
    c2: [
      { id: 'cp5', memberId: '11', name: 'Lena Koch', initials: 'LK', registrationDate: '01.09.2025', status: 'Angemeldet' },
      { id: 'cp6', memberId: '7', name: 'Sophie Müller', initials: 'SM', registrationDate: '03.09.2025', status: 'Angemeldet' },
      { id: 'cp7', memberId: '14', name: 'Felix Zimmermann', initials: 'FZ', registrationDate: '05.09.2025', status: 'Warteliste', waitlistPosition: 1 },
      { id: 'cp8', memberId: '5', name: 'Laura Hoffmann', initials: 'LH', registrationDate: '10.09.2025', status: 'Warteliste', waitlistPosition: 2 },
    ],
    c3: [
      { id: 'cp9', memberId: '8', name: 'Klaus Wagner', initials: 'KW', registrationDate: '02.01.2026', status: 'Angemeldet' },
      { id: 'cp10', memberId: '10', name: 'Hans Richter', initials: 'HR', registrationDate: '03.01.2026', status: 'Angemeldet' },
      { id: 'cp11', memberId: '13', name: 'Monika Hartmann', initials: 'MH', registrationDate: '05.01.2026', status: 'Warteliste', waitlistPosition: 1 },
    ],
  };
  return maps[courseId] || [
    { id: 'cp-def1', memberId: '1', name: 'Anna Schmidt', initials: 'AS', registrationDate: '01.01.2026', status: 'Angemeldet' },
    { id: 'cp-def2', memberId: '2', name: 'Peter Weber', initials: 'PW', registrationDate: '05.01.2026', status: 'Angemeldet' },
  ];
}

// Generate calendar events for March 2026
function generateMarchEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [
    { id: 'ev1', courseId: 'c1', title: 'Judo-Anfänger', date: '03.03.2026', timeStart: '17:00', timeEnd: '18:30', category: 'Training', location: 'Sporthalle A', participants: 14, maxParticipants: 20, status: 'Offen' },
    { id: 'ev2', courseId: 'c3', title: 'Yoga für Senioren', date: '02.03.2026', timeStart: '10:00', timeEnd: '11:00', category: 'Freizeit', location: 'Gymnastikraum', participants: 15, maxParticipants: 15, status: 'Voll' },
    { id: 'ev3', courseId: 'c2', title: 'Leichtathletik U16', date: '02.03.2026', timeStart: '16:00', timeEnd: '17:30', category: 'Training', location: 'Leichtathletikstadion', participants: 18, maxParticipants: 20, status: 'Offen' },
    { id: 'ev4', courseId: 'c5', title: 'Fitness-Bootcamp', date: '04.03.2026', timeStart: '07:00', timeEnd: '08:00', category: 'Training', location: 'Sportplatz B', participants: 8, maxParticipants: 25, status: 'Offen' },
    { id: 'ev5', title: 'Vorstandssitzung', date: '05.03.2026', timeStart: '20:00', timeEnd: '22:00', category: 'Workshop', location: 'Vereinsheim', participants: 5, maxParticipants: 8, status: 'Offen' },
    { id: 'ev6', courseId: 'c1', title: 'Judo-Anfänger', date: '05.03.2026', timeStart: '17:00', timeEnd: '18:30', category: 'Training', location: 'Sporthalle A', participants: 14, maxParticipants: 20, status: 'Offen' },
    { id: 'ev7', courseId: 'c8', title: 'Volleyball Mixed', date: '06.03.2026', timeStart: '19:00', timeEnd: '21:00', category: 'Freizeit', location: 'Sporthalle C', participants: 16, maxParticipants: 24, status: 'Offen' },
    { id: 'ev8', courseId: 'c4', title: 'Schwimmkurs Bronze', date: '07.03.2026', timeStart: '09:00', timeEnd: '10:30', category: 'Training', location: 'Hallenbad Süd', participants: 10, maxParticipants: 12, status: 'Offen' },
    { id: 'ev9', courseId: 'c3', title: 'Yoga für Senioren', date: '09.03.2026', timeStart: '10:00', timeEnd: '11:00', category: 'Freizeit', location: 'Gymnastikraum', participants: 15, maxParticipants: 15, status: 'Voll' },
    { id: 'ev10', courseId: 'c9', title: 'Wettkampfvorbereitung Judo', date: '10.03.2026', timeStart: '19:00', timeEnd: '21:00', category: 'Wettkampf', location: 'Sporthalle A', participants: 8, maxParticipants: 10, status: 'Offen' },
    { id: 'ev11', courseId: 'c2', title: 'Leichtathletik U16', date: '11.03.2026', timeStart: '16:00', timeEnd: '17:30', category: 'Training', location: 'Leichtathletikstadion', participants: 18, maxParticipants: 20, status: 'Offen' },
    { id: 'ev12', courseId: 'c5', title: 'Fitness-Bootcamp', date: '11.03.2026', timeStart: '07:00', timeEnd: '08:00', category: 'Training', location: 'Sportplatz B', participants: 8, maxParticipants: 25, status: 'Offen' },
    { id: 'ev13', courseId: 'c1', title: 'Judo-Anfänger', date: '12.03.2026', timeStart: '17:00', timeEnd: '18:30', category: 'Training', location: 'Sporthalle A', participants: 14, maxParticipants: 20, status: 'Offen' },
    { id: 'ev14', title: 'Mitgliederversammlung', date: '13.03.2026', timeStart: '19:00', timeEnd: '21:00', category: 'Workshop', location: 'Vereinsheim', participants: 45, maxParticipants: 100, status: 'Offen' },
    { id: 'ev15', courseId: 'c8', title: 'Volleyball Mixed', date: '13.03.2026', timeStart: '19:00', timeEnd: '21:00', category: 'Freizeit', location: 'Sporthalle C', participants: 16, maxParticipants: 24, status: 'Offen' },
    { id: 'ev16', courseId: 'c4', title: 'Schwimmkurs Bronze', date: '14.03.2026', timeStart: '09:00', timeEnd: '10:30', category: 'Training', location: 'Hallenbad Süd', participants: 10, maxParticipants: 12, status: 'Offen' },
    { id: 'ev17', courseId: 'c3', title: 'Yoga für Senioren', date: '16.03.2026', timeStart: '10:00', timeEnd: '11:00', category: 'Freizeit', location: 'Gymnastikraum', participants: 15, maxParticipants: 15, status: 'Voll' },
    { id: 'ev18', title: 'A-Jugend Training', date: '17.03.2026', timeStart: '18:00', timeEnd: '19:30', category: 'Training', location: 'Sportplatz A', participants: 12, maxParticipants: 20, status: 'Offen' },
    { id: 'ev19', courseId: 'c9', title: 'Wettkampfvorbereitung Judo', date: '17.03.2026', timeStart: '19:00', timeEnd: '21:00', category: 'Wettkampf', location: 'Sporthalle A', participants: 8, maxParticipants: 10, status: 'Offen' },
    { id: 'ev20', courseId: 'c6', title: 'Erste-Hilfe-Workshop', date: '21.03.2026', timeStart: '09:00', timeEnd: '16:00', category: 'Workshop', location: 'Vereinsheim', participants: 12, maxParticipants: 20, status: 'Offen' },
    { id: 'ev21', courseId: 'c4', title: 'Schwimmkurs Bronze', date: '21.03.2026', timeStart: '09:00', timeEnd: '10:30', category: 'Training', location: 'Hallenbad Süd', participants: 12, maxParticipants: 12, status: 'Voll' },
    { id: 'ev22', title: 'Vereinsfest Frühlingsanfang', date: '22.03.2026', timeStart: '14:00', timeEnd: '22:00', category: 'Freizeit', location: 'Vereinsgelände', participants: 80, maxParticipants: 200, status: 'Offen' },
    { id: 'ev23', courseId: 'c2', title: 'Leichtathletik U16', date: '23.03.2026', timeStart: '16:00', timeEnd: '17:30', category: 'Training', location: 'Leichtathletikstadion', participants: 18, maxParticipants: 20, status: 'Offen' },
    { id: 'ev24', courseId: 'c1', title: 'Judo-Anfänger', date: '24.03.2026', timeStart: '17:00', timeEnd: '18:30', category: 'Training', location: 'Sporthalle A', participants: 14, maxParticipants: 20, status: 'Offen' },
    { id: 'ev25', title: 'Trainerfortbildung', date: '28.03.2026', timeStart: '10:00', timeEnd: '17:00', category: 'Workshop', location: 'Vereinsheim', participants: 8, maxParticipants: 15, status: 'Offen' },
    { id: 'ev26', courseId: 'c8', title: 'Volleyball Mixed', date: '27.03.2026', timeStart: '19:00', timeEnd: '21:00', category: 'Freizeit', location: 'Sporthalle C', participants: 16, maxParticipants: 24, status: 'Offen' },
    { id: 'ev27', title: 'Landesmeisterschaft Judo', date: '29.03.2026', timeStart: '08:00', timeEnd: '18:00', category: 'Wettkampf', location: 'Olympiahalle', participants: 6, maxParticipants: 10, status: 'Offen' },
  ];
  return events;
}

export const calendarEvents = generateMarchEvents();

export function getEventsForDate(dateStr: string): CalendarEvent[] {
  return calendarEvents.filter(e => e.date === dateStr);
}

export function getCourseAttendanceMatrix(courseId: string): { participants: { name: string; initials: string; attendance: ('present' | 'absent' | 'excused' | null)[] }[]; dates: string[] } {
  const dates = ['03.03', '05.03', '10.03', '12.03', '17.03', '19.03'];
  const participants = getCourseParticipants(courseId)
    .filter(p => p.status === 'Angemeldet')
    .map(p => ({
      name: p.name,
      initials: p.initials,
      attendance: dates.map(() => {
        const r = Math.random();
        if (r > 0.8) return 'absent' as const;
        if (r > 0.7) return 'excused' as const;
        return 'present' as const;
      }),
    }));
  return { participants, dates };
}
