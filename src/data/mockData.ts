// Central mock data file — replace with API calls later

export interface Member {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  birthDate: string; // DD.MM.YYYY
  gender: 'männlich' | 'weiblich' | 'divers';
  street: string;
  zip: string;
  city: string;
  status: 'Aktiv' | 'Inaktiv' | 'Ausstehend';
  roles: string[];
  groups: string[];
  joinDate: string; // DD.MM.YYYY
  avatarInitials: string;
  customFields: Record<string, string>;
  familyId?: string;
  familyRelation?: string;
}

export interface Event {
  id: string;
  title: string;
  date: string; // DD.MM.YYYY
  time: string; // HH:MM
  type: 'Kurs' | 'Termin' | 'Training';
  participants: number;
  maxParticipants: number;
  status: 'Offen' | 'Voll' | 'Abgesagt';
}

export interface ActivityItem {
  id: string;
  memberId: string;
  memberName: string;
  initials: string;
  action: string;
  time: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  eventTitle: string;
  status: 'Anwesend' | 'Abwesend' | 'Entschuldigt';
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: string;
  status: 'Bezahlt' | 'Offen' | 'Überfällig';
  description: string;
}

export interface CourseRegistration {
  id: string;
  title: string;
  type: 'Kurs' | 'Termin';
  period: string;
  status: 'Angemeldet' | 'Warteliste' | 'Teilgenommen' | 'Abgesagt';
}

export interface FamilyMember {
  memberId: string;
  name: string;
  initials: string;
  relation: 'Elternteil' | 'Kind' | 'Partner';
}

export interface RoleAssignment {
  role: string;
  startDate: string;
  endDate?: string;
}

export const availableRoles = [
  'Mitglied', 'Trainer', 'Vorstand', 'Kassierer', 'Schriftführer',
  'Jugendwart', 'Platzwart', 'Schiedsrichter',
];

export const availableGroups = [
  'A-Jugend', 'B-Jugend', 'C-Jugend', 'Herren 1', 'Herren 2',
  'Damen 1', 'Senioren', 'Yoga-Gruppe', 'Lauftreff',
];

export const customFieldDefinitions = [
  { key: 'beltColor', label: 'Gürtelfarbe', type: 'select' as const, options: ['Weiß', 'Gelb', 'Orange', 'Grün', 'Blau', 'Braun', 'Schwarz'] },
  { key: 'jerseyNumber', label: 'Trikotnummer', type: 'text' as const },
  { key: 'bloodType', label: 'Blutgruppe', type: 'select' as const, options: ['A+', 'A-', 'B+', 'B-', '0+', '0-', 'AB+', 'AB-'] },
  { key: 'emergencyContact', label: 'Notfallkontakt', type: 'text' as const },
  { key: 'emergencyPhone', label: 'Notfall-Telefon', type: 'text' as const },
  { key: 'licenseNumber', label: 'Lizenznummer', type: 'text' as const },
  { key: 'healthInsurance', label: 'Krankenkasse', type: 'text' as const },
  { key: 'newsletter', label: 'Newsletter abonniert', type: 'checkbox' as const },
];

