export interface RoleDefinition {
  id: string;
  name: string;
  category: 'System' | 'Verein' | 'Sport';
  memberCount: number;
  isSystem: boolean;
  description: string;
  parentRole?: string;
  maxMembers?: number;
  permissions: Record<string, string[]>;
}

export interface FieldDefinition {
  id: string;
  internalName: string;
  displayName: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'url';
  options?: string[];
  required: boolean;
  searchable: boolean;
  showInRegistration: boolean;
  gdprDeleteDays: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  userInitials: string;
  action: string;
  details: string;
}

export const roles: RoleDefinition[] = [
  { id: 'r1', name: 'Administrator', category: 'System', memberCount: 2, isSystem: true, description: 'Vollzugriff auf alle Bereiche', permissions: { Mitglieder: ['Lesen', 'Erstellen', 'Bearbeiten', 'Löschen'], Kurse: ['Lesen', 'Erstellen', 'Bearbeiten', 'Löschen'], Termine: ['Lesen', 'Erstellen', 'Bearbeiten', 'Löschen'], Finanzen: ['Lesen', 'Erstellen', 'Bearbeiten', 'Löschen'], Kommunikation: ['Lesen', 'Erstellen', 'Bearbeiten', 'Löschen'], Shop: ['Lesen', 'Erstellen', 'Bearbeiten', 'Löschen'], Dateien: ['Lesen', 'Erstellen', 'Bearbeiten', 'Löschen'], Einstellungen: ['Lesen', 'Erstellen', 'Bearbeiten', 'Löschen'] } },
  { id: 'r2', name: 'Vorstand', category: 'Verein', memberCount: 3, isSystem: false, description: 'Erweiterte Verwaltungsrechte', parentRole: 'Administrator', permissions: { Mitglieder: ['Lesen', 'Erstellen', 'Bearbeiten'], Kurse: ['Lesen', 'Erstellen', 'Bearbeiten'], Termine: ['Lesen', 'Erstellen', 'Bearbeiten', 'Löschen'], Finanzen: ['Lesen', 'Erstellen', 'Bearbeiten'], Kommunikation: ['Lesen', 'Erstellen', 'Bearbeiten'], Shop: ['Lesen', 'Erstellen', 'Bearbeiten'], Dateien: ['Lesen', 'Erstellen', 'Bearbeiten'], Einstellungen: ['Lesen'] } },
  { id: 'r3', name: 'Kassierer', category: 'Verein', memberCount: 1, isSystem: false, description: 'Finanzverwaltung', parentRole: 'Vorstand', permissions: { Mitglieder: ['Lesen'], Finanzen: ['Lesen', 'Erstellen', 'Bearbeiten', 'Löschen'], Kommunikation: ['Lesen', 'Erstellen'] } },
  { id: 'r4', name: 'Trainer', category: 'Sport', memberCount: 4, isSystem: false, description: 'Kurs- und Trainingsleitung', permissions: { Mitglieder: ['Lesen'], Kurse: ['Lesen', 'Erstellen', 'Bearbeiten'], Termine: ['Lesen', 'Erstellen', 'Bearbeiten'], Kommunikation: ['Lesen', 'Erstellen'] } },
  { id: 'r5', name: 'Jugendwart', category: 'Sport', memberCount: 1, isSystem: false, description: 'Jugendabteilung Verwaltung', permissions: { Mitglieder: ['Lesen'], Kurse: ['Lesen', 'Bearbeiten'], Termine: ['Lesen', 'Erstellen'] } },
  { id: 'r6', name: 'Mitglied', category: 'System', memberCount: 15, isSystem: true, description: 'Basis-Mitgliedsrechte', permissions: { Mitglieder: ['Lesen'], Kurse: ['Lesen'], Termine: ['Lesen'] } },
];

export const fieldDefinitions: FieldDefinition[] = [
  { id: 'fd1', internalName: 'firstName', displayName: 'Vorname', type: 'text', required: true, searchable: true, showInRegistration: true, gdprDeleteDays: 0 },
  { id: 'fd2', internalName: 'lastName', displayName: 'Nachname', type: 'text', required: true, searchable: true, showInRegistration: true, gdprDeleteDays: 0 },
  { id: 'fd3', internalName: 'birthDate', displayName: 'Geburtsdatum', type: 'date', required: false, searchable: false, showInRegistration: true, gdprDeleteDays: 365 },
  { id: 'fd4', internalName: 'email', displayName: 'E-Mail', type: 'text', required: true, searchable: true, showInRegistration: true, gdprDeleteDays: 90 },
  { id: 'fd5', internalName: 'phone', displayName: 'Telefon', type: 'text', required: false, searchable: false, showInRegistration: false, gdprDeleteDays: 90 },
  { id: 'fd6', internalName: 'beltColor', displayName: 'Gürtelfarbe', type: 'select', options: ['Weiß', 'Gelb', 'Orange', 'Grün', 'Blau', 'Braun', 'Schwarz'], required: false, searchable: true, showInRegistration: false, gdprDeleteDays: 0 },
  { id: 'fd7', internalName: 'jerseyNumber', displayName: 'Trikotnummer', type: 'number', required: false, searchable: true, showInRegistration: false, gdprDeleteDays: 0 },
  { id: 'fd8', internalName: 'bloodType', displayName: 'Blutgruppe', type: 'select', options: ['A+', 'A-', 'B+', 'B-', '0+', '0-', 'AB+', 'AB-'], required: false, searchable: false, showInRegistration: false, gdprDeleteDays: 365 },
  { id: 'fd9', internalName: 'emergencyContact', displayName: 'Notfallkontakt', type: 'text', required: false, searchable: false, showInRegistration: true, gdprDeleteDays: 90 },
  { id: 'fd10', internalName: 'newsletter', displayName: 'Newsletter abonniert', type: 'checkbox', required: false, searchable: false, showInRegistration: true, gdprDeleteDays: 0 },
];

