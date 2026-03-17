import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter } from 'lucide-react';

const mockMembers = [
  { id: '1', name: 'Anna Schmidt', email: 'anna@example.de', status: 'Aktiv', joined: '15.03.2023', role: 'Mitglied' },
  { id: '2', name: 'Peter Weber', email: 'peter@example.de', status: 'Aktiv', joined: '22.01.2024', role: 'Trainer' },
  { id: '3', name: 'Maria Braun', email: 'maria@example.de', status: 'Pausiert', joined: '08.06.2022', role: 'Mitglied' },
  { id: '4', name: 'Thomas Fischer', email: 'thomas@example.de', status: 'Aktiv', joined: '11.09.2023', role: 'Mitglied' },
  { id: '5', name: 'Laura Hoffmann', email: 'laura@example.de', status: 'Gekündigt', joined: '03.04.2021', role: 'Mitglied' },
];

export default function Members() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const filtered = mockMembers.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  const statusVariant = (s: string) => s === 'Aktiv' ? 'bg-success/10 text-success' : s === 'Pausiert' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive';

  return (
    <div>
      <PageHeader title="Mitglieder" action={<Button onClick={() => navigate('/members/new')}><Plus className="h-4 w-4 mr-2" />Mitglied hinzufügen</Button>} />

      <Card className="bg-popover shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Mitglieder suchen..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline"><Filter className="h-4 w-4 mr-2" />Filter</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">E-Mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Beitritt</TableHead>
                <TableHead className="hidden md:table-cell">Rolle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/members/${m.id}`)}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{m.email}</TableCell>
                  <TableCell><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusVariant(m.status)}`}>{m.status}</span></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{m.joined}</TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="secondary">{m.role}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