export const members: Member[] = [
  {
    id: '1', memberNumber: 'M-2023-001', firstName: 'Anna', lastName: 'Schmidt',
    email: 'anna.schmidt@example.de', phone: '089 123456', mobile: '0171 1234567',
    birthDate: '15.03.1990', gender: 'weiblich',
    street: 'Hauptstraße 12', zip: '80331', city: 'München',
    status: 'Aktiv', roles: ['Mitglied', 'Trainer'], groups: ['Damen 1', 'Yoga-Gruppe'],
    joinDate: '01.01.2023', avatarInitials: 'AS',
    customFields: { beltColor: 'Braun', jerseyNumber: '7', bloodType: 'A+', emergencyContact: 'Peter Schmidt', emergencyPhone: '0171 9876543', newsletter: 'true' },
    familyId: 'f1', familyRelation: 'Partner',
  },
  {
    id: '2', memberNumber: 'M-2023-002', firstName: 'Peter', lastName: 'Weber',
    email: 'peter.weber@example.de', phone: '089 234567', mobile: '0172 2345678',
    birthDate: '22.07.1985', gender: 'männlich',
    street: 'Bahnhofstraße 5', zip: '80335', city: 'München',
    status: 'Aktiv', roles: ['Mitglied', 'Vorstand', 'Kassierer'], groups: ['Herren 1'],
    joinDate: '15.06.2021', avatarInitials: 'PW',
    customFields: { jerseyNumber: '10', bloodType: 'B+', emergencyContact: 'Lisa Weber', emergencyPhone: '0172 8765432', newsletter: 'true' },
  },
  {
    id: '3', memberNumber: 'M-2022-003', firstName: 'Maria', lastName: 'Braun',
    email: 'maria.braun@example.de', phone: '089 345678', mobile: '0173 3456789',
    birthDate: '08.11.1995', gender: 'weiblich',
    street: 'Gartenweg 8', zip: '80339', city: 'München',
    status: 'Inaktiv', roles: ['Mitglied'], groups: ['Yoga-Gruppe'],
    joinDate: '01.03.2022', avatarInitials: 'MB',
    customFields: { beltColor: 'Gelb', newsletter: 'false' },
  },
  {
    id: '4', memberNumber: 'M-2023-004', firstName: 'Thomas', lastName: 'Fischer',
    email: 'thomas.fischer@example.de', phone: '089 456789', mobile: '0174 4567890',
    birthDate: '30.01.1988', gender: 'männlich',
    street: 'Schulstraße 22', zip: '80333', city: 'München',
    status: 'Aktiv', roles: ['Mitglied', 'Schiedsrichter'], groups: ['Herren 1', 'Herren 2'],
    joinDate: '11.09.2023', avatarInitials: 'TF',
    customFields: { jerseyNumber: '3', bloodType: '0+', emergencyContact: 'Sabine Fischer', emergencyPhone: '0174 1234567', licenseNumber: 'SR-2023-445', newsletter: 'true' },
  },
  {
    id: '5', memberNumber: 'M-2021-005', firstName: 'Laura', lastName: 'Hoffmann',
    email: 'laura.hoffmann@example.de', phone: '089 567890', mobile: '0175 5678901',
    birthDate: '14.06.1992', gender: 'weiblich',
    street: 'Ringstraße 15', zip: '80336', city: 'München',
    status: 'Ausstehend', roles: ['Mitglied'], groups: ['Lauftreff'],
    joinDate: '03.04.2021', avatarInitials: 'LH',
    customFields: { bloodType: 'AB-', newsletter: 'true' },
  },
  {
    id: '6', memberNumber: 'M-2024-006', firstName: 'Markus', lastName: 'Schneider',
    email: 'markus.schneider@example.de', phone: '089 678901', mobile: '0176 6789012',
    birthDate: '19.09.1980', gender: 'männlich',
    street: 'Kirchplatz 3', zip: '80337', city: 'München',
    status: 'Aktiv', roles: ['Mitglied', 'Jugendwart'], groups: ['A-Jugend', 'B-Jugend'],
    joinDate: '15.01.2024', avatarInitials: 'MS',
    customFields: { emergencyContact: 'Karin Schneider', emergencyPhone: '0176 1111111', newsletter: 'true' },
    familyId: 'f2', familyRelation: 'Elternteil',
  },
  {
    id: '7', memberNumber: 'M-2024-007', firstName: 'Sophie', lastName: 'Müller',
    email: 'sophie.mueller@example.de', phone: '', mobile: '0177 7890123',
    birthDate: '25.04.2008', gender: 'weiblich',
    street: 'Waldweg 7', zip: '80338', city: 'München',
    status: 'Aktiv', roles: ['Mitglied'], groups: ['B-Jugend'],
    joinDate: '01.02.2024', avatarInitials: 'SM',
    customFields: { beltColor: 'Orange', emergencyContact: 'Claudia Müller', emergencyPhone: '0177 2222222', newsletter: 'false' },
  },
  {
    id: '8', memberNumber: 'M-2022-008', firstName: 'Klaus', lastName: 'Wagner',
    email: 'klaus.wagner@example.de', phone: '089 890123', mobile: '0178 8901234',
    birthDate: '03.12.1975', gender: 'männlich',
    street: 'Marktstraße 19', zip: '80331', city: 'München',
    status: 'Aktiv', roles: ['Mitglied', 'Platzwart'], groups: ['Senioren'],
    joinDate: '20.08.2022', avatarInitials: 'KW',
    customFields: { bloodType: 'A-', healthInsurance: 'AOK Bayern', newsletter: 'true' },
  },
  {
    id: '9', memberNumber: 'M-2023-009', firstName: 'Julia', lastName: 'Becker',
    email: 'julia.becker@example.de', phone: '089 901234', mobile: '0179 9012345',
    birthDate: '17.08.1998', gender: 'weiblich',
    street: 'Blumenstraße 4', zip: '80332', city: 'München',
    status: 'Aktiv', roles: ['Mitglied', 'Trainer'], groups: ['Damen 1', 'C-Jugend'],
    joinDate: '05.05.2023', avatarInitials: 'JB',
    customFields: { beltColor: 'Schwarz', jerseyNumber: '14', licenseNumber: 'TR-2023-112', newsletter: 'true' },
  },
  {
    id: '10', memberNumber: 'M-2020-010', firstName: 'Hans', lastName: 'Richter',
    email: 'hans.richter@example.de', phone: '089 012345', mobile: '0170 0123456',
    birthDate: '28.02.1970', gender: 'männlich',
    street: 'Bergstraße 31', zip: '80334', city: 'München',
    status: 'Aktiv', roles: ['Mitglied', 'Vorstand', 'Schriftführer'], groups: ['Senioren', 'Herren 2'],
    joinDate: '01.01.2020', avatarInitials: 'HR',
    customFields: { bloodType: '0-', healthInsurance: 'TK', emergencyContact: 'Helga Richter', emergencyPhone: '0170 5555555', newsletter: 'true' },
  },
  {
    id: '11', memberNumber: 'M-2024-011', firstName: 'Lena', lastName: 'Koch',
    email: 'lena.koch@example.de', phone: '', mobile: '0171 1112233',
    birthDate: '12.05.2005', gender: 'weiblich',
    street: 'Sonnenallee 9', zip: '80335', city: 'München',
    status: 'Aktiv', roles: ['Mitglied'], groups: ['A-Jugend'],
    joinDate: '10.03.2024', avatarInitials: 'LK',
    customFields: { beltColor: 'Grün', jerseyNumber: '22', newsletter: 'false' },
    familyId: 'f3', familyRelation: 'Kind',
  },
  {
    id: '12', memberNumber: 'M-2021-012', firstName: 'Stefan', lastName: 'Koch',
    email: 'stefan.koch@example.de', phone: '089 3334455', mobile: '0172 3334455',
    birthDate: '09.10.1978', gender: 'männlich',
    street: 'Sonnenallee 9', zip: '80335', city: 'München',
    status: 'Aktiv', roles: ['Mitglied'], groups: ['Herren 2'],
    joinDate: '15.07.2021', avatarInitials: 'SK',
    customFields: { jerseyNumber: '5', bloodType: 'B-', newsletter: 'true' },
    familyId: 'f3', familyRelation: 'Elternteil',
  },
  {
    id: '13', memberNumber: 'M-2023-013', firstName: 'Monika', lastName: 'Hartmann',
    email: 'monika.hartmann@example.de', phone: '089 4445566', mobile: '0173 4445566',
    birthDate: '21.09.1965', gender: 'weiblich',
    street: 'Lindenstraße 16', zip: '80336', city: 'München',
    status: 'Inaktiv', roles: ['Mitglied'], groups: ['Senioren'],
    joinDate: '01.06.2023', avatarInitials: 'MH',
    customFields: { healthInsurance: 'Barmer', newsletter: 'false' },
  },
  {
    id: '14', memberNumber: 'M-2024-014', firstName: 'Felix', lastName: 'Zimmermann',
    email: 'felix.zimmermann@example.de', phone: '', mobile: '0174 5556677',
    birthDate: '07.03.2010', gender: 'männlich',
    street: 'Eichenweg 2', zip: '80337', city: 'München',
    status: 'Aktiv', roles: ['Mitglied'], groups: ['C-Jugend'],
    joinDate: '20.01.2024', avatarInitials: 'FZ',
    customFields: { beltColor: 'Weiß', emergencyContact: 'Andrea Zimmermann', emergencyPhone: '0174 9998877', newsletter: 'false' },
    familyId: 'f2', familyRelation: 'Kind',
  },
  {
    id: '15', memberNumber: 'M-2022-015', firstName: 'Claudia', lastName: 'Schäfer',
    email: 'claudia.schaefer@example.de', phone: '089 6667788', mobile: '0175 6667788',
    birthDate: '02.12.1993', gender: 'weiblich',
    street: 'Parkstraße 28', zip: '80338', city: 'München',
    status: 'Aktiv', roles: ['Mitglied', 'Trainer'], groups: ['Yoga-Gruppe', 'Lauftreff'],
    joinDate: '12.11.2022', avatarInitials: 'CS',
    customFields: { licenseNumber: 'TR-2022-098', newsletter: 'true' },
  },
];

