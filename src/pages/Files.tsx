import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Folder, FolderOpen, FileText, FileSpreadsheet, Image, Film, Upload, Plus, MoreHorizontal, Download, Pencil, Trash2, Shield, LayoutGrid, List, ChevronRight } from 'lucide-react';
import { useFiles } from '@/hooks/use-api';

interface FileItem {
  id: string;
  name: string;
  folderId?: string;
  folder?: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadDate: string;
  accessRoles?: string[];
}

const fileIcon = (type: string) => {
  const map: Record<string, JSX.Element> = {
    pdf: <FileText className="h-8 w-8 text-destructive" />,
    docx: <FileText className="h-8 w-8 text-primary" />,
    xlsx: <FileSpreadsheet className="h-8 w-8 text-success" />,
    jpg: <Image className="h-8 w-8 text-warning" />,
    png: <Image className="h-8 w-8 text-warning" />,
    mp4: <Film className="h-8 w-8 text-primary-light" />,
  };
  return map[type] || <FileText className="h-8 w-8 text-muted-foreground" />;
};

export default function Files() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [permModalOpen, setPermModalOpen] = useState(false);

  const { data: filesData, isLoading } = useFiles(selectedFolder ? { folder: selectedFolder } : undefined);
  const files: FileItem[] = Array.isArray(filesData) ? filesData as any : (filesData as any)?.data ?? [];

  // Derive folders from files
  const folderNames = [...new Set(files.map(f => f.folder || f.folderId || '').filter(Boolean))];

  const visibleFiles = selectedFolder
    ? files.filter(f => (f.folder || f.folderId) === selectedFolder)
    : files;

  const selectedFolderName = selectedFolder ?? 'Alle Dateien';

  return (
    <div>
      <PageHeader title="Materialbank" action={
        <div className="flex gap-2">
          <Button variant="outline"><Plus className="h-4 w-4 mr-2" /> Ordner erstellen</Button>
          <Button><Upload className="h-4 w-4 mr-2" /> Datei hochladen</Button>
        </div>
      } />

      <div className="flex gap-6">
        {/* Folder Tree */}
        <div className="w-60 shrink-0 hidden md:block">
          <Card className="border border-border">
            <CardContent className="p-3">
              <button onClick={() => setSelectedFolder(null)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium mb-1 ${!selectedFolder ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
                Alle Dateien
              </button>
              {folderNames.map(folder => (
                <div key={folder}>
                  <button onClick={() => setSelectedFolder(folder)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${selectedFolder === folder ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted'}`}>
                    {selectedFolder === folder ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                    {folder}
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">{selectedFolderName}</h2>
            <div className="flex gap-1 border border-border rounded-md p-0.5">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Upload Zone */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground mb-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <Upload className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Dateien hierher ziehen oder klicken zum Hochladen</p>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleFiles.map(f => (
                <Card key={f.id} className="border border-border hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="flex justify-center">{fileIcon(f.type)}</div>
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.size}</p>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPermModalOpen(true)}><Shield className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Größe</TableHead>
                    <TableHead>Hochgeladen von</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleFiles.map((f, i) => (
                    <TableRow key={f.id} className={i % 2 === 1 ? 'bg-muted/50' : ''}>
                      <TableCell className="flex items-center gap-2">{fileIcon(f.type)}<span className="text-sm font-medium">{f.name}</span></TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs uppercase">{f.type}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{f.size}</TableCell>
                      <TableCell className="text-muted-foreground">{f.uploadedBy}</TableCell>
                      <TableCell className="text-muted-foreground">{f.uploadDate}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><Download className="h-4 w-4 mr-2" /> Herunterladen</DropdownMenuItem>
                            <DropdownMenuItem><Pencil className="h-4 w-4 mr-2" /> Umbenennen</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPermModalOpen(true)}><Shield className="h-4 w-4 mr-2" /> Zugriffsrechte</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Löschen</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>

      {/* Permissions Dialog */}
      <Dialog open={permModalOpen} onOpenChange={setPermModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Zugriffsrechte</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {['Vorstand', 'Trainer', 'Kassierer', 'Mitglied', 'Jugendwart'].map(role => (
              <div key={role} className="flex items-center gap-3">
                <Checkbox id={`perm-${role}`} defaultChecked={role === 'Vorstand' || role === 'Mitglied'} />
                <label htmlFor={`perm-${role}`} className="text-sm">{role}</label>
              </div>
            ))}
          </div>
          <DialogFooter><Button>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
