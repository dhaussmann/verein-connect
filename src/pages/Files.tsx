import { useState, useRef, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileText, FileSpreadsheet, Image, Film, Upload, MoreHorizontal, Download, Pencil, Trash2, LayoutGrid, List, Search, Eye, EyeOff, X, HardDrive, FileArchive } from 'lucide-react';
import { useFiles, useFileStorage, useFileCategories, useUploadFile, useUpdateFile, useDeleteFile, useBulkDeleteFiles, useGroups } from '@/hooks/use-api';
import { filesApi } from '@/lib/api';
import type { MaterialFile } from '@/lib/api';
import { toast } from 'sonner';

const fileIcon = (mimeType: string, className = 'h-8 w-8') => {
  if (mimeType.includes('pdf')) return <FileText className={`${className} text-destructive`} />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <FileSpreadsheet className={`${className} text-success`} />;
  if (mimeType.startsWith('image/')) return <Image className={`${className} text-warning`} />;
  if (mimeType.startsWith('video/')) return <Film className={`${className} text-primary-light`} />;
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('rar')) return <FileArchive className={`${className} text-muted-foreground`} />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className={`${className} text-primary`} />;
  return <FileText className={`${className} text-muted-foreground`} />;
};

const extFromMime = (mime: string) => {
  const map: Record<string, string> = {
    'application/pdf': 'PDF', 'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/svg+xml': 'SVG',
    'image/webp': 'WEBP', 'video/mp4': 'MP4', 'application/zip': 'ZIP',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'text/csv': 'CSV', 'text/plain': 'TXT',
  };
  return map[mime] || mime.split('/').pop()?.toUpperCase() || 'FILE';
};

