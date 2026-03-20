import { useState } from 'react';
import { Link, redirect, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button, ActionIcon, Badge, Card, Text, Group, Stack,
  Tabs, Table, TextInput, Menu,
} from '@mantine/core';
import {
  Pencil, MessageSquare, QrCode, MoreHorizontal, UserMinus, Trash2,
  Link as LinkIcon, FileText, X,
} from 'lucide-react';
import { requireRouteData } from '@/core/runtime/route';
import { groupTypeOptions } from '@/modules/hockey/hockey-options';
import { useFetcherNotify } from '@/hooks/use-fetcher-notify';
import { RoleModal } from '@/components/members/RoleModal';
import { GroupModal } from '@/components/members/GroupModal';
import { BankAccountSection } from '@/components/members/BankAccountSection';
import { GuardianSection } from '@/components/members/GuardianSection';
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
  const [editing, setEditing] = useState(false);

  const fetcher = useFetcherNotify(
    {
      'update-member': 'Mitglied gespeichert',
      'deactivate-member': 'Mitglied deaktiviert',
      'remove-group-member': 'Gruppe entfernt',
    },
    { onSuccess: (data) => { if (data.intent === 'update-member') setEditing(false); } },
  );

  const customFieldDefs: MemberProfileFieldOption[] = profileFieldDefinitions;
  const joinDateIso = member.joinDate ? member.joinDate.split('.').reverse().join('-') : '';
  const availableRoles = roles.filter((role) => role.isAssignable && !member.roles.includes(role.name));

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
              <Button variant="outline" size="sm" leftSection={<Pencil size={14} />} onClick={() => setEditing((v) => !v)}>
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
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="update-member" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Vorname', key: 'first_name', value: member.firstName },
                      { label: 'Nachname', key: 'last_name', value: member.lastName },
                      { label: 'E-Mail', key: 'email', value: member.email },
                      { label: 'Telefon', key: 'phone', value: member.phone ?? '' },
                      { label: 'Mobil', key: 'mobile', value: member.mobile ?? '' },
                      { label: 'Geburtsdatum', key: 'birth_date', value: member.birthDate ?? '' },
                      { label: 'Beitritt', key: 'join_date', value: joinDateIso },
                      { label: 'Geschlecht', key: 'gender', value: member.gender ?? '' },
                      { label: 'Straße', key: 'street', value: member.street ?? '' },
                      { label: 'PLZ', key: 'zip', value: member.zip ?? '' },
                      { label: 'Stadt', key: 'city', value: member.city ?? '' },
                    ].map((f) => (
                      <TextInput
                        key={f.key}
                        name={f.key}
                        label={f.label}
                        type={f.key === 'join_date' || f.key === 'birth_date' ? 'date' : 'text'}
                        defaultValue={f.value}
                      />
                    ))}
                    {customFieldDefs.map((cf) => (
                      <TextInput
                        key={cf.name}
                        name={`pf_${cf.name}`}
                        label={cf.label}
                        defaultValue={member.customFields[cf.name] ?? ''}
                      />
                    ))}
                    <div className="md:col-span-2 flex gap-2 pt-2">
                      <Button type="submit" loading={fetcher.state !== 'idle'}>Speichern</Button>
                      <Button variant="outline" type="button" onClick={() => setEditing(false)}>Abbrechen</Button>
                    </div>
                  </div>
                </fetcher.Form>
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
                <RoleModal availableRoles={availableRoles} />
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
                  {member.roles.map((r: string) => (
                    <Table.Tr key={r}>
                      <Table.Td><Badge variant="default">{r}</Badge></Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">{member.joinDate}</Text></Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">–</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              <div className="mt-6">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={600}>Teams / Gruppen</Text>
                  <GroupModal groups={groups} assignedGroupIds={member.groups.map((g) => g.id)} />
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
          <BankAccountSection bankAccount={bankAccount} member={member} />
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
          <GuardianSection guardians={guardians} />
        </Tabs.Panel>
      </Tabs>

    </div>
  );
}
