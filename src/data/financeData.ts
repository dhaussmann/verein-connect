export interface FinanceInvoice {
  id: string;
  number: string;
  memberId: string;
  memberName: string;
  memberInitials: string;
  date: string;
  dueDate: string;
  amount: string;
  amountRaw: number;
  status: 'Entwurf' | 'Gesendet' | 'Bezahlt' | 'Überfällig' | 'Storniert';
  description: string;
  positions: { description: string; quantity: number; unitPrice: string; total: string }[];
  timeline: { step: string; date?: string }[];
}

export interface AccountingEntry {
  id: string;
  date: string;
  type: 'Einnahme' | 'Ausgabe';
  category: string;
  description: string;
  amount: string;
  amountRaw: number;
  receipt?: string;
}

export interface MonthlyFinance {
  month: string;
  income: number;
  expenses: number;
}

export const invoices: FinanceInvoice[] = [
  { id: 'fi1', number: 'RE-2026-001', memberId: '1', memberName: 'Anna Schmidt', memberInitials: 'AS', date: '01.01.2026', dueDate: '31.01.2026', amount: '120,00 €', amountRaw: 120, status: 'Bezahlt', description: 'Jahresbeitrag 2026', positions: [{ description: 'Jahresbeitrag 2026', quantity: 1, unitPrice: '120,00 €', total: '120,00 €' }], timeline: [{ step: 'Erstellt', date: '01.01.2026' }, { step: 'Gesendet', date: '02.01.2026' }, { step: 'Bezahlt', date: '15.01.2026' }] },
  { id: 'fi2', number: 'RE-2026-002', memberId: '2', memberName: 'Peter Weber', memberInitials: 'PW', date: '01.01.2026', dueDate: '31.01.2026', amount: '120,00 €', amountRaw: 120, status: 'Bezahlt', description: 'Jahresbeitrag 2026', positions: [{ description: 'Jahresbeitrag 2026', quantity: 1, unitPrice: '120,00 €', total: '120,00 €' }], timeline: [{ step: 'Erstellt', date: '01.01.2026' }, { step: 'Gesendet', date: '02.01.2026' }, { step: 'Bezahlt', date: '10.01.2026' }] },
  { id: 'fi3', number: 'RE-2026-003', memberId: '5', memberName: 'Laura Hoffmann', memberInitials: 'LH', date: '01.01.2026', dueDate: '31.01.2026', amount: '120,00 €', amountRaw: 120, status: 'Überfällig', description: 'Jahresbeitrag 2026', positions: [{ description: 'Jahresbeitrag 2026', quantity: 1, unitPrice: '120,00 €', total: '120,00 €' }], timeline: [{ step: 'Erstellt', date: '01.01.2026' }, { step: 'Gesendet', date: '02.01.2026' }] },
  { id: 'fi4', number: 'RE-2026-004', memberId: '3', memberName: 'Maria Braun', memberInitials: 'MB', date: '01.02.2026', dueDate: '28.02.2026', amount: '60,00 €', amountRaw: 60, status: 'Überfällig', description: 'Halbjahresbeitrag', positions: [{ description: 'Halbjahresbeitrag 1/2026', quantity: 1, unitPrice: '60,00 €', total: '60,00 €' }], timeline: [{ step: 'Erstellt', date: '01.02.2026' }, { step: 'Gesendet', date: '02.02.2026' }] },
  { id: 'fi5', number: 'RE-2026-005', memberId: '4', memberName: 'Thomas Fischer', memberInitials: 'TF', date: '01.03.2026', dueDate: '31.03.2026', amount: '25,00 €', amountRaw: 25, status: 'Gesendet', description: 'Kursgebühr Judo', positions: [{ description: 'Kursgebühr Judo Anfänger Q1/2026', quantity: 1, unitPrice: '25,00 €', total: '25,00 €' }], timeline: [{ step: 'Erstellt', date: '01.03.2026' }, { step: 'Gesendet', date: '02.03.2026' }] },
  { id: 'fi6', number: 'RE-2026-006', memberId: '6', memberName: 'Markus Schneider', memberInitials: 'MS', date: '01.03.2026', dueDate: '31.03.2026', amount: '180,00 €', amountRaw: 180, status: 'Gesendet', description: 'Familienbeitrag', positions: [{ description: 'Familienbeitrag Schneider 2026', quantity: 1, unitPrice: '180,00 €', total: '180,00 €' }], timeline: [{ step: 'Erstellt', date: '01.03.2026' }, { step: 'Gesendet', date: '03.03.2026' }] },
  { id: 'fi7', number: 'RE-2026-007', memberId: '9', memberName: 'Julia Becker', memberInitials: 'JB', date: '15.03.2026', dueDate: '15.04.2026', amount: '45,00 €', amountRaw: 45, status: 'Entwurf', description: 'Trainerlizenz Gebühr', positions: [{ description: 'Trainerlizenz-Verlängerung', quantity: 1, unitPrice: '45,00 €', total: '45,00 €' }], timeline: [{ step: 'Erstellt', date: '15.03.2026' }] },
  { id: 'fi8', number: 'RE-2026-008', memberId: '8', memberName: 'Klaus Wagner', memberInitials: 'KW', date: '01.01.2026', dueDate: '31.01.2026', amount: '120,00 €', amountRaw: 120, status: 'Bezahlt', description: 'Jahresbeitrag', positions: [{ description: 'Jahresbeitrag 2026', quantity: 1, unitPrice: '120,00 €', total: '120,00 €' }], timeline: [{ step: 'Erstellt', date: '01.01.2026' }, { step: 'Gesendet', date: '02.01.2026' }, { step: 'Bezahlt', date: '20.01.2026' }] },
  { id: 'fi9', number: 'RE-2025-055', memberId: '13', memberName: 'Monika Hartmann', memberInitials: 'MH', date: '01.07.2025', dueDate: '31.07.2025', amount: '60,00 €', amountRaw: 60, status: 'Storniert', description: 'Halbjahresbeitrag (storniert)', positions: [{ description: 'Halbjahresbeitrag 2/2025', quantity: 1, unitPrice: '60,00 €', total: '60,00 €' }], timeline: [{ step: 'Erstellt', date: '01.07.2025' }, { step: 'Storniert', date: '15.07.2025' }] },
  { id: 'fi10', number: 'RE-2026-009', memberId: '10', memberName: 'Hans Richter', memberInitials: 'HR', date: '01.03.2026', dueDate: '31.03.2026', amount: '120,00 €', amountRaw: 120, status: 'Bezahlt', description: 'Jahresbeitrag', positions: [{ description: 'Jahresbeitrag 2026', quantity: 1, unitPrice: '120,00 €', total: '120,00 €' }], timeline: [{ step: 'Erstellt', date: '01.03.2026' }, { step: 'Gesendet', date: '02.03.2026' }, { step: 'Bezahlt', date: '12.03.2026' }] },
];