export default function Files() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterVisibility, setFilterVisibility] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState<MaterialFile | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<MaterialFile | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategoryId, setUploadCategoryId] = useState('');
  const [uploadGroupId, setUploadGroupId] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState('admin');
  const [uploadDescription, setUploadDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Build query params for API
  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p.search = search;
    if (filterCategory !== 'all') p.category_id = filterCategory;
    if (filterGroup !== 'all') p.group_id = filterGroup;
    if (filterVisibility !== 'all') p.visibility = filterVisibility;
    return Object.keys(p).length > 0 ? p : undefined;
  }, [search, filterCategory, filterGroup, filterVisibility]);

  const { data: filesData, isLoading } = useFiles(params);
  const { data: storageData } = useFileStorage();
  const { data: categoriesData } = useFileCategories();
  const { data: groupsData } = useGroups();

  const uploadMutation = useUploadFile();
  const updateMutation = useUpdateFile();
  const deleteMutation = useDeleteFile();
  const bulkDeleteMutation = useBulkDeleteFiles();

  const files: MaterialFile[] = (filesData as any)?.data ?? [];
  const categories = categoriesData?.data ?? [];
  const allGroups = Array.isArray(groupsData) ? groupsData : (groupsData as any)?.data ?? [];
  const storage = storageData;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === files.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(files.map(f => f.id)));
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    const fd = new FormData();
    fd.append('file', uploadFile);
    if (uploadCategoryId && uploadCategoryId !== 'none') fd.append('category_id', uploadCategoryId);
    if (uploadGroupId && uploadGroupId !== 'none') fd.append('group_id', uploadGroupId);
    fd.append('visibility', uploadVisibility);
    if (uploadDescription) fd.append('description', uploadDescription);
    try {
      await uploadMutation.mutateAsync(fd);
      toast.success(`"${uploadFile.name}" hochgeladen`);
      setUploadOpen(false);
      setUploadFile(null);
      setUploadCategoryId('');
      setUploadGroupId('');
      setUploadVisibility('admin');
      setUploadDescription('');
    } catch (err: any) {
      toast.error(err.message || 'Upload fehlgeschlagen');
    }
  };

  const handleRename = async () => {
    if (!renameOpen || !renameName.trim()) return;
    try {
      await updateMutation.mutateAsync({ id: renameOpen.id, data: { file_name: renameName.trim() } });
      toast.success('Datei umbenannt');
      setRenameOpen(null);
    } catch (err: any) {
      toast.error(err.message || 'Fehler');
    }
  };

  const handleDelete = async (f: MaterialFile) => {
    try {
      await deleteMutation.mutateAsync(f.id);
      toast.success(`"${f.name}" gelöscht`);
      setDeleteConfirm(null);
      selectedIds.delete(f.id);
      setSelectedIds(new Set(selectedIds));
    } catch (err: any) {
      toast.error(err.message || 'Fehler');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const res = await bulkDeleteMutation.mutateAsync([...selectedIds]);
      toast.success(`${res.deleted} Dateien gelöscht`);
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
    } catch (err: any) {
      toast.error(err.message || 'Fehler');
    }
  };

  const handleDownload = (f: MaterialFile) => {
    const token = localStorage.getItem('access_token');
    const url = filesApi.downloadUrl(f.id);
    const a = document.createElement('a');
    a.href = url + (token ? `?token=${token}` : '');
    a.download = f.name;
    a.target = '_blank';
    a.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setUploadFile(droppedFile);
      setUploadOpen(true);
    }
  };

  return (
    <div>
      <PageHeader title="Materialbank" action={
        <Button onClick={() => { setUploadFile(null); setUploadOpen(true); }}>
          <Upload className="h-4 w-4 mr-2" /> Dateien importieren
        </Button>
      } />

      {/* Storage Bar */}
      {storage && (
        <Card className="mb-4 border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <HardDrive className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{storage.usedFormatted} von {storage.limitFormatted} verwendet</span>
                  <span className="text-muted-foreground">{storage.fileCount} Dateien</span>
                </div>
                <Progress value={storage.percentUsed} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Dateien suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Kategorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Gruppe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Gruppen</SelectItem>
            {allGroups.map((g: any) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterVisibility} onValueChange={setFilterVisibility}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sichtbarkeit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="admin">Nur Verantwortliche</SelectItem>
            <SelectItem value="members">Gruppenmitglieder</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 border border-border rounded-md p-0.5 ml-auto">
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg border border-border">
          <span className="text-sm font-medium">{selectedIds.size} ausgewählt</span>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Löschen
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            <X className="h-4 w-4 mr-1" /> Auswahl aufheben
          </Button>
        </div>
      )}

      {/* Drop Zone (when no files) */}
      {files.length === 0 && !isLoading && (
        <div
          ref={dropRef}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-border rounded-lg p-12 text-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={() => { setUploadFile(null); setUploadOpen(true); }}
        >
          <Upload className="h-10 w-10 mx-auto mb-3" />
          <p className="text-sm font-medium">Dateien hierher ziehen oder klicken zum Hochladen</p>
          <p className="text-xs mt-1">PDF, Bilder, Videos, Dokumente — max. 50 MB pro Datei</p>
        </div>
      )}

      {isLoading && <p className="text-center text-muted-foreground py-8">Laden...</p>}

      {/* Grid View */}
      {files.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {files.map(f => (
            <Card key={f.id} className={`border hover:shadow-md transition-shadow cursor-pointer group relative ${selectedIds.has(f.id) ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
              <div className="absolute top-2 left-2 z-10">
                <Checkbox checked={selectedIds.has(f.id)} onCheckedChange={() => toggleSelect(f.id)} />
              </div>
              <CardContent className="p-4 pt-8 text-center space-y-2">
                <div className="flex justify-center">{fileIcon(f.type)}</div>
                <p className="text-sm font-medium truncate" title={f.name}>{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.size}</p>
                <div className="flex justify-center gap-1 flex-wrap">
                  {f.category && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: f.category.color + '20', color: f.category.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.category.color }} />{f.category.name}
                    </span>
                  )}
                  {f.visibility === 'members' ? <Eye className="h-3 w-3 text-success" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(f)}><Download className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setRenameOpen(f); setRenameName(f.name); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(f)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {files.length > 0 && viewMode === 'list' && (
        <Card className="border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={selectedIds.size === files.length && files.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Kategorie</TableHead>
                <TableHead className="hidden lg:table-cell">Gruppe</TableHead>
                <TableHead className="hidden md:table-cell">Sichtbarkeit</TableHead>
                <TableHead className="hidden lg:table-cell">Größe</TableHead>
                <TableHead className="hidden lg:table-cell">Hochgeladen</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((f, i) => (
                <TableRow key={f.id} className={`${i % 2 === 1 ? 'bg-muted/30' : ''} ${selectedIds.has(f.id) ? 'bg-primary/5' : ''}`}>
                  <TableCell><Checkbox checked={selectedIds.has(f.id)} onCheckedChange={() => toggleSelect(f.id)} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {fileIcon(f.type, 'h-5 w-5')}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{extFromMime(f.type)} · {f.size}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {f.category ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: f.category.color + '18', color: f.category.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.category.color }} />{f.category.name}
                      </span>
                    ) : <span className="text-xs text-muted-foreground">–</span>}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {f.groupName ? <Badge variant="secondary" className="text-xs">{f.groupName}</Badge> : <span className="text-xs text-muted-foreground">–</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {f.visibility === 'members' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success"><Eye className="h-3 w-3" /> Mitglieder</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><EyeOff className="h-3 w-3" /> Nur Admin</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{f.size}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="text-xs text-muted-foreground">
                      <p>{f.uploadDate}</p>
                      <p className="truncate max-w-[120px]">{f.uploadedBy}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(f)}><Download className="h-4 w-4 mr-2" /> Herunterladen</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setRenameOpen(f); setRenameName(f.name); }}><Pencil className="h-4 w-4 mr-2" /> Umbenennen</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(f)}><Trash2 className="h-4 w-4 mr-2" /> Löschen</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Datei hochladen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Datei</Label>
              {uploadFile ? (
                <div className="flex items-center gap-2 p-3 border rounded-md mt-1">
                  {fileIcon(uploadFile.type, 'h-5 w-5')}
                  <span className="text-sm font-medium truncate flex-1">{uploadFile.name}</span>
                  <span className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(0)} KB</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setUploadFile(null)}><X className="h-3 w-3" /></Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer mt-1"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm">Datei auswählen oder hierher ziehen</p>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) setUploadFile(e.target.files[0]); }} />
                </div>
              )}
            </div>
            <div>
              <Label>Kategorie</Label>
              <Select value={uploadCategoryId} onValueChange={setUploadCategoryId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Keine Kategorie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Kategorie</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />{c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gruppe</Label>
              <Select value={uploadGroupId} onValueChange={setUploadGroupId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Keine Gruppe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Gruppe</SelectItem>
                  {allGroups.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sichtbarkeit</Label>
              <Select value={uploadVisibility} onValueChange={setUploadVisibility}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Nur Vereinsverantwortliche</SelectItem>
                  <SelectItem value="members">Gruppenmitglieder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beschreibung (optional)</Label>
              <Input className="mt-1" value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} placeholder="Kurze Beschreibung der Datei" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Abbrechen</Button>
            <Button onClick={handleUpload} disabled={!uploadFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Wird hochgeladen...' : 'Hochladen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameOpen} onOpenChange={() => setRenameOpen(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Datei umbenennen</DialogTitle></DialogHeader>
          <Input value={renameName} onChange={e => setRenameName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(null)}>Abbrechen</Button>
            <Button onClick={handleRename} disabled={updateMutation.isPending}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Datei löschen?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteConfirm?.name}" wird unwiderruflich gelöscht.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirm */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedIds.size} Dateien löschen?</AlertDialogTitle>
            <AlertDialogDescription>Alle ausgewählten Dateien werden unwiderruflich gelöscht.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleBulkDelete}>Alle löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
