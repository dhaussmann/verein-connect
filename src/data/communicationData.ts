export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  initials: string;
  isGroup: boolean;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: ChatMessage[];
}

export interface SentMessage {
  id: string;
  subject: string;
  channel: 'email' | 'push' | 'sms';
  recipients: string;
  sentDate: string;
  status: 'Gesendet' | 'Entwurf' | 'Geplant';
}

export interface MessageTemplate {
  id: string;
  name: string;
  channel: 'email' | 'push' | 'sms';
  subject: string;
  body: string;
}

export const conversations: Conversation[] = [
  {
    id: 'c1', name: 'Trainer-Gruppe', initials: 'TG', isGroup: true,
    lastMessage: 'Nächste Woche fällt das Training aus', lastTime: '14:32', unread: 3,
    messages: [
      { id: 'm1', senderId: '1', senderName: 'Anna Schmidt', senderInitials: 'AS', text: 'Hallo zusammen! Wer kann nächste Woche das Training übernehmen?', timestamp: '12:00', isOwn: false },
      { id: 'm2', senderId: 'self', senderName: 'Du', senderInitials: 'MV', text: 'Ich könnte Dienstag einspringen.', timestamp: '12:15', isOwn: true },
      { id: 'm3', senderId: '9', senderName: 'Julia Becker', senderInitials: 'JB', text: 'Donnerstag kann ich übernehmen.', timestamp: '12:30', isOwn: false },
      { id: 'm4', senderId: '1', senderName: 'Anna Schmidt', senderInitials: 'AS', text: 'Super, danke euch beiden! 🙏', timestamp: '12:45', isOwn: false },
      { id: 'm5', senderId: '15', senderName: 'Claudia Schäfer', senderInitials: 'CS', text: 'Soll ich die Hallenbuchung für Dienstag ändern?', timestamp: '13:10', isOwn: false },
      { id: 'm6', senderId: 'self', senderName: 'Du', senderInitials: 'MV', text: 'Ja bitte, gleiche Uhrzeit wie immer.', timestamp: '13:25', isOwn: true },
      { id: 'm7', senderId: '15', senderName: 'Claudia Schäfer', senderInitials: 'CS', text: 'Erledigt! Halle 1 ist reserviert.', timestamp: '14:00', isOwn: false },
      { id: 'm8', senderId: '9', senderName: 'Julia Becker', senderInitials: 'JB', text: 'Nächste Woche fällt das Training aus', timestamp: '14:32', isOwn: false },
    ],
  },
  {
    id: 'c2', name: 'Vorstand', initials: 'VS', isGroup: true,
    lastMessage: 'Tagesordnung ist fertig', lastTime: '10:15', unread: 0,
    messages: [
      { id: 'm9', senderId: '2', senderName: 'Peter Weber', senderInitials: 'PW', text: 'Die Tagesordnung für die nächste Sitzung steht.', timestamp: '09:00', isOwn: false },
      { id: 'm10', senderId: '10', senderName: 'Hans Richter', senderInitials: 'HR', text: 'Können wir den Punkt Hallenmiete noch aufnehmen?', timestamp: '09:20', isOwn: false },
      { id: 'm11', senderId: '2', senderName: 'Peter Weber', senderInitials: 'PW', text: 'Klar, ist ergänzt.', timestamp: '09:35', isOwn: false },
      { id: 'm12', senderId: 'self', senderName: 'Du', senderInitials: 'MV', text: 'Danke Peter! Sieht gut aus.', timestamp: '10:00', isOwn: true },
      { id: 'm13', senderId: '2', senderName: 'Peter Weber', senderInitials: 'PW', text: 'Tagesordnung ist fertig', timestamp: '10:15', isOwn: false },
    ],
  },
  {
    id: 'c3', name: 'Anna Schmidt', initials: 'AS', isGroup: false,
    lastMessage: 'Die Hallenzeiten sind bestätigt', lastTime: 'Gestern', unread: 1,
    messages: [
      { id: 'm14', senderId: '1', senderName: 'Anna Schmidt', senderInitials: 'AS', text: 'Hi! Hast du die neuen Hallenzeiten schon bekommen?', timestamp: 'Gestern 15:00', isOwn: false },
      { id: 'm15', senderId: 'self', senderName: 'Du', senderInitials: 'MV', text: 'Noch nicht. Wann kommen die?', timestamp: 'Gestern 15:30', isOwn: true },
      { id: 'm16', senderId: '1', senderName: 'Anna Schmidt', senderInitials: 'AS', text: 'Die Hallenzeiten sind bestätigt', timestamp: 'Gestern 16:00', isOwn: false },
    ],
  },
  {
    id: 'c4', name: 'Peter Weber', initials: 'PW', isGroup: false,
    lastMessage: 'Rechnung ist raus', lastTime: 'Mo', unread: 0,
    messages: [
      { id: 'm17', senderId: 'self', senderName: 'Du', senderInitials: 'MV', text: 'Peter, kannst du die Rechnung für die Hallenmiete rausschicken?', timestamp: 'Mo 09:00', isOwn: true },
      { id: 'm18', senderId: '2', senderName: 'Peter Weber', senderInitials: 'PW', text: 'Rechnung ist raus', timestamp: 'Mo 11:00', isOwn: false },
    ],
  },
  {
    id: 'c5', name: 'Julia Becker', initials: 'JB', isGroup: false,
    lastMessage: 'Alles klar, bis dann!', lastTime: 'Fr', unread: 0,
    messages: [
      { id: 'm19', senderId: '9', senderName: 'Julia Becker', senderInitials: 'JB', text: 'Können wir den C-Jugend Trainingsplan besprechen?', timestamp: 'Fr 14:00', isOwn: false },
      { id: 'm20', senderId: 'self', senderName: 'Du', senderInitials: 'MV', text: 'Klar, morgen nach dem Training?', timestamp: 'Fr 14:15', isOwn: true },
      { id: 'm21', senderId: '9', senderName: 'Julia Becker', senderInitials: 'JB', text: 'Alles klar, bis dann!', timestamp: 'Fr 14:20', isOwn: false },
    ],
  },
];

