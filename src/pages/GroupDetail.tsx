import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Users, Search } from 'lucide-react';
import { useGroups, useGroupMembers, useMembers, useAddGroupMember, useRemoveGroupMember } from '@/hooks/use-api';
import { toast } from 'sonner';

const categoryLabel: Record<string, string> = {
  standard: 'Standard',
  team: 'Team / Mannschaft',
};

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: groupsData, isLoading: groupsLoading } = useGroups();
  const { data: membersData, isLoading: membersLoading } = useGroupMembers(id);
  const { data: allMembersData } = useMembers();
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  const group = groupsData?.data?.find((g) => g.id === id);
  const groupMembersList = membersData?.data || [];
  const allMembers = allMembersData?.data || [];

  // Filter out members already in this group
  const availableMembers = useMemo(() => {
    const existingIds = new Set(groupMembersList.map((gm) => gm.userId));
    let list = allMembers.filter((m) => !existingIds.has(m.id));
    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      list = list.filter((m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allMembers, groupMembersList, memberSearch]);

  const handleAdd = async () => {
    if (!selectedUserId) return;
    try {
      await addMember.mutateAsync({ groupId: id!, userId: selectedUserId });
      toast.success('Mitglied hinzugefügt');
      setAddDialogOpen(false);
      setSelectedUserId('');
      setMemberSearch('');
    } catch (e: any) {
      toast.error(e.message || 'Fehler');
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`${name} aus der Gruppe entfernen?`)) return;
    try {
      await removeMember.mutateAsync({ groupId: id!, userId });
      toast.success(`${name} entfernt`);
    } catch (e: any) {
      toast.error(e.message || 'Fehler');
    }
  };

  if (groupsLoading || membersLoading) {
    return (
      <div>
        <PageHeader title="" />
        <p className="text-muted-foreground">Wird geladen...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div>
        <PageHeader title="Gruppe nicht gefunden" />
        <Button variant="outline" onClick={() => navigate('/groups')}><ArrowLeft className="h-4 w-4 mr-2" />Zurück</Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={group.name}
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/groups')}>
            <ArrowLeft className="h-4 w-4 mr-2" />Zurück
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <Badge variant={group.category === 'team' ? 'default' : 'secondary'}>
          {categoryLabel[group.category || 'standard'] || group.category}
        </Badge>
        {group.description && (
          <span className="text-sm text-muted-foreground">{group.description}</span>
        )}
      </div>

      <Card className="bg-popover shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Mitglieder ({groupMembersList.length})
          </CardTitle>
          <Button size="sm" onClick={() => { setAddDialogOpen(true); setMemberSearch(''); setSelectedUserId(''); }}>
            <Plus className="h-4 w-4 mr-1" />Mitglied hinzufügen
          </Button>
        </CardHeader>
        <CardContent>
          {groupMembersList.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Noch keine Mitglieder in dieser Gruppe.</p>
              <Button className="mt-4" size="sm" onClick={() => { setAddDialogOpen(true); setMemberSearch(''); setSelectedUserId(''); }}>
                <Plus className="h-4 w-4 mr-2" />Erstes Mitglied hinzufügen
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Beigetreten</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupMembersList.map((gm) => (
                  <TableRow key={gm.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/members/${gm.userId}`)}>
                    <TableCell className="font-medium">{gm.firstName} {gm.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">{gm.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {gm.joinedAt ? new Date(gm.joinedAt).toLocaleDateString('de-DE') : '–'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(gm.userId, `${gm.firstName} ${gm.lastName}`);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add member dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mitglied zu "{group.name}" hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mitglied suchen</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Name oder E-Mail..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mitglied auswählen</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Mitglied wählen..." /></SelectTrigger>
                <SelectContent>
                  {availableMembers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Keine verfügbaren Mitglieder gefunden</div>
                  ) : (
                    availableMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} — {m.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Abbrechen</Button>
            <Button disabled={!selectedUserId || addMember.isPending} onClick={handleAdd}>
              {addMember.isPending ? 'Wird hinzugefügt...' : 'Hinzufügen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