export const upcomingEvents: Event[] = [
  { id: 'e1', title: 'A-Jugend Training', date: '17.03.2026', time: '18:00', type: 'Training', participants: 12, maxParticipants: 20, status: 'Offen' },
  { id: 'e2', title: 'Yoga Montag', date: '18.03.2026', time: '10:00', type: 'Kurs', participants: 15, maxParticipants: 15, status: 'Voll' },
  { id: 'e3', title: 'Herren 1 Ligaspiel', date: '19.03.2026', time: '19:30', type: 'Termin', participants: 16, maxParticipants: 22, status: 'Offen' },
  { id: 'e4', title: 'Vorstandssitzung', date: '20.03.2026', time: '20:00', type: 'Termin', participants: 5, maxParticipants: 8, status: 'Offen' },
  { id: 'e5', title: 'Lauftreff Samstag', date: '22.03.2026', time: '09:00', type: 'Training', participants: 8, maxParticipants: 30, status: 'Offen' },
];

export const recentActivities: ActivityItem[] = [
  { id: 'a1', memberId: '7', memberName: 'Sophie Müller', initials: 'SM', action: 'hat sich für den Judo-Kurs angemeldet', time: 'Vor 2 Stunden' },
  { id: 'a2', memberId: '2', memberName: 'Peter Weber', initials: 'PW', action: 'hat eine Rechnung bezahlt (45,00 €)', time: 'Vor 3 Stunden' },
  { id: 'a3', memberId: '1', memberName: 'Anna Schmidt', initials: 'AS', action: 'hat das Training "Damen 1" geleitet', time: 'Vor 5 Stunden' },
  { id: 'a4', memberId: '11', memberName: 'Lena Koch', initials: 'LK', action: 'wurde als Mitglied aufgenommen', time: 'Gestern' },
  { id: 'a5', memberId: '8', memberName: 'Klaus Wagner', initials: 'KW', action: 'hat seine Adresse aktualisiert', time: 'Vor 2 Tagen' },
  { id: 'a6', memberId: '9', memberName: 'Julia Becker', initials: 'JB', action: 'hat einen neuen Kurs erstellt', time: 'Vor 2 Tagen' },
];

