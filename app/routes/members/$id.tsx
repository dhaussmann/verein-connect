import { useEffect, useEffectEvent, useState } from 'react';
import { Link, redirect, useFetcher, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button, ActionIcon, Badge, Card, Text, Group, Stack,
  Tabs, Table, TextInput, Select, Modal, Menu, Checkbox,
  Divider,
} from '@mantine/core';
import {
  Pencil, MessageSquare, QrCode, MoreHorizontal, UserMinus, Trash2,
  Link as LinkIcon, FileText, X, Plus, Building2,
} from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { requireRouteData } from '@/core/runtime/route';
import { groupMemberRoleOptions, groupTypeOptions } from '@/modules/hockey/hockey-options';
import { addGroupMemberUseCase } from '@/modules/groups/use-cases/add-group-member.use-case';
import { removeGroupMemberUseCase } from '@/modules/groups/use-cases/remove-group-member.use-case';
import { upsertBankAccountUseCase, deleteBankAccountUseCase } from '@/modules/members/use-cases/bank-account.use-case';
import { getMemberDetailUseCase } from '@/modules/members/use-cases/get-member-detail.use-case';
import { assignMemberRoleUseCase } from '@/modules/members/use-cases/role-assignment.use-case';
import { updateMemberUseCase } from '@/modules/members/use-cases/update-member.use-case';
import { changeMemberStatusUseCase } from '@/modules/members/use-cases/change-member-status.use-case';
import { listGuardiansUseCase, createGuardianUseCase, updateGuardianUseCase, deleteGuardianUseCase } from '@/modules/members/use-cases/guardian.use-case';
import type { MemberProfileFieldOption } from '@/modules/members/types/member.types';

const statusColor = (s: string) =>
  s === 'Aktiv' ? 'green' : s === 'Inaktiv' ? 'gray' : 'yellow';