export const auditLog: AuditLogEntry[] = [
  { id: 'al1', timestamp: '17.03.2026 14:32', user: 'Max Vereinsadmin', userInitials: 'MV', action: 'Mitglied erstellt', details: 'Neues Mitglied: Felix Zimmermann (M-2024-014)' },
  { id: 'al2', timestamp: '17.03.2026 13:15', user: 'Peter Weber', userInitials: 'PW', action: 'Rechnung gesendet', details: 'RE-2026-006 an Markus Schneider' },
  { id: 'al3', timestamp: '17.03.2026 11:00', user: 'Anna Schmidt', userInitials: 'AS', action: 'Kurs bearbeitet', details: 'Yoga Montag: Max. Teilnehmer von 12 auf 15 geändert' },
  { id: 'al4', timestamp: '16.03.2026 20:45', user: 'Max Vereinsadmin', userInitials: 'MV', action: 'Rolle zugewiesen', details: 'Julia Becker → Trainer' },
  { id: 'al5', timestamp: '16.03.2026 18:30', user: 'Julia Becker', userInitials: 'JB', action: 'Termin erstellt', details: 'B-Jugend Freundschaftsspiel am 25.03.2026' },
  { id: 'al6', timestamp: '16.03.2026 15:00', user: 'Peter Weber', userInitials: 'PW', action: 'Export durchgeführt', details: 'Mitgliederliste als CSV exportiert (15 Einträge)' },
  { id: 'al7', timestamp: '15.03.2026 22:10', user: 'Max Vereinsadmin', userInitials: 'MV', action: 'Einstellung geändert', details: 'Push-Benachrichtigungen aktiviert' },
  { id: 'al8', timestamp: '15.03.2026 16:45', user: 'Klaus Wagner', userInitials: 'KW', action: 'Datei hochgeladen', details: 'Hallenplan_2026.pdf in Dokumente' },
  { id: 'al9', timestamp: '15.03.2026 14:20', user: 'Anna Schmidt', userInitials: 'AS', action: 'Anwesenheit erfasst', details: 'Yoga Montag: 14/15 anwesend' },
  { id: 'al10', timestamp: '14.03.2026 19:30', user: 'Max Vereinsadmin', userInitials: 'MV', action: 'Mitglied deaktiviert', details: 'Maria Braun auf Inaktiv gesetzt' },
  { id: 'al11', timestamp: '14.03.2026 17:00', user: 'Markus Schneider', userInitials: 'MS', action: 'Nachricht gesendet', details: 'Push an A-Jugend: Trainingsausfall' },
  { id: 'al12', timestamp: '14.03.2026 10:15', user: 'Peter Weber', userInitials: 'PW', action: 'Zahlung markiert', details: 'RE-2026-001 als bezahlt markiert' },
  { id: 'al13', timestamp: '13.03.2026 21:00', user: 'Max Vereinsadmin', userInitials: 'MV', action: 'Profilfeld erstellt', details: 'Neues Feld: Blutgruppe (Auswahl)' },
  { id: 'al14', timestamp: '13.03.2026 16:30', user: 'Julia Becker', userInitials: 'JB', action: 'Kurs erstellt', details: 'Neuer Kurs: Schwimmkurs Kinder' },
  { id: 'al15', timestamp: '12.03.2026 14:00', user: 'Hans Richter', userInitials: 'HR', action: 'Satzung aktualisiert', details: 'Vereinssatzung_2026.pdf hochgeladen' },
  { id: 'al16', timestamp: '12.03.2026 09:00', user: 'Max Vereinsadmin', userInitials: 'MV', action: 'DSGVO-Export', details: 'Datenexport für Mitglied #3 (Maria Braun)' },
  { id: 'al17', timestamp: '11.03.2026 18:45', user: 'Claudia Schäfer', userInitials: 'CS', action: 'Termin bearbeitet', details: 'Lauftreff Samstag: Treffpunkt geändert' },
  { id: 'al18', timestamp: '11.03.2026 11:30', user: 'Peter Weber', userInitials: 'PW', action: 'Produkt erstellt', details: 'Neues Produkt: Vereinsschal (15,00 €)' },
  { id: 'al19', timestamp: '10.03.2026 20:00', user: 'Max Vereinsadmin', userInitials: 'MV', action: 'Rolle bearbeitet', details: 'Trainer: Berechtigung "Kurse löschen" entfernt' },
  { id: 'al20', timestamp: '10.03.2026 15:15', user: 'Anna Schmidt', userInitials: 'AS', action: 'Familienmitglied verknüpft', details: 'Sophie Müller mit Familie Schmidt verknüpft' },
];

export const permissionCategories = ['Mitglieder', 'Kurse', 'Termine', 'Finanzen', 'Kommunikation', 'Shop', 'Dateien', 'Einstellungen'];
export const permissionActions = ['Lesen', 'Erstellen', 'Bearbeiten', 'Löschen'];

export const retentionPolicies = [
  { dataType: 'Kontaktdaten', days: 90, description: 'Nach Austritt' },
  { dataType: 'Finanzdaten', days: 3650, description: '10 Jahre gesetzlich' },
  { dataType: 'Gesundheitsdaten', days: 365, description: 'Nach Austritt' },
  { dataType: 'Kommunikation', days: 180, description: 'Nach letzter Aktivität' },
  { dataType: 'Anwesenheitsdaten', days: 730, description: '2 Jahre' },
  { dataType: 'Fotos/Medien', days: 365, description: 'Nach Austritt' },
];
