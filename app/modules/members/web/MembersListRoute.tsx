import { useEffect, useState } from "react";
import { Form, Link, useFetcher, useLoaderData, useNavigate, useSearchParams } from "react-router";
import { useDebouncedValue } from "@mantine/hooks";
import { Button, Card, Badge, TextInput, Select, Checkbox, Table, Modal, Group, Text, Menu } from "@mantine/core";
import {
  Plus, Search, Filter, MoreHorizontal, Download, ChevronUp, ChevronDown,
  Pencil, MessageSquare, UserMinus, Star, Save, ChevronLeft, ChevronRight,
  Users, Send, Receipt, FileSpreadsheet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import type { MemberListLoaderData, MemberListSortKey, MemberRouteActionData } from "../types/member.types";

const statusColor = (status: string) =>
  status === "Aktiv" ? "green" : status === "Inaktiv" ? "gray" : "yellow";

export default function MembersListRoute() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher<MemberRouteActionData>();
  const { members, total, totalPages, page, perPage, roles, groups, filters } = useLoaderData<MemberListLoaderData>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(filters.search);
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const [saveFilterOpen, setSaveFilterOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [savedFilters, setSavedFilters] = useState<string[]>([]);

  const roleNames = roles.map((role) => role.name);
  const groupNames = groups.map((group) => group.name);

  useEffect(() => {
    if (filters.search !== search) {
      setSearch(filters.search);
    }
  }, [filters.search, search]);

  useEffect(() => {
    if (debouncedSearch === filters.search) return;
    updateParams({ search: debouncedSearch || null });
  }, [debouncedSearch]);

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "Alle") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in updates)) next.set("page", "1");
    setSearchParams(next);
  };

  const toggleSort = (key: MemberListSortKey) => {
    const currentSort = filters.sort;
    const currentDir = filters.dir;
    updateParams({
      sort: key,
      dir: currentSort === key && currentDir === "asc" ? "desc" : "asc",
    });
  };

  const toggleAll = () => {
    if (selected.size === members.length) setSelected(new Set());
    else setSelected(new Set(members.map((member) => member.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      setSavedFilters((current) => [...current, filterName.trim()]);
      setFilterName("");
      setSaveFilterOpen(false);
    }
  };

  const SortIcon = ({ sortKey }: { sortKey: MemberListSortKey }) => {
    if (filters.sort !== sortKey) return null;
    return filters.dir === "asc"
      ? <ChevronUp className="h-3 w-3 inline ml-1" />
      : <ChevronDown className="h-3 w-3 inline ml-1" />;
  };

  return (
    <div>
      <PageHeader
        title="Mitglieder"
        action={
          <Button component={Link} to="/members/new" leftSection={<Plus className="h-4 w-4" />}>
            Neues Mitglied
          </Button>
        }
      />

      {fetcher.data?.error && (
        <Text c="red" size="sm" mb="sm">
          {fetcher.data.error}
        </Text>
      )}

      <Card shadow="sm" className="bg-popover">
        <div className="p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <TextInput
                placeholder="Name, E-Mail oder Mitgliedsnummer suchen..."
                leftSection={<Search className="h-4 w-4" />}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <Select
              value={filters.status}
              onChange={(value) => updateParams({ status: value ?? null })}
              data={[
                { value: "Alle", label: "Alle Status" },
                { value: "Aktiv", label: "Aktiv" },
                { value: "Inaktiv", label: "Inaktiv" },
                { value: "Ausstehend", label: "Ausstehend" },
              ]}
              w={140}
            />

            <Select
              value={filters.role}
              onChange={(value) => updateParams({ role: value ?? null })}
              data={[
                { value: "Alle", label: "Alle Rollen" },
                ...roleNames.map((role) => ({ value: role, label: role })),
              ]}
              w={140}
            />

            <Select
              value={filters.group}
              onChange={(value) => updateParams({ group: value ?? null })}
              data={[
                { value: "Alle", label: "Alle Gruppen" },
                ...groupNames.map((group) => ({ value: group, label: group })),
              ]}
              w={140}
            />

            <Button variant="outline" size="sm" onClick={() => setSaveFilterOpen(true)} leftSection={<Save className="h-4 w-4" />}>
              Filter speichern
            </Button>

            {savedFilters.length > 0 && (
              <Menu>
                <Menu.Target>
                  <Button variant="outline" size="sm" leftSection={<Star className="h-4 w-4" />}>
                    Gespeicherte Filter
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {savedFilters.map((filter) => <Menu.Item key={filter}>{filter}</Menu.Item>)}
                </Menu.Dropdown>
              </Menu>
            )}

            <Menu>
              <Menu.Target>
                <Button variant="outline" size="sm" leftSection={<Download className="h-4 w-4" />}>
                  Export
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<FileSpreadsheet className="h-4 w-4" />}>CSV</Menu.Item>
                <Menu.Item leftSection={<FileSpreadsheet className="h-4 w-4" />}>Excel</Menu.Item>
                <Menu.Item leftSection={<FileSpreadsheet className="h-4 w-4" />}>DOSB-XML</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 40 }}>
                    <Checkbox checked={members.length > 0 && selected.size === members.length} onChange={toggleAll} />
                  </Table.Th>
                  <Table.Th className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    Name <SortIcon sortKey="name" />
                  </Table.Th>
                  <Table.Th className="hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort("email")}>
                    E-Mail <SortIcon sortKey="email" />
                  </Table.Th>
                  <Table.Th className="hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort("memberNumber")}>
                    Mitgliedsnr. <SortIcon sortKey="memberNumber" />
                  </Table.Th>
                  <Table.Th className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                    Status <SortIcon sortKey="status" />
                  </Table.Th>
                  <Table.Th className="hidden md:table-cell">Rollen</Table.Th>
                  <Table.Th className="hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort("joinDate")}>
                    Beitritt <SortIcon sortKey="joinDate" />
                  </Table.Th>
                  <Table.Th style={{ width: 40 }} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {members.map((member, index) => (
                  <Table.Tr
                    key={member.id}
                    className={`cursor-pointer ${index % 2 === 1 ? "bg-card" : ""} hover:bg-muted/50`}
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    <Table.Td onClick={(event) => event.stopPropagation()}>
                      <Checkbox checked={selected.has(member.id)} onChange={() => toggleOne(member.id)} />
                    </Table.Td>
                    <Table.Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                          <span className="text-primary-foreground text-xs font-semibold">{member.avatarInitials}</span>
                        </div>
                        <span className="font-medium">{member.firstName} {member.lastName}</span>
                      </div>
                    </Table.Td>
                    <Table.Td className="hidden md:table-cell text-muted-foreground">{member.email}</Table.Td>
                    <Table.Td className="hidden lg:table-cell text-muted-foreground font-mono text-xs">{member.memberNumber}</Table.Td>
                    <Table.Td>
                      <Badge color={statusColor(member.status)} variant="light" size="sm">{member.status}</Badge>
                    </Table.Td>
                    <Table.Td className="hidden md:table-cell">
                      <Group gap={4} wrap="wrap">
                        {member.roles.slice(0, 2).map((role) => <Badge key={role} variant="light" size="xs">{role}</Badge>)}
                        {member.roles.length > 2 && <Badge variant="outline" size="xs">+{member.roles.length - 2}</Badge>}
                      </Group>
                    </Table.Td>
                    <Table.Td className="hidden lg:table-cell text-muted-foreground">{member.joinDate}</Table.Td>
                    <Table.Td onClick={(event) => event.stopPropagation()}>
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <Button variant="subtle" size="sm" px={6}><MoreHorizontal className="h-4 w-4" /></Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<Pencil className="h-4 w-4" />} onClick={() => navigate(`/members/${member.id}`)}>
                            Bearbeiten
                          </Menu.Item>
                          <Menu.Item leftSection={<MessageSquare className="h-4 w-4" />}>Nachricht senden</Menu.Item>
                          <fetcher.Form method="post">
                            <input type="hidden" name="intent" value="deactivate-member" />
                            <input type="hidden" name="memberId" value={member.id} />
                            <Menu.Item leftSection={<UserMinus className="h-4 w-4" />} color="red" component="button" type="submit">
                              Deaktivieren
                            </Menu.Item>
                          </fetcher.Form>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <Group gap="xs">
              <Text size="sm" c="dimmed">{total} Mitglieder</Text>
              <Select
                value={String(perPage)}
                onChange={(value) => updateParams({ perPage: String(value || 25), page: "1" })}
                data={[
                  { value: "25", label: "25" },
                  { value: "50", label: "50" },
                  { value: "100", label: "100" },
                ]}
                w={80}
                size="xs"
              />
              <Text size="sm" c="dimmed">pro Seite</Text>
            </Group>
            <Group gap={4}>
              <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Text size="sm" px="xs">Seite {page} von {totalPages}</Text>
              <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => updateParams({ page: String(page + 1) })}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Group>
          </div>
        </div>
      </Card>

      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground p-3 flex items-center justify-between z-50 shadow-md">
          <Text size="sm" fw={500}>{selected.size} Mitglieder ausgewählt</Text>
          <Group gap="xs">
            <Button variant="white" size="sm" leftSection={<Filter className="h-4 w-4" />}>Status ändern</Button>
            <Button variant="white" size="sm" leftSection={<Users className="h-4 w-4" />}>Gruppe zuweisen</Button>
            <Button variant="white" size="sm" leftSection={<Receipt className="h-4 w-4" />}>Rechnung senden</Button>
            <Button variant="white" size="sm" leftSection={<Send className="h-4 w-4" />}>Nachricht senden</Button>
            <Button variant="white" size="sm" leftSection={<Download className="h-4 w-4" />}>Exportieren</Button>
          </Group>
        </div>
      )}

      <Modal opened={saveFilterOpen} onClose={() => setSaveFilterOpen(false)} title="Filter speichern" size="sm">
        <TextInput
          label="Filtername"
          placeholder="z.B. Aktive Trainer"
          value={filterName}
          onChange={(event) => setFilterName(event.target.value)}
        />
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={() => setSaveFilterOpen(false)}>Abbrechen</Button>
          <Button onClick={handleSaveFilter}>Speichern</Button>
        </Group>
      </Modal>
    </div>
  );
}