export const memberGrowthData = [
  { month: 'Apr 25', newMembers: 8, departures: 2 },
  { month: 'Mai 25', newMembers: 12, departures: 3 },
  { month: 'Jun 25', newMembers: 6, departures: 1 },
  { month: 'Jul 25', newMembers: 4, departures: 4 },
  { month: 'Aug 25', newMembers: 9, departures: 2 },
  { month: 'Sep 25', newMembers: 15, departures: 5 },
  { month: 'Okt 25', newMembers: 7, departures: 3 },
  { month: 'Nov 25', newMembers: 5, departures: 2 },
  { month: 'Dez 25', newMembers: 3, departures: 6 },
  { month: 'Jan 26', newMembers: 14, departures: 4 },
  { month: 'Feb 26', newMembers: 10, departures: 3 },
  { month: 'Mär 26', newMembers: 12, departures: 1 },
];

// Per-member data helpers
export function getMemberRoleAssignments(memberId: string): RoleAssignment[] {
  const m = members.find((x) => x.id === memberId);
  if (!m) return [];
  return m.roles.map((r) => ({ role: r, startDate: m.joinDate }));
}

export function getMemberCourses(memberId: string): CourseRegistration[] {
  const map: Record<string, CourseRegistration[]> = {
    '1': [
      { id: 'cr1', title: 'Yoga Montag', type: 'Kurs', period: '01.01.2026 – laufend', status: 'Angemeldet' },
      { id: 'cr2', title: 'Damen 1 Training', type: 'Kurs', period: '01.09.2025 – laufend', status: 'Angemeldet' },
      { id: 'cr3', title: 'Sommerfest 2025', type: 'Termin', period: '15.07.2025', status: 'Teilgenommen' },
    ],
    '2': [
      { id: 'cr4', title: 'Herren 1 Training', type: 'Kurs', period: '01.08.2025 – laufend', status: 'Angemeldet' },
      { id: 'cr5', title: 'Vorstandssitzung Mär', type: 'Termin', period: '20.03.2026', status: 'Angemeldet' },
    ],
  };
  return map[memberId] || [
    { id: 'cr-default', title: 'Allgemeines Training', type: 'Kurs', period: '01.01.2026 – laufend', status: 'Angemeldet' },
  ];
}