const groupTypeLabel = Object.fromEntries(groupTypeOptions.map((option) => [option.value, option.label]));

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const memberId = params.id;
  if (!memberId) throw new Error("Mitglied fehlt");
  const [detail, guardians] = await Promise.all([
    getMemberDetailUseCase(env, { orgId: user.orgId, memberId }),
    listGuardiansUseCase(env, { orgId: user.orgId, userId: memberId }),
  ]);
  return { ...detail, guardians };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const { env, user } = await requireRouteData(request, context);
  const memberId = params.id;
  if (!memberId) return { error: "Mitglied fehlt" };

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  try {
    if (intent === "deactivate-member") {
      await updateMemberUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        memberId,
        body: { status: "inactive" },
      });
      return { success: true, intent };
    }
    if (intent === "delete-member") {
      await changeMemberStatusUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        memberId,
        hardDelete: true,
      });
      return redirect("/members");
    }
    if (intent === "add-group-member") {
      const groupId = String(formData.get("groupId") || "");
      if (!groupId) return { success: false, intent, error: "Gruppe fehlt" };
      await addGroupMemberUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        groupId,
        userId: memberId,
        role: String(formData.get("groupRole") || "") || "Spieler",
      });
      return { success: true, intent };
    }
    if (intent === "assign-role") {
      const roleId = String(formData.get("roleId") || "");
      if (!roleId) return { success: false, intent, error: "Rolle fehlt" };
      await assignMemberRoleUseCase(env, { orgId: user.orgId, actorUserId: user.id, userId: memberId, roleId });
      return { success: true, intent };
    }
    if (intent === "remove-group-member") {
      const groupId = String(formData.get("groupId") || "");
      if (!groupId) return { success: false, intent, error: "Gruppe fehlt" };
      await removeGroupMemberUseCase(env, { orgId: user.orgId, actorUserId: user.id, groupId, userId: memberId });
      return { success: true, intent };
    }
    if (intent === "upsert-bank-account") {
      await upsertBankAccountUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        memberId,
        accountHolder: String(formData.get("accountHolder") || ""),
        iban: String(formData.get("iban") || ""),
        bic: String(formData.get("bic") || "") || null,
        bankName: String(formData.get("bankName") || "") || null,
        sepaMandate: formData.get("sepaMandate") === "on",
        sepaMandateDate: String(formData.get("sepaMandateDate") || "") || null,
        sepaMandateRef: String(formData.get("sepaMandateRef") || "") || null,
      });
      return { success: true, intent };
    }
    if (intent === "delete-bank-account") {
      await deleteBankAccountUseCase(env, { orgId: user.orgId, actorUserId: user.id, memberId });
      return { success: true, intent };
    }
    if (intent === "create-guardian") {
      await createGuardianUseCase(env, {
        orgId: user.orgId,
        userId: memberId,
        firstName: String(formData.get("firstName") || ""),
        lastName: String(formData.get("lastName") || ""),
        street: String(formData.get("street") || "") || null,
        zip: String(formData.get("zip") || "") || null,
        city: String(formData.get("city") || "") || null,
        phone: String(formData.get("phone") || "") || null,
        email: String(formData.get("email") || "") || null,
      });
      return { success: true, intent };
    }
    if (intent === "update-guardian") {
      await updateGuardianUseCase(env, {
        orgId: user.orgId,
        guardianId: String(formData.get("guardianId") || ""),
        firstName: String(formData.get("firstName") || ""),
        lastName: String(formData.get("lastName") || ""),
        street: String(formData.get("street") || "") || null,
        zip: String(formData.get("zip") || "") || null,
        city: String(formData.get("city") || "") || null,
        phone: String(formData.get("phone") || "") || null,
        email: String(formData.get("email") || "") || null,
      });
      return { success: true, intent };
    }
    if (intent === "delete-guardian") {
      await deleteGuardianUseCase(env, {
        orgId: user.orgId,
        guardianId: String(formData.get("guardianId") || ""),
      });
      return { success: true, intent };
    }
    if (intent === "update-member") {
      const profileFields: Record<string, string> = {};
      for (const [key, val] of formData.entries()) {
        if (key.startsWith("pf_")) {
          profileFields[key.slice(3)] = String(val);
        }
      }
      await updateMemberUseCase(env, {
        orgId: user.orgId,
        actorUserId: user.id,
        memberId,
        body: {
          first_name: String(formData.get("first_name") || ""),
          last_name: String(formData.get("last_name") || ""),
          email: String(formData.get("email") || ""),
          phone: String(formData.get("phone") || "") || undefined,
          mobile: String(formData.get("mobile") || "") || undefined,
          birth_date: String(formData.get("birth_date") || "") || undefined,
          gender: String(formData.get("gender") || "") || undefined,
          street: String(formData.get("street") || "") || undefined,
          zip: String(formData.get("zip") || "") || undefined,
          city: String(formData.get("city") || "") || undefined,
          join_date: String(formData.get("join_date") || "") || undefined,
          profile_fields: Object.keys(profileFields).length > 0 ? profileFields : undefined,
        },
      });
      return { success: true, intent };
    }
  } catch (error) {
    return { success: false, intent, error: error instanceof Error ? error.message : "Aktion fehlgeschlagen" };
  }

  return { error: "Unbekannte Aktion" };
}

