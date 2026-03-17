export interface FileFolder {
  id: string;
  name: string;
  parentId: string | null;
  children?: FileFolder[];
}

export interface FileItem {
  id: string;
  name: string;
  folderId: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'jpg' | 'png' | 'mp4';
  size: string;
  uploadedBy: string;
  uploadDate: string;
  accessRoles: string[];
}

export const folders: FileFolder[] = [
  { id: 'f1', name: 'Dokumente', parentId: null, children: [
    { id: 'f1a', name: 'Satzung', parentId: 'f1' },
    { id: 'f1b', name: 'Protokolle', parentId: 'f1' },
  ]},
  { id: 'f2', name: 'Formulare', parentId: null, children: [
    { id: 'f2a', name: 'Anmeldeformulare', parentId: 'f2' },
  ]},
  { id: 'f3', name: 'Fotos', parentId: null },
];

export const files: FileItem[] = [
  { id: 'file1', name: 'Vereinssatzung_2026.pdf', folderId: 'f1a', type: 'pdf', size: '245 KB', uploadedBy: 'Hans Richter', uploadDate: '15.01.2026', accessRoles: ['Vorstand', 'Mitglied'] },
  { id: 'file2', name: 'Protokoll_JHV_2025.pdf', folderId: 'f1b', type: 'pdf', size: '180 KB', uploadedBy: 'Hans Richter', uploadDate: '20.12.2025', accessRoles: ['Vorstand'] },
  { id: 'file3', name: 'Anmeldeformular.pdf', folderId: 'f2a', type: 'pdf', size: '95 KB', uploadedBy: 'Peter Weber', uploadDate: '01.02.2026', accessRoles: ['Vorstand', 'Trainer', 'Mitglied'] },
  { id: 'file4', name: 'SEPA_Lastschrift.docx', folderId: 'f2a', type: 'docx', size: '52 KB', uploadedBy: 'Peter Weber', uploadDate: '01.02.2026', accessRoles: ['Vorstand', 'Kassierer'] },
  { id: 'file5', name: 'Mannschaftsfoto_2026.jpg', folderId: 'f3', type: 'jpg', size: '3,2 MB', uploadedBy: 'Anna Schmidt', uploadDate: '10.03.2026', accessRoles: ['Mitglied'] },
  { id: 'file6', name: 'Turnier_Highlights.mp4', folderId: 'f3', type: 'mp4', size: '45 MB', uploadedBy: 'Julia Becker', uploadDate: '12.03.2026', accessRoles: ['Mitglied'] },
  { id: 'file7', name: 'Mitgliederliste_Export.xlsx', folderId: 'f1', type: 'xlsx', size: '128 KB', uploadedBy: 'Peter Weber', uploadDate: '14.03.2026', accessRoles: ['Vorstand'] },
  { id: 'file8', name: 'Hallenplan_2026.pdf', folderId: 'f1', type: 'pdf', size: '310 KB', uploadedBy: 'Klaus Wagner', uploadDate: '05.01.2026', accessRoles: ['Trainer', 'Vorstand'] },
];