export function getMemberAttendance(memberId: string): { rate: number; lastPresent: string; absencesQuarter: number; records: AttendanceRecord[] } {
  return {
    rate: memberId === '3' ? 45 : memberId === '5' ? 0 : 78 + (parseInt(memberId) % 20),
    lastPresent: memberId === '5' ? '–' : '14.03.2026',
    absencesQuarter: parseInt(memberId) % 5,
    records: [
      { id: 'at1', date: '14.03.2026', eventTitle: 'A-Jugend Training', status: 'Anwesend' },
      { id: 'at2', date: '12.03.2026', eventTitle: 'Yoga Montag', status: 'Anwesend' },
      { id: 'at3', date: '10.03.2026', eventTitle: 'Herren 1 Training', status: 'Entschuldigt' },
      { id: 'at4', date: '07.03.2026', eventTitle: 'A-Jugend Training', status: 'Anwesend' },
      { id: 'at5', date: '05.03.2026', eventTitle: 'Lauftreff', status: 'Abwesend' },
      { id: 'at6', date: '03.03.2026', eventTitle: 'Yoga Montag', status: 'Anwesend' },
    ],
  };
}

export function getMemberInvoices(memberId: string): Invoice[] {
  const base: Invoice[] = [
    { id: 'inv1', number: `RE-2026-${memberId.padStart(3, '0')}1`, date: '01.01.2026', amount: '120,00 €', status: 'Bezahlt', description: 'Jahresbeitrag 2026' },
    { id: 'inv2', number: `RE-2025-${memberId.padStart(3, '0')}2`, date: '01.07.2025', amount: '60,00 €', status: 'Bezahlt', description: 'Halbjahresbeitrag 2/2025' },
    { id: 'inv3', number: `RE-2026-${memberId.padStart(3, '0')}3`, date: '01.03.2026', amount: '25,00 €', status: 'Offen', description: 'Kursgebühr Yoga' },
  ];
  if (memberId === '5') {
    base.push({ id: 'inv4', number: 'RE-2025-0054', date: '01.01.2025', amount: '120,00 €', status: 'Überfällig', description: 'Jahresbeitrag 2025' });
  }
  return base;
}

export function getMemberFamily(memberId: string): { familyName: string; discount: number; totalFee: string; members: FamilyMember[] } | null {
  const m = members.find((x) => x.id === memberId);
  if (!m?.familyId) return null;

  const familyMembers = members.filter((x) => x.familyId === m.familyId && x.id !== memberId);
  const familyMap: Record<string, { name: string; discount: number; fee: string }> = {
    f1: { name: 'Familie Schmidt', discount: 10, fee: '216,00 €' },
    f2: { name: 'Familie Schneider', discount: 15, fee: '204,00 €' },
    f3: { name: 'Familie Koch', discount: 10, fee: '216,00 €' },
  };
  const info = familyMap[m.familyId] || { name: 'Familie', discount: 0, fee: '0,00 €' };

  return {
    familyName: info.name,
    discount: info.discount,
    totalFee: info.fee,
    members: familyMembers.map((fm) => ({
      memberId: fm.id,
      name: `${fm.firstName} ${fm.lastName}`,
      initials: fm.avatarInitials,
      relation: (fm.familyRelation as FamilyMember['relation']) || 'Mitglied' as any,
    })),
  };
}
