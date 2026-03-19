import { useEffect, useState } from 'react';
import { useFetcher, useLoaderData, useNavigate } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button, ActionIcon, Badge, Card, Text, Group, Stack,
  Tabs, Table, TextInput, Select, Modal, Menu, Checkbox,
  Divider,
} from '@mantine/core';
import {
  Pencil, MessageSquare, QrCode, MoreHorizontal, UserMinus, Trash2,
  Link as LinkIcon, Calendar as CalIcon, FileText, X, Plus, Building2,
} from 'lucide-react';
import { notifications } from '@mantine/notifications';
import type {
  MemberDetailActionData,
  MemberDetailLoaderData,
  MemberProfileFieldOption,
} from '@/modules/members/types/member.types';

const statusColor = (s: string) =>
  s === 'Aktiv' ? 'green' : s === 'Inaktiv' ? 'gray' : 'yellow';

export default function MemberDetail() {
  const navigate = useNavigate();
  const { member, contracts, groups, roles, profileFields: profileFieldDefinitions, bankAccount } = useLoaderData<MemberDetailLoaderData>();
  const fetcher = useFetcher<MemberDetailActionData>();
  const [editing, setEditing] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [bankEditing, setBankEditing] = useState(false);
  const [bankForm, setBankForm] = useState({ accountHolder: '', iban: '', bic: '', bankName: '', sepaMandate: false, sepaMandateDate: '', sepaMandateRef: '' });
  const allRoles = roles;
  const customFieldDefs: MemberProfileFieldOption[] = profileFieldDefinitions;

  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.error) {
      notifications.show({ color: 'red', message: fetcher.data.error });
      return;
    }
    if (!fetcher.data.success) return;

    if (fetcher.data.intent === 'deactivate-member') {
      notifications.show({ color: 'green', message: 'Mitglied deaktiviert' });
    } else if (fetcher.data.intent === 'delete-member') {
      notifications.show({ color: 'green', message: 'Mitglied gelöscht' });
      navigate(fetcher.data.redirectTo || '/members');
      return;
    } else if (fetcher.data.intent === 'remove-group-member') {
      notifications.show({ color: 'green', message: 'Gruppe entfernt' });
    } else if (fetcher.data.intent === 'add-group-member') {
      notifications.show({ color: 'green', message: 'Gruppe zugewiesen' });
      setGroupModalOpen(false);
      setSelectedGroupId('');
    } else if (fetcher.data.intent === 'delete-bank-account') {
      notifications.show({ color: 'green', message: 'Kontoverbindung gelöscht' });
      setBankEditing(false);
    } else if (fetcher.data.intent === 'upsert-bank-account') {
      notifications.show({ color: 'green', message: 'Kontoverbindung gespeichert' });
      setBankEditing(false);
    }
  }, [fetcher.data, navigate]);

  const roleAssignments = member.roles.map((r: string) => ({ role: r, startDate: member.joinDate }));

  const profileFieldRows = [
    { label: 'Vorname', value: member.firstName },
    { label: 'Nachname', value: member.lastName },
    { label: 'Geburtsdatum', value: member.birthDate },
    { label: 'Geschlecht', value: member.gender },
    { label: 'E-Mail', value: member.email },
    { label: 'Telefon', value: member.phone || '–' },
    { label: 'Mobil', value: member.mobile || '–' },
    { label: 'Adresse', value: `${member.street}, ${member.zip} ${member.city}` },
    ...customFieldDefs
      .filter((cf) => member.customFields[cf.name])
      .map((cf) => ({ label: cf.label, value: member.customFields[cf.name] === 'true' ? 'Ja' : member.customFields[cf.name] === 'false' ? 'Nein' : member.customFields[cf.name] })),
  ];

  return (
    <div>
      <PageHeader title="" />

      {/* Hero card */}
      <Card shadow="sm" mb="md">
        <Card.Section p="md">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-2xl font-semibold">{member.avatarInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <Text size="xl" fw={600}>{member.firstName} {member.lastName}</Text>
              <Text size="sm" c="dimmed" ff="monospace">{member.memberNumber}</Text>
              <Group gap="xs" mt="xs">
                <Badge color={statusColor(member.status)} variant="light">{member.status}</Badge>
                {member.roles.map((r) => <Badge key={r} variant="default" size="sm">{r}</Badge>)}
              </Group>
            </div>
            <Group gap="xs" wrap="wrap">
              <Button variant="outline" size="sm" leftSection={<Pencil size={14} />} onClick={() => setEditing(!editing)}>
                {editing ? 'Abbrechen' : 'Bearbeiten'}
              </Button>
              <Button variant="outline" size="sm" leftSection={<MessageSquare size={14} />}>Nachricht</Button>
              <Button variant="outline" size="sm" leftSection={<QrCode size={14} />}>QR-Karte</Button>
              <Menu>
                <Menu.Target>
                  <ActionIcon variant="outline" size="md"><MoreHorizontal size={16} /></ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<UserMinus size={14} />}
                    onClick={() => {
                      if (confirm('Mitglied deaktivieren?')) {
                        fetcher.submit({ intent: 'deactivate-member' }, { method: 'post' });
                      }
                    }}
                  >
                    Deaktivieren
                  </Menu.Item>
                  <Menu.Item
                    color="red"
                    leftSection={<Trash2 size={14} />}
                    onClick={() => {
                      if (confirm('Mitglied endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
                        fetcher.submit({ intent: 'delete-member' }, { method: 'post' });
                      }
                    }}
                  >
                    Löschen
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </div>
        </Card.Section>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profil">
        <Tabs.List mb="md">
          <Tabs.Tab value="profil">Profil</Tabs.Tab>
          <Tabs.Tab value="rollen">Rollen &amp; Gruppen</Tabs.Tab>
          <Tabs.Tab value="kurse">Kurse &amp; Termine</Tabs.Tab>
          <Tabs.Tab value="anwesenheit">Anwesenheit</Tabs.Tab>
          <Tabs.Tab value="vertraege">Verträge</Tabs.Tab>
          <Tabs.Tab value="finanzen">Finanzen</Tabs.Tab>
          <Tabs.Tab value="kontoverbindung">Kontoverbindung</Tabs.Tab>
          <Tabs.Tab value="familie">Familie</Tabs.Tab>
        </Tabs.List>

        {/* Tab: Profil */}
        <Tabs.Panel value="profil">
          <Card shadow="sm">
            <Card.Section p="md">
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profileFieldRows.map((f) => (
                    <TextInput key={f.label} label={f.label} defaultValue={f.value} />
                  ))}
                  <div className="md:col-span-2 flex gap-2 pt-2">
                    <Button onClick={() => setEditing(false)}>Speichern</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>Abbrechen</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profileFieldRows.map((f) => (
                    <div key={f.label}>
                      <Text size="xs" c="dimmed">{f.label}</Text>
                      <Text size="sm" fw={500}>{f.value}</Text>
                    </div>
                  ))}
                </div>
              )}
            </Card.Section>
          </Card>
        </Tabs.Panel>

        {/* Tab: Rollen */}
        <Tabs.Panel value="rollen">
          <Card shadow="sm">
            <Card.Section p="md">
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm">Zugewiesene Rollen</Text>
                <Button size="xs" onClick={() => setRoleModalOpen(true)}>Rolle zuweisen</Button>
              </Group>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Rolle</Table.Th>
                    <Table.Th>Seit</Table.Th>
                    <Table.Th>Ende</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {roleAssignments.map((ra) => (
                    <Table.Tr key={ra.role}>
                      <Table.Td><Badge variant="default">{ra.role}</Badge></Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">{ra.startDate}</Text></Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">–</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              <div className="mt-6">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={600}>Gruppen / Mannschaften</Text>
                  <Button size="xs" variant="outline" leftSection={<Plus size={14} />} onClick={() => setGroupModalOpen(true)}>
                    Gruppe zuweisen
                  </Button>
                </Group>
                {member.groups.length === 0 ? (
                  <Text size="sm" c="dimmed">Keine Gruppen zugewiesen.</Text>
                ) : (
                  <Group gap="xs">
                    {member.groups.map((g) => (
                      <Badge
                        key={g.id}
                        variant={g.category === 'team' ? 'filled' : 'default'}
                        rightSection={
                          <button
                            className="ml-1 rounded-full hover:bg-black/20 p-0.5"
                            onClick={() => {
                              if (confirm(`'${g.name}' entfernen?`)) {
                                fetcher.submit({ intent: 'remove-group-member', groupId: g.id }, { method: 'post' });
                              }
                            }}
                          >
                            <X size={10} />
                          </button>
                        }
                      >
                        {g.name}
                        {g.category === 'team' && <span className="text-[10px] opacity-70 ml-1">Team</span>}
                      </Badge>
                    ))}
                  </Group>
                )}
              </div>
            </Card.Section>
          </Card>
        </Tabs.Panel>

        {/* Tab: Kurse */}
        <Tabs.Panel value="kurse">
          <Card shadow="sm">
            <Card.Section p="xl">
              <Text size="sm" c="dimmed" ta="center">Kursanmeldungen werden hier angezeigt, sobald das Mitglied in Kurse eingeschrieben ist.</Text>
            </Card.Section>
          </Card>
        </Tabs.Panel>

        {/* Tab: Anwesenheit */}
        <Tabs.Panel value="anwesenheit">
          <Card shadow="sm">
            <Card.Section p="xl">
              <Text size="sm" c="dimmed" ta="center">Anwesenheitsdaten werden hier angezeigt, sobald Einträge vorhanden sind.</Text>
            </Card.Section>
          </Card>
        </Tabs.Panel>

        {/* Tab: Verträge */}
        <Tabs.Panel value="vertraege">
          <Card shadow="sm">
            <Card.Section p="md">
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm">Verträge</Text>
                <Button size="xs" leftSection={<FileText size={14} />} onClick={() => navigate('/contracts/new')}>
                  Neuer Vertrag
                </Button>
              </Group>
              {contracts.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="xl">Keine Verträge vorhanden.</Text>
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Vertragsnr.</Table.Th>
                      <Table.Th>Art</Table.Th>
                      <Table.Th>Typ / Tarif</Table.Th>
                      <Table.Th>Startdatum</Table.Th>
                      <Table.Th>Enddatum</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Preis</Table.Th>
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {contracts.map((c) => (
                      <Table.Tr
                        key={c.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/contracts/${c.id}`)}
                      >
                        <Table.Td><Text size="xs" ff="monospace">{c.contractNumber}</Text></Table.Td>
                        <Table.Td>{c.contractKind === 'MEMBERSHIP' ? 'Mitgliedschaft' : 'Tarif'}</Table.Td>
                        <Table.Td>{c.typeName || '–'}</Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{c.startDate ? new Date(c.startDate).toLocaleDateString('de-DE') : '–'}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{c.endDate ? new Date(c.endDate).toLocaleDateString('de-DE') : '–'}</Text></Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}><Text fw={500}>{c.currentPrice != null ? `${c.currentPrice.toFixed(2)} €` : '–'}</Text></Table.Td>
                        <Table.Td>
                          <Badge
                            color={c.status === 'ACTIVE' ? 'green' : c.status === 'CANCELLED' ? 'red' : 'gray'}
                            variant="light"
                          >
                            {c.status === 'ACTIVE' ? 'Aktiv' : c.status === 'CANCELLED' ? 'Gekündigt' : c.status === 'PAUSED' ? 'Pausiert' : c.status === 'EXPIRED' ? 'Abgelaufen' : c.status}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card.Section>
          </Card>
        </Tabs.Panel>

        {/* Tab: Finanzen */}
        <Tabs.Panel value="finanzen">
          <Card shadow="sm">
            <Card.Section p="xl">
              <Text size="sm" c="dimmed" ta="center">Rechnungen werden hier angezeigt, sobald Rechnungen für dieses Mitglied vorhanden sind.</Text>
            </Card.Section>
          </Card>
        </Tabs.Panel>

        {/* Tab: Kontoverbindung */}
        <Tabs.Panel value="kontoverbindung">
          <Card shadow="sm">
            <Card.Section p="md">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Building2 size={16} />
                  <Text fw={600} size="sm">Kontoverbindung</Text>
                </Group>
                {bankAccount && !bankEditing && (
                  <Group gap="xs">
                    <Button size="xs" variant="outline" leftSection={<Pencil size={14} />} onClick={() => {
                      setBankForm({
                        accountHolder: bankAccount.accountHolder || '',
                        iban: bankAccount.iban || '',
                        bic: bankAccount.bic || '',
                        bankName: bankAccount.bankName || '',
                        sepaMandate: !!bankAccount.sepaMandate,
                        sepaMandateDate: bankAccount.sepaMandateDate || '',
                        sepaMandateRef: bankAccount.sepaMandateRef || '',
                      });
                      setBankEditing(true);
                    }}>Bearbeiten</Button>
                    <Button size="xs" color="red" leftSection={<Trash2 size={14} />} onClick={() => {
                      if (confirm('Kontoverbindung wirklich löschen?')) {
                        fetcher.submit({ intent: 'delete-bank-account' }, { method: 'post' });
                      }
                    }}>Löschen</Button>
                  </Group>
                )}
              </Group>

              {!bankAccount && !bankEditing ? (
                <Stack align="center" py="xl">
                  <Text size="sm" c="dimmed">Keine Kontoverbindung hinterlegt.</Text>
                  <Button variant="outline" leftSection={<Plus size={14} />} onClick={() => {
                    setBankForm({ accountHolder: `${member.firstName} ${member.lastName}`, iban: '', bic: '', bankName: '', sepaMandate: false, sepaMandateDate: '', sepaMandateRef: '' });
                    setBankEditing(true);
                  }}>Kontoverbindung anlegen</Button>
                </Stack>
              ) : bankEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput
                    label="Kontoinhaber *"
                    value={bankForm.accountHolder}
                    onChange={e => setBankForm(f => ({ ...f, accountHolder: e.target.value }))}
                  />
                  <TextInput
                    label="IBAN *"
                    value={bankForm.iban}
                    onChange={e => setBankForm(f => ({ ...f, iban: e.target.value.toUpperCase() }))}
                    placeholder="DE89 3704 0044 0532 0130 00"
                  />
                  <TextInput
                    label="BIC"
                    value={bankForm.bic}
                    onChange={e => setBankForm(f => ({ ...f, bic: e.target.value.toUpperCase() }))}
                  />
                  <TextInput
                    label="Bank"
                    value={bankForm.bankName}
                    onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))}
                  />
                  <div className="md:col-span-2">
                    <Divider my="sm" />
                    <Text size="sm" fw={500} mb="sm">SEPA-Lastschriftmandat</Text>
                    <Checkbox
                      checked={bankForm.sepaMandate}
                      onChange={(e) => setBankForm(f => ({ ...f, sepaMandate: e.currentTarget.checked }))}
                      label="SEPA-Lastschriftmandat erteilt"
                      mb="sm"
                    />
                    {bankForm.sepaMandate && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextInput
                          label="Mandatsdatum"
                          type="date"
                          value={bankForm.sepaMandateDate}
                          onChange={e => setBankForm(f => ({ ...f, sepaMandateDate: e.target.value }))}
                        />
                        <TextInput
                          label="Mandatsreferenz"
                          value={bankForm.sepaMandateRef}
                          onChange={e => setBankForm(f => ({ ...f, sepaMandateRef: e.target.value }))}
                          placeholder="z.B. SEPA-001-2026"
                        />
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2 flex gap-2 pt-2">
                    <Button
                      disabled={fetcher.state !== 'idle' || !bankForm.accountHolder || !bankForm.iban}
                      onClick={() => {
                        fetcher.submit({
                          intent: 'upsert-bank-account',
                          accountHolder: bankForm.accountHolder,
                          iban: bankForm.iban,
                          bic: bankForm.bic,
                          bankName: bankForm.bankName,
                          sepaMandate: bankForm.sepaMandate ? 'on' : '',
                          sepaMandateDate: bankForm.sepaMandateDate,
                          sepaMandateRef: bankForm.sepaMandateRef,
                        }, { method: 'post' });
                      }}
                    >
                      {fetcher.state !== 'idle' ? 'Speichern...' : 'Speichern'}
                    </Button>
                    <Button variant="outline" onClick={() => setBankEditing(false)}>Abbrechen</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Text size="xs" c="dimmed">Kontoinhaber</Text><Text size="sm" fw={500}>{bankAccount!.accountHolder}</Text></div>
                  <div><Text size="xs" c="dimmed">IBAN</Text><Text size="sm" fw={500} ff="monospace">{bankAccount!.iban}</Text></div>
                  <div><Text size="xs" c="dimmed">BIC</Text><Text size="sm" fw={500}>{bankAccount!.bic || '–'}</Text></div>
                  <div><Text size="xs" c="dimmed">Bank</Text><Text size="sm" fw={500}>{bankAccount!.bankName || '–'}</Text></div>
                  <div className="md:col-span-2">
                    <Divider my="sm" />
                    <Text size="xs" c="dimmed" mb="xs">SEPA-Lastschriftmandat</Text>
                    {bankAccount!.sepaMandate ? (
                      <Group gap="sm">
                        <Badge variant="outline" color="green">Erteilt</Badge>
                        {bankAccount!.sepaMandateDate && <Text size="sm" c="dimmed">Datum: {bankAccount!.sepaMandateDate}</Text>}
                        {bankAccount!.sepaMandateRef && <Text size="sm" c="dimmed">Ref: {bankAccount!.sepaMandateRef}</Text>}
                      </Group>
                    ) : (
                      <Badge variant="outline" color="gray">Nicht erteilt</Badge>
                    )}
                  </div>
                </div>
              )}
            </Card.Section>
          </Card>
        </Tabs.Panel>

        {/* Tab: Familie */}
        <Tabs.Panel value="familie">
          <Card shadow="sm">
            <Card.Section p="xl">
              <Stack align="center">
                <Text size="sm" c="dimmed">Kein Familienprofil vorhanden.</Text>
                <Button variant="outline" leftSection={<LinkIcon size={14} />}>Familienmitglied verknüpfen</Button>
              </Stack>
            </Card.Section>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Group assign modal */}
      <Modal opened={groupModalOpen} onClose={() => setGroupModalOpen(false)} title="Gruppe zuweisen" size="sm">
        <Stack gap="md">
          <Select
            label="Gruppe"
            value={selectedGroupId}
            onChange={(val) => setSelectedGroupId(val ?? '')}
            placeholder="Gruppe wählen..."
            data={groups
              .filter((g) => !member.groups.some((mg) => mg.id === g.id))
              .map((g) => ({
                value: g.id,
                label: `${g.name}${g.category === 'team' ? ' (Team)' : ''}`,
              }))}
          />
        </Stack>
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={() => { setGroupModalOpen(false); setSelectedGroupId(''); }}>Abbrechen</Button>
          <Button
            disabled={!selectedGroupId || fetcher.state !== 'idle'}
            onClick={() => {
              fetcher.submit({ intent: 'add-group-member', groupId: selectedGroupId }, { method: 'post' });
            }}
          >
            {fetcher.state !== 'idle' ? 'Wird zugewiesen...' : 'Zuweisen'}
          </Button>
        </Group>
      </Modal>

      {/* Role assign modal */}
      <Modal opened={roleModalOpen} onClose={() => setRoleModalOpen(false)} title="Rolle zuweisen" size="sm">
        <Stack gap="md">
          <Select
            label="Rolle"
            value={newRole}
            onChange={(val) => setNewRole(val ?? '')}
            placeholder="Rolle wählen"
            data={allRoles.map((r) => ({ value: r.name, label: r.name }))}
          />
          <TextInput label="Startdatum" type="text" placeholder="TT.MM.JJJJ" defaultValue="17.03.2026" />
        </Stack>
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={() => setRoleModalOpen(false)}>Abbrechen</Button>
          <Button onClick={() => setRoleModalOpen(false)}>Zuweisen</Button>
        </Group>
      </Modal>
    </div>
  );
}
