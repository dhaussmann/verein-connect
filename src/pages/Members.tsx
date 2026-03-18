import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Plus, Search, Filter, MoreHorizontal, Download, ChevronUp, ChevronDown,
  Pencil, MessageSquare, UserMinus, Star, Save, ChevronLeft, ChevronRight,
  Users, Send, Receipt, FileSpreadsheet,
} from 'lucide-react';
import { useMembers, useRoles, useGroups } from '@/hooks/use-api';
import type { Member } from '@/lib/api';

type SortKey = 'name' | 'email' | 'memberNumber' | 'status' | 'joinDate';
type SortDir = 'asc' | 'desc';

const statusClass = (s: string) =>
  s === 'Aktiv' ? 'bg-success/10 text-success' : s === 'Inaktiv' ? 'bg-muted text-muted-foreground' : 'bg-warning/10 text-warning';

export default function Members() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Alle');
  const [roleFilter, setRoleFilter] = useState('Alle');
  const [groupFilter, setGroupFilter] = useState('Alle');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [saveFilterOpen, setSaveFilterOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [savedFilters, setSavedFilters] = useState<string[]>([]);

  const { data: membersData, isLoading, error } = useMembers({ per_page: '200' });
  const allMembers: Member[] = membersData?.data ?? [];
  const { data: rolesData } = useRoles();
  const { data: groupsData } = useGroups();
  const roleNames = (rolesData || []).map((r) => r.name);
  const groupNames = (groupsData?.data || []).map((g) => g.name);

  const filtered = useMemo(() => {
    let list = [...allMembers];
    const q = search.toLowerCase();
    if (q) list = list.filter((m) =>
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.memberNumber.toLowerCase().includes(q)
    );
    if (statusFilter !== 'Alle') list = list.filter((m) => m.status === statusFilter);
    if (roleFilter !== 'Alle') list = list.filter((m) => m.roles.includes(roleFilter));
    if (groupFilter !== 'Alle') list = list.filter((m) => m.groups.some((g) => g.name === groupFilter));

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`); break;
        case 'email': cmp = a.email.localeCompare(b.email); break;
        case 'memberNumber': cmp = a.memberNumber.localeCompare(b.memberNumber); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'joinDate': {
          const [dA, mA, yA] = a.joinDate.split('.').map(Number);
          const [dB, mB, yB] = b.joinDate.split('.').map(Number);
          cmp = new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [allMembers, search, statusFilter, roleFilter, groupFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />;
  };

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((m) => m.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      setSavedFilters((f) => [...f, filterName.trim()]);
      setFilterName('');
      setSaveFilterOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Mitglieder" action={<Button disabled><Plus className="h-4 w-4 mr-2" />Neues Mitglied</Button>} />
        <Card className="bg-popover shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">Mitglieder werden geladen...</CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Mitglieder" />
        <Card className="bg-popover shadow-sm"><CardContent className="p-8 text-center text-destructive">Fehler beim Laden: {error.message}</CardContent></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Mitglieder"
        action={<Button onClick={() => navigate('/members/new')}><Plus className="h-4 w-4 mr-2" />Neues Mitglied</Button>}
      />

      <Card className="bg-popover shadow-sm">
        <CardContent className="p-4">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Name, E-Mail oder Mitgliedsnummer suchen..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
            </div>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Alle">Alle Status</SelectItem>
                <SelectItem value="Aktiv">Aktiv</SelectItem>
                <SelectItem value="Inaktiv">Inaktiv</SelectItem>
                <SelectItem value="Ausstehend">Ausstehend</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Alle">Alle Rollen</SelectItem>
                {roleNames.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={groupFilter} onValueChange={(v) => { setGroupFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Alle">Alle Gruppen</SelectItem>
                {groupNames.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => setSaveFilterOpen(true)}>
              <Save className="h-4 w-4 mr-1" />Filter speichern
            </Button>

            {savedFilters.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm"><Star className="h-4 w-4 mr-1" />Gespeicherte Filter</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {savedFilters.map((f) => <DropdownMenuItem key={f}>{f}</DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem><FileSpreadsheet className="h-4 w-4 mr-2" />CSV</DropdownMenuItem>
                <DropdownMenuItem><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</DropdownMenuItem>
                <DropdownMenuItem><FileSpreadsheet className="h-4 w-4 mr-2" />DOSB-XML</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={paged.length > 0 && selected.size === paged.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>Name <SortIcon k="name" /></TableHead>
                  <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort('email')}>E-Mail <SortIcon k="email" /></TableHead>
                  <TableHead className="hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('memberNumber')}>Mitgliedsnr. <SortIcon k="memberNumber" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>Status <SortIcon k="status" /></TableHead>
                  <TableHead className="hidden md:table-cell">Rollen</TableHead>
                  <TableHead className="hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('joinDate')}>Beitritt <SortIcon k="joinDate" /></TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((m, i) => (
                  <TableRow key={m.id} className={`cursor-pointer ${i % 2 === 1 ? 'bg-card' : ''} hover:bg-muted/50`} onClick={() => navigate(`/members/${m.id}`)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggleOne(m.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                          <span className="text-primary-foreground text-xs font-semibold">{m.avatarInitials}</span>
                        </div>
                        <span className="font-medium">{m.firstName} {m.lastName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{m.email}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground font-mono text-xs">{m.memberNumber}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(m.status)}`}>{m.status}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {m.roles.slice(0, 2).map((r) => <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>)}
                        {m.roles.length > 2 && <Badge variant="outline" className="text-xs">+{m.roles.length - 2}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{m.joinDate}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/members/${m.id}`)}><Pencil className="h-4 w-4 mr-2" />Bearbeiten</DropdownMenuItem>
                          <DropdownMenuItem><MessageSquare className="h-4 w-4 mr-2" />Nachricht senden</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive"><UserMinus className="h-4 w-4 mr-2" />Deaktivieren</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{filtered.length} Mitglieder</span>
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(0); }}>
                <SelectTrigger className="w-[80px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>pro Seite</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">Seite {page + 1} von {Math.max(totalPages, 1)}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground p-3 flex items-center justify-between z-50 shadow-md">
          <span className="text-sm font-medium">{selected.size} Mitglieder ausgewählt</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><Filter className="h-4 w-4 mr-1" />Status ändern</Button>
            <Button variant="secondary" size="sm"><Users className="h-4 w-4 mr-1" />Gruppe zuweisen</Button>
            <Button variant="secondary" size="sm"><Receipt className="h-4 w-4 mr-1" />Rechnung senden</Button>
            <Button variant="secondary" size="sm"><Send className="h-4 w-4 mr-1" />Nachricht senden</Button>
            <Button variant="secondary" size="sm"><Download className="h-4 w-4 mr-1" />Exportieren</Button>
          </div>
        </div>
      )}

      {/* Save filter dialog */}
      <Dialog open={saveFilterOpen} onOpenChange={setSaveFilterOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Filter speichern</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Filtername</Label>
            <Input placeholder="z.B. Aktive Trainer" value={filterName} onChange={(e) => setFilterName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveFilterOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveFilter}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