export default function MemberDetail() {
  const { member, contracts, groups, roles, profileFields: profileFieldDefinitions, bankAccount, guardians } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedGroupRole, setSelectedGroupRole] = useState('Spieler');
  const [bankEditing, setBankEditing] = useState(false);
  const [bankForm, setBankForm] = useState({ accountHolder: '', iban: '', bic: '', bankName: '', sepaMandate: false, sepaMandateDate: '', sepaMandateRef: '' });
  const [guardianModalOpen, setGuardianModalOpen] = useState(false);
  const [guardianEditing, setGuardianEditing] = useState<string | null>(null);
  const [guardianForm, setGuardianForm] = useState({ firstName: '', lastName: '', street: '', zip: '', city: '', phone: '', email: '' });
  const allRoles = roles;
  const customFieldDefs: MemberProfileFieldOption[] = profileFieldDefinitions;
  const joinDateIso = member.joinDate ? member.joinDate.split('.').reverse().join('-') : '';

  const handleFetcherResult = useEffectEvent((data: NonNullable<typeof fetcher.data>) => {
    if (data.error) {
      notifications.show({ color: 'red', message: data.error });
      return;
    }
    if (!data.success) return;

    if (data.intent === 'deactivate-member') {
      notifications.show({ color: 'green', message: 'Mitglied deaktiviert' });
    } else if (data.intent === 'remove-group-member') {
      notifications.show({ color: 'green', message: 'Gruppe entfernt' });
    } else if (data.intent === 'add-group-member') {
      notifications.show({ color: 'green', message: 'Gruppe zugewiesen' });
      setGroupModalOpen(false);
      setSelectedGroupId('');
    } else if (data.intent === 'assign-role') {
      notifications.show({ color: 'green', message: 'Rolle zugewiesen' });
      setRoleModalOpen(false);
      setSelectedRoleId('');
    } else if (data.intent === 'delete-bank-account') {
      notifications.show({ color: 'green', message: 'Kontoverbindung gelöscht' });
      setBankEditing(false);
    } else if (data.intent === 'upsert-bank-account') {
      notifications.show({ color: 'green', message: 'Kontoverbindung gespeichert' });
      setBankEditing(false);
    } else if (data.intent === 'update-member') {
      notifications.show({ color: 'green', message: 'Mitglied gespeichert' });
      setEditing(false);
    } else if (data.intent === 'create-guardian' || data.intent === 'update-guardian') {
      notifications.show({ color: 'green', message: 'Erziehungsberechtigter gespeichert' });
      setGuardianModalOpen(false);
    } else if (data.intent === 'delete-guardian') {
      notifications.show({ color: 'green', message: 'Erziehungsberechtigter gelöscht' });
    }
  });

  useEffect(() => {
    if (!fetcher.data) return;
    handleFetcherResult(fetcher.data);
  }, [fetcher.data]);

  const roleAssignments = member.roles.map((r: string) => ({ role: r, startDate: member.joinDate }));
  const availableRoles = allRoles.filter((role) => role.isAssignable && !member.roles.includes(role.name));

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
              <Button variant="outline" size="sm" leftSection={<Pencil size={14} />} onClick={() => {
                if (!editing) {
                  setEditForm({
                    first_name: member.firstName,
                    last_name: member.lastName,
                    email: member.email,
                    phone: member.phone || '',
                    mobile: member.mobile || '',
                    birth_date: member.birthDate || '',
                    join_date: joinDateIso,
                    gender: member.gender || '',
                    street: member.street || '',
                    zip: member.zip || '',
                    city: member.city || '',
                  });
                }
                setEditing(!editing);
              }}>
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
          <Tabs.Tab value="erziehungsberechtigte">Erziehungsberechtigte</Tabs.Tab>
        </Tabs.List>

        {/* Tab: Profil */}
        <Tabs.Panel value="profil">
          <Card shadow="sm">
            <Card.Section p="md">
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Vorname', key: 'first_name' },
                    { label: 'Nachname', key: 'last_name' },
                    { label: 'E-Mail', key: 'email' },
                    { label: 'Telefon', key: 'phone' },
                    { label: 'Mobil', key: 'mobile' },
                    { label: 'Geburtsdatum', key: 'birth_date' },
                    { label: 'Beitritt', key: 'join_date' },
                    { label: 'Geschlecht', key: 'gender' },
                    { label: 'Straße', key: 'street' },
                    { label: 'PLZ', key: 'zip' },
                    { label: 'Stadt', key: 'city' },
                  ].map((f) => (
                    <TextInput
                      key={f.key}
                      label={f.label}
                      type={f.key === 'join_date' || f.key === 'birth_date' ? 'date' : 'text'}
                      value={editForm[f.key] ?? ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  ))}
                  {customFieldDefs.map((cf) => (
                    <TextInput
                      key={cf.name}
                      label={cf.label}
                      value={editForm[`pf_${cf.name}`] ?? member.customFields[cf.name] ?? ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, [`pf_${cf.name}`]: e.target.value }))}
                    />
                  ))}
                  <div className="md:col-span-2 flex gap-2 pt-2">
                    <Button
                      loading={fetcher.state !== 'idle'}
                      onClick={() => fetcher.submit({ intent: 'update-member', ...editForm }, { method: 'post' })}
                    >
                      Speichern
                    </Button>
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
                  <Text size="sm" fw={600}>Teams / Gruppen</Text>
                  <Button size="xs" variant="outline" leftSection={<Plus size={14} />} onClick={() => setGroupModalOpen(true)}>
                    Team zuweisen
                  </Button>
                </Group>
                {member.groups.length === 0 ? (
                  <Text size="sm" c="dimmed">Keine Teams zugewiesen.</Text>
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
                        <span className="text-[10px] opacity-70 ml-1">{groupTypeLabel[g.groupType || 'standard'] || g.groupType || g.category}</span>
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
                <Button size="xs" leftSection={<FileText size={14} />} component={Link} to="/contracts/new">
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
                      <Table.Tr key={c.id}>
                        <Table.Td><Text size="xs" ff="monospace"><Link to={`/contracts/${c.id}`}>{c.contractNumber}</Link></Text></Table.Td>
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

        {/* Tab: Erziehungsberechtigte */}
        <Tabs.Panel value="erziehungsberechtigte">
          <Card shadow="sm">
            <Card.Section p="md">
              <Group justify="space-between" mb="md">
                <Text fw={600} size="sm">Erziehungsberechtigte</Text>
                <Button size="xs" leftSection={<Plus size={14} />} onClick={() => {
                  setGuardianEditing(null);
                  setGuardianForm({ firstName: '', lastName: '', street: '', zip: '', city: '', phone: '', email: '' });
                  setGuardianModalOpen(true);
                }}>Hinzufügen</Button>
              </Group>
              {guardians.length === 0 ? (
                <Text size="sm" c="dimmed">Keine Erziehungsberechtigten vorhanden.</Text>
              ) : (
                <Stack gap="sm">
                  {guardians.map((g) => (
                    <Card key={g.id} withBorder padding="sm">
                      <Group justify="space-between">
                        <div>
                          <Text size="sm" fw={500}>{g.firstName} {g.lastName}</Text>
                          {g.email && <Text size="xs" c="dimmed">{g.email}</Text>}
                          {g.phone && <Text size="xs" c="dimmed">{g.phone}</Text>}
                          {(g.street || g.city) && (
                            <Text size="xs" c="dimmed">{[g.street, g.zip, g.city].filter(Boolean).join(', ')}</Text>
                          )}
                        </div>
                        <Group gap="xs">
                          <ActionIcon variant="subtle" onClick={() => {
                            setGuardianEditing(g.id);
                            setGuardianForm({
                              firstName: g.firstName,
                              lastName: g.lastName,
                              street: g.street ?? '',
                              zip: g.zip ?? '',
                              city: g.city ?? '',
                              phone: g.phone ?? '',
                              email: g.email ?? '',
                            });
                            setGuardianModalOpen(true);
                          }}><Pencil size={14} /></ActionIcon>
                          <ActionIcon variant="subtle" color="red" onClick={() => {
                            if (confirm('Erziehungsberechtigten löschen?')) {
                              fetcher.submit({ intent: 'delete-guardian', guardianId: g.id }, { method: 'post' });
                            }
                          }}><Trash2 size={14} /></ActionIcon>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              )}
            </Card.Section>
          </Card>
        </Tabs.Panel>
      </Tabs>

      <Modal opened={roleModalOpen} onClose={() => setRoleModalOpen(false)} title="Rolle zuweisen">
        <Stack>
          <Select
            label="Rolle"
            value={selectedRoleId}
            onChange={(value) => setSelectedRoleId(value ?? '')}
            data={availableRoles.map((role) => ({
              value: role.id,
              label: `${role.name} · ${role.roleType} · ${role.scope}`,
            }))}
          />
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setRoleModalOpen(false)}>Abbrechen</Button>
            <Button
              disabled={!selectedRoleId || fetcher.state !== 'idle'}
              onClick={() => fetcher.submit({ intent: 'assign-role', roleId: selectedRoleId }, { method: 'post' })}
            >
              Zuweisen
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={groupModalOpen} onClose={() => setGroupModalOpen(false)} title="Team / Gruppe zuweisen">
        <Stack>
          <Select
            label="Gruppe"
            value={selectedGroupId}
            onChange={(value) => setSelectedGroupId(value ?? '')}
            data={groups
              .filter((group) => !member.groups.some((assigned) => assigned.id === group.id))
              .map((group) => ({
                value: group.id,
                label: [group.name, group.ageBand, group.season].filter(Boolean).join(' · '),
              }))}
          />
          <Select
            label="Funktion"
            value={selectedGroupRole}
            onChange={(value) => setSelectedGroupRole(value ?? 'Spieler')}
            data={groupMemberRoleOptions}
          />
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setGroupModalOpen(false)}>Abbrechen</Button>
            <Button
              disabled={!selectedGroupId || fetcher.state !== 'idle'}
              onClick={() => fetcher.submit({ intent: 'add-group-member', groupId: selectedGroupId, groupRole: selectedGroupRole }, { method: 'post' })}
            >
              Zuweisen
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Guardian modal */}
      <Modal
        opened={guardianModalOpen}
        onClose={() => setGuardianModalOpen(false)}
        title={guardianEditing ? 'Erziehungsberechtigten bearbeiten' : 'Erziehungsberechtigten hinzufügen'}
      >
        <Stack>
          <div className="grid grid-cols-2 gap-4">
            <TextInput label="Vorname *" value={guardianForm.firstName} onChange={(e) => setGuardianForm(f => ({ ...f, firstName: e.target.value }))} />
            <TextInput label="Nachname *" value={guardianForm.lastName} onChange={(e) => setGuardianForm(f => ({ ...f, lastName: e.target.value }))} />
            <TextInput label="E-Mail" value={guardianForm.email} onChange={(e) => setGuardianForm(f => ({ ...f, email: e.target.value }))} />
            <TextInput label="Telefon" value={guardianForm.phone} onChange={(e) => setGuardianForm(f => ({ ...f, phone: e.target.value }))} />
            <TextInput label="Straße" value={guardianForm.street} onChange={(e) => setGuardianForm(f => ({ ...f, street: e.target.value }))} />
            <TextInput label="PLZ" value={guardianForm.zip} onChange={(e) => setGuardianForm(f => ({ ...f, zip: e.target.value }))} />
            <TextInput label="Stadt" className="col-span-2" value={guardianForm.city} onChange={(e) => setGuardianForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setGuardianModalOpen(false)}>Abbrechen</Button>
            <Button
              loading={fetcher.state !== 'idle'}
              onClick={() => {
                const data: Record<string, string> = {
                  intent: guardianEditing ? 'update-guardian' : 'create-guardian',
                  ...guardianForm,
                };
                if (guardianEditing) data.guardianId = guardianEditing;
                fetcher.submit(data, { method: 'post' });
              }}
            >
              Speichern
            </Button>
          </Group>
        </Stack>
      </Modal>

    </div>
  );
}