export const sentMessages: SentMessage[] = [
  { id: 'sm1', subject: 'Jahreshauptversammlung 2026', channel: 'email', recipients: 'Alle Mitglieder', sentDate: '10.03.2026', status: 'Gesendet' },
  { id: 'sm2', subject: 'Trainingsplan Frühling 2026', channel: 'email', recipients: 'Trainer', sentDate: '05.03.2026', status: 'Gesendet' },
  { id: 'sm3', subject: 'Beitragserhöhung ab April', channel: 'email', recipients: 'Alle Mitglieder', sentDate: '01.03.2026', status: 'Gesendet' },
  { id: 'sm4', subject: 'A-Jugend Turnier Einladung', channel: 'push', recipients: 'A-Jugend', sentDate: '28.02.2026', status: 'Gesendet' },
  { id: 'sm5', subject: 'Hallensperrung 22.03.', channel: 'push', recipients: 'Alle Mitglieder', sentDate: '15.03.2026', status: 'Gesendet' },
  { id: 'sm6', subject: 'Ostercamp Anmeldung', channel: 'email', recipients: 'Jugend', sentDate: '12.03.2026', status: 'Geplant' },
  { id: 'sm7', subject: 'Newsletter April 2026', channel: 'email', recipients: 'Newsletter-Abonnenten', sentDate: '', status: 'Entwurf' },
  { id: 'sm8', subject: 'Zahlungserinnerung März', channel: 'sms', recipients: '5 Mitglieder', sentDate: '14.03.2026', status: 'Gesendet' },
  { id: 'sm9', subject: 'Sommerfest Save-the-Date', channel: 'email', recipients: 'Alle Mitglieder', sentDate: '', status: 'Entwurf' },
  { id: 'sm10', subject: 'Trainingsausfall 18.03.', channel: 'push', recipients: 'Herren 1', sentDate: '16.03.2026', status: 'Gesendet' },
];

export const messageTemplates: MessageTemplate[] = [
  { id: 'mt1', name: 'Willkommen neues Mitglied', channel: 'email', subject: 'Willkommen bei {{verein}}!', body: 'Liebe/r {{vorname}} {{nachname}},\n\nwir freuen uns, dich als neues Mitglied bei {{verein}} begrüßen zu dürfen!\n\nDein Beitrittsdatum: {{datum}}\n\nMit sportlichen Grüßen,\nDein Vereinsvorstand' },
  { id: 'mt2', name: 'Kursabsage', channel: 'email', subject: 'Absage: {{kurs}} am {{datum}}', body: 'Liebe Teilnehmer,\n\nleider muss der Kurs "{{kurs}}" am {{datum}} ausfallen.\n\nWir informieren euch über den Ersatztermin.\n\nMit freundlichen Grüßen' },
  { id: 'mt3', name: 'Zahlungserinnerung', channel: 'email', subject: 'Zahlungserinnerung – {{verein}}', body: 'Liebe/r {{vorname}},\n\nwir möchten dich freundlich an die offene Zahlung in Höhe von {{betrag}} erinnern.\n\nBitte überweise den Betrag bis zum {{datum}}.\n\nMit freundlichen Grüßen,\n{{verein}}' },
  { id: 'mt4', name: 'Trainingsinfo Push', channel: 'push', subject: 'Training heute', body: 'Heute {{datum}} findet das Training "{{kurs}}" um {{uhrzeit}} statt. Bitte pünktlich erscheinen!' },
];

export const placeholderTags = ['{{vorname}}', '{{nachname}}', '{{verein}}', '{{kurs}}', '{{datum}}', '{{uhrzeit}}', '{{betrag}}'];
