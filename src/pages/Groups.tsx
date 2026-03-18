import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from '@/hooks/use-api';
import { toast } from 'sonner';
import type { Group } from '@/lib/api';

const categoryLabel: Record<string, string> = {
  standard: 'Standard',
  team: 'Team / Mannschaft',
};

export default function Groups() {
  const navigate = useNavigate();
  const { data: groupsData, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [form, setForm] = useState({ name: '', description: '', category: 'standard' });

  const groups = groupsData?.data || [];

  const openCreate = () => {
    setEditingGroup(null);
    setForm({ name: '', description: '', category: 'standard' });
    setDialogOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditingGroup(g);
    setForm({ name: g.name, description: g.description || '', category: g.category || 'standard' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name ist erforderlich'); return; }
    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({ id: editingGroup.id, data: form });
        toast.success('Gruppe aktualisiert');
      } else {
        await createGroup.mutateAsync(form);
        toast.success('Gruppe erstellt');
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Fehler');
    }
  };

  const handleDelete = async (g: Group) => {
    if (!confirm(`Gruppe "${g.name}" endgültig löschen?`)) return;
    try {
      await deleteGroup.mutateAsync(g.id);
      toast.success('Gruppe gelöscht');
    } catch (e: any) {
      toast.error(e.message || 'Fehler beim Löschen');
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Gruppen & Mannschaften" />
        <Card className="bg-popover shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">Gruppen werden geladen...</CardContent></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Gruppen & Mannschaften"
        action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Neue Gruppe</Button>}
      />

      <Card className="bg-popover shadow-sm">
        <CardContent className="p-4">
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Noch keine Gruppen vorhanden.</p>
              <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Erste Gruppe erstellen</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead className="hidden md:table-cell">Beschreibung</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => (
                  <TableRow key={g.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/groups/${g.id}`)}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>
                      <Badge variant={g.category === 'team' ? 'default' : 'secondary'}>
                        {categoryLabel[g.category || 'standard'] || g.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{g.description || '–'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(g)}>
                            <Pencil className="h-4 w-4 mr-2" />Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(g)}>
                            <Trash2 className="h-4 w-4 mr-2" />Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Gruppe bearbeiten' : 'Neue Gruppe'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Herren 1, A-Jugend..." />
            </div>
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="team">Team / Mannschaft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Beschreibung (optional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={createGroup.isPending || updateGroup.isPending}>
              {(createGroup.isPending || updateGroup.isPending) ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
