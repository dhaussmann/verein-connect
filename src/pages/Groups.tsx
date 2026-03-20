import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Users, CornerDownRight, GripVertical } from 'lucide-react';
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from '@/hooks/use-api';
import { toast } from 'sonner';
import type { Group } from '@/lib/api';

const categoryLabel: Record<string, string> = {
  standard: 'Standard',
  team: 'Team / Mannschaft',
};

// ─── Draggable Row Component ─────────────────────────────────────────────────
function DraggableGroupRow({
  group, depth, overId, navigate, openEdit, openCreate, handleDelete,
}: {
  group: Group; depth: number; overId: string | null;
  navigate: (path: string) => void;
  openEdit: (g: Group) => void;
  openCreate: (parentId?: string) => void;
  handleDelete: (g: Group) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isDropTarget = overId === group.id && !isDragging;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer hover:bg-muted/50 border-b transition-colors ${isDropTarget ? 'bg-primary/10 ring-2 ring-primary/30 ring-inset' : ''}`}
      onClick={() => navigate(`/groups/${group.id}`)}
    >
      <td className="p-3 font-medium">
        <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 1.5}rem` }}>
          <span
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </span>
          {depth > 0 && <CornerDownRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <span>{group.name}</span>
        </div>
      </td>
      <td className="p-3">
        <Badge variant={group.category === 'team' ? 'default' : 'secondary'}>
          {categoryLabel[group.category || 'standard'] || group.category}
        </Badge>
      </td>
      <td className="p-3 hidden md:table-cell">
        <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" />{group.memberCount}</span>
      </td>
      <td className="p-3 hidden md:table-cell text-muted-foreground">{group.description || '–'}</td>
      <td className="p-3" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(group)}>
              <Pencil className="h-4 w-4 mr-2" />Bearbeiten
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openCreate(group.id)}>
              <Plus className="h-4 w-4 mr-2" />Untergruppe erstellen
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(group)}>
              <Trash2 className="h-4 w-4 mr-2" />Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Groups() {
  const navigate = useNavigate();
  const { data: groupsData, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [form, setForm] = useState({ name: '', description: '', category: 'standard', parent_group_id: '' });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const allGroups: Group[] = groupsData?.data || [];

  const childrenOf = (parentId: string) => allGroups.filter(g => g.parentGroupId === parentId);

  const getDescendantIds = (id: string): string[] => {
    const children = childrenOf(id);
    return children.flatMap(c => [c.id, ...getDescendantIds(c.id)]);
  };
  const excludeIds = editingGroup ? new Set([editingGroup.id, ...getDescendantIds(editingGroup.id)]) : new Set<string>();

  const buildParentSelectItems = (parentId: string | null = null, depth = 0): { id: string; name: string; depth: number }[] => {
    const items: { id: string; name: string; depth: number }[] = [];
    const children = allGroups.filter(g => (g.parentGroupId || null) === parentId);
    for (const g of children) {
      if (!excludeIds.has(g.id)) {
        items.push({ id: g.id, name: g.name, depth });
        items.push(...buildParentSelectItems(g.id, depth + 1));
      }
    }
    return items;
  };
  const parentSelectItems = buildParentSelectItems();

  // Flat list for DnD ids
  const flatTree = useMemo(() => {
    const result: { group: Group; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      allGroups.filter(g => (g.parentGroupId || null) === parentId).forEach(g => {
        result.push({ group: g, depth });
        walk(g.id, depth + 1);
      });
    };
    walk(null, 0);
    return result;
  }, [allGroups]);

  const activeGroup = activeId ? allGroups.find(g => g.id === activeId) : null;

  // DnD sensors — require 8px movement before activating drag to allow clicks
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: any) => {
    setOverId(event.over?.id as string || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) return;

    const draggedId = active.id as string;
    const targetId = over.id as string;
    const draggedGroup = allGroups.find(g => g.id === draggedId);
    if (!draggedGroup) return;

    // Prevent dropping onto own descendant (circular)
    const descendants = new Set(getDescendantIds(draggedId));
    if (descendants.has(targetId)) {
      toast.error('Kann nicht auf eine eigene Untergruppe verschoben werden.');
      return;
    }

    // Already a child of target? Skip.
    if (draggedGroup.parentGroupId === targetId) return;

    try {
      await updateGroup.mutateAsync({
        id: draggedId,
        data: {
          name: draggedGroup.name,
          description: draggedGroup.description || '',
          category: draggedGroup.category || 'standard',
          parent_group_id: targetId,
        },
      });
      toast.success(`"${draggedGroup.name}" verschoben unter "${allGroups.find(g => g.id === targetId)?.name}"`);
    } catch (e: any) {
      toast.error(e.message || 'Fehler beim Verschieben');
    }
  };

  const handleMoveToRoot = async (g: Group) => {
    if (!g.parentGroupId) return;
    try {
      await updateGroup.mutateAsync({
        id: g.id,
        data: { name: g.name, description: g.description || '', category: g.category || 'standard', parent_group_id: '' },
      });
      toast.success(`"${g.name}" auf Hauptebene verschoben`);
    } catch (e: any) {
      toast.error(e.message || 'Fehler');
    }
  };

  const openCreate = (parentId?: string) => {
    setEditingGroup(null);
    setForm({ name: '', description: '', category: 'standard', parent_group_id: parentId || '' });
    setDialogOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditingGroup(g);
    setForm({ name: g.name, description: g.description || '', category: g.category || 'standard', parent_group_id: g.parentGroupId || '' });
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
    if (g.childrenCount > 0) {
      toast.error('Gruppe hat Untergruppen – bitte erst diese löschen.');
      return;
    }
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
        action={<Button onClick={() => openCreate()}><Plus className="h-4 w-4 mr-2" />Neue Gruppe</Button>}
      />

      <Card className="bg-popover shadow-sm">
        <CardContent className="p-4">
          {allGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Noch keine Gruppen vorhanden.</p>
              <Button className="mt-4" onClick={() => openCreate()}><Plus className="h-4 w-4 mr-2" />Erste Gruppe erstellen</Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">Gruppen per Drag & Drop auf eine andere Gruppe ziehen, um sie als Untergruppe einzuordnen.</p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Kategorie</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Mitglieder</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Beschreibung</th>
                      <th className="w-10 p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {flatTree.map(({ group, depth }) => (
                      <DraggableGroupRow
                        key={group.id}
                        group={group}
                        depth={depth}
                        overId={overId}
                        navigate={navigate}
                        openEdit={openEdit}
                        openCreate={openCreate}
                        handleDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </table>

                <DragOverlay>
                  {activeGroup ? (
                    <div className="bg-popover border rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm font-medium">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      {activeGroup.name}
                      <Badge variant="secondary" className="text-xs ml-1">{categoryLabel[activeGroup.category || 'standard']}</Badge>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </>
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
              <Label>Übergeordnete Gruppe</Label>
              <Select value={form.parent_group_id || '_none'} onValueChange={(v) => setForm(f => ({ ...f, parent_group_id: v === '_none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Keine (Hauptgruppe)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Keine (Hauptgruppe)</SelectItem>
                  {parentSelectItems.map((pg) => (
                    <SelectItem key={pg.id} value={pg.id}>{'\u00A0'.repeat(pg.depth * 4)}{pg.depth > 0 ? '↳ ' : ''}{pg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