export const accountingEntries: AccountingEntry[] = [
  { id: 'ae1', date: '01.03.2026', type: 'Einnahme', category: 'Mitgliedsbeiträge', description: 'Jahresbeiträge März-Einzug', amount: '2.400,00 €', amountRaw: 2400 },
  { id: 'ae2', date: '03.03.2026', type: 'Ausgabe', category: 'Hallenmiete', description: 'Hallenmiete März 2026', amount: '850,00 €', amountRaw: 850 },
  { id: 'ae3', date: '05.03.2026', type: 'Einnahme', category: 'Kursgebühren', description: 'Yoga-Kurs Gebühren Q1', amount: '375,00 €', amountRaw: 375 },
  { id: 'ae4', date: '07.03.2026', type: 'Ausgabe', category: 'Material', description: 'Trainingsausrüstung Bälle', amount: '230,00 €', amountRaw: 230 },
  { id: 'ae5', date: '10.03.2026', type: 'Einnahme', category: 'Sponsoring', description: 'Sponsoring Stadtwerke Q1', amount: '1.500,00 €', amountRaw: 1500 },
  { id: 'ae6', date: '11.03.2026', type: 'Ausgabe', category: 'Versicherung', description: 'Sportversicherung 2026', amount: '420,00 €', amountRaw: 420 },
  { id: 'ae7', date: '12.03.2026', type: 'Einnahme', category: 'Veranstaltungen', description: 'Startgebühren Turnier', amount: '680,00 €', amountRaw: 680 },
  { id: 'ae8', date: '14.03.2026', type: 'Ausgabe', category: 'Sonstiges', description: 'Druckkosten Flyer', amount: '95,00 €', amountRaw: 95 },
  { id: 'ae9', date: '15.03.2026', type: 'Einnahme', category: 'Mitgliedsbeiträge', description: 'Nachzahlung Beiträge', amount: '240,00 €', amountRaw: 240 },
  { id: 'ae10', date: '16.03.2026', type: 'Ausgabe', category: 'Personal', description: 'Übungsleiterhonorar März', amount: '1.200,00 €', amountRaw: 1200 },
];

export const monthlyFinances: MonthlyFinance[] = [
  { month: 'Apr 25', income: 4200, expenses: 2800 },
  { month: 'Mai 25', income: 3800, expenses: 3100 },
  { month: 'Jun 25', income: 5100, expenses: 2600 },
  { month: 'Jul 25', income: 3200, expenses: 3400 },
  { month: 'Aug 25', income: 4800, expenses: 2900 },
  { month: 'Sep 25', income: 6200, expenses: 3500 },
  { month: 'Okt 25', income: 4500, expenses: 3200 },
  { month: 'Nov 25', income: 3900, expenses: 2700 },
  { month: 'Dez 25', income: 3100, expenses: 4100 },
  { month: 'Jan 26', income: 8500, expenses: 3000 },
  { month: 'Feb 26', income: 4200, expenses: 3300 },
  { month: 'Mär 26', income: 5195, expenses: 2795 },
];

export const accountingCategories = [
  'Mitgliedsbeiträge', 'Kursgebühren', 'Sponsoring', 'Veranstaltungen',
  'Hallenmiete', 'Material', 'Versicherung', 'Personal', 'Sonstiges',
];
