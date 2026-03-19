import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card, Button, TextInput, Badge, Avatar, Modal, Text, Group, Stack,
} from '@mantine/core';
import { User, Mail, Phone, MapPin, Calendar, Shield, Lock } from 'lucide-react';
import { notifications } from '@mantine/notifications';

type ProfileRole = {
  id: string;
  name: string;
  description?: string | null;
};

type PortalProfile = {
  avatarInitials: string;
  firstName: string;
  lastName: string;
  email: string;
  memberNumber: string;
  status: string;
  phone?: string;
  mobile?: string;
  street?: string;
  zip?: string;
  city?: string;
  birthDate?: string;
  gender?: string;
  joinDate?: string;
  roles: ProfileRole[];
  customFields: Record<string, string>;
};

export default function MyProfile({
  profile,
  actionData,
  navigationState,
}: {
  profile: PortalProfile | null;
  actionData?: { success?: boolean; intent?: string; error?: string };
  navigationState: string;
}) {
  const [editing, setEditing] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    if (!actionData) return;
    if (actionData.success && actionData.intent === 'save-profile') {
      notifications.show({ color: 'green', message: 'Profil wurde aktualisiert!' });
      setEditing(false);
    } else if (actionData.success && actionData.intent === 'change-password') {
      notifications.show({ color: 'green', message: 'Passwort wurde geändert!' });
      setPasswordOpen(false);
    } else if (actionData.error) {
      notifications.show({ color: 'red', message: actionData.error });
    }
  }, [actionData]);

  if (!profile) {
    return (
      <div>
        <PageHeader title="Mein Profil" />
        <Text ta="center" py="xl" c="dimmed">Profil konnte nicht geladen werden.</Text>
      </div>
    );
  }

  const roleLabel = (r: string) => {
    const map: Record<string, string> = { org_admin: 'Admin', trainer: 'Trainer', member: 'Mitglied' };
    return map[r] || r;
  };

  return (
    <div>
      <PageHeader title="Mein Profil">
        <Group gap="xs" mt="md">
          {!editing && <Button onClick={() => setEditing(true)}>Profil bearbeiten</Button>}
          <Button variant="outline" leftSection={<Lock size={16} />} onClick={() => setPasswordOpen(true)}>
            Passwort ändern
          </Button>
        </Group>
      </PageHeader>

      {/* Profile Header */}
      <Card withBorder mb="md">
        <Card.Section p="md">
          <Group gap="md">
            <Avatar size={64} color="blue">
              {profile.avatarInitials}
            </Avatar>
            <div>
              <Text size="xl" fw={700}>{profile.firstName} {profile.lastName}</Text>
              <Text c="dimmed">{profile.email}</Text>
              <Group gap="xs" mt="xs">
                <Badge variant="outline">{profile.memberNumber}</Badge>
                <Badge
                  variant="outline"
                  color={profile.status === 'Aktiv' ? 'green' : 'gray'}
                >
                  {profile.status}
                </Badge>
              </Group>
            </div>
          </Group>
        </Card.Section>
      </Card>

      {editing ? (
        <form method="post">
          <Card withBorder mb="md">
            <Card.Section p="md">
              <Text fw={600} mb="md">Kontaktdaten bearbeiten</Text>
              <Stack gap="md">
                <input type="hidden" name="intent" value="save-profile" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput label="Telefon" name="phone" defaultValue={profile.phone} />
                  <TextInput label="Mobil" name="mobile" defaultValue={profile.mobile} />
                </div>
                <TextInput label="Straße" name="street" defaultValue={profile.street} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput label="PLZ" name="zip" defaultValue={profile.zip} />
                  <TextInput label="Stadt" name="city" defaultValue={profile.city} />
                </div>
                <Group gap="xs">
                  <Button type="submit" disabled={navigationState === 'submitting'}>
                    {navigationState === 'submitting' ? 'Speichern...' : 'Änderungen speichern'}
                  </Button>
                  <Button type="button" variant="subtle" onClick={() => setEditing(false)}>Abbrechen</Button>
                </Group>
              </Stack>
            </Card.Section>
          </Card>
        </form>
      ) : (
        <>
          {/* Personal Data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card withBorder>
              <Card.Section p="md">
                <Group gap="xs" mb="md">
                  <User size={16} />
                  <Text fw={600} size="sm">Persönliche Daten</Text>
                </Group>
                <Stack gap="sm">
                  <InfoRow label="Vorname" value={profile.firstName} />
                  <InfoRow label="Nachname" value={profile.lastName} />
                  <InfoRow label="Geburtsdatum" value={profile.birthDate || '–'} />
                  <InfoRow label="Geschlecht" value={profile.gender || '–'} />
                  <InfoRow label="Mitglied seit" value={profile.joinDate || '–'} />
                </Stack>
              </Card.Section>
            </Card>

            <Card withBorder>
              <Card.Section p="md">
                <Group gap="xs" mb="md">
                  <Phone size={16} />
                  <Text fw={600} size="sm">Kontaktdaten</Text>
                </Group>
                <Stack gap="sm">
                  <InfoRow label="E-Mail" value={profile.email} icon={<Mail size={14} />} />
                  <InfoRow label="Telefon" value={profile.phone || '–'} />
                  <InfoRow label="Mobil" value={profile.mobile || '–'} />
                  <InfoRow label="Adresse" value={profile.street ? `${profile.street}, ${profile.zip} ${profile.city}` : '–'} icon={<MapPin size={14} />} />
                </Stack>
              </Card.Section>
            </Card>
          </div>

          {/* Roles */}
          <Card withBorder mb="md">
            <Card.Section p="md">
              <Group gap="xs" mb="md">
                <Shield size={16} />
                <Text fw={600} size="sm">Rollen &amp; Gruppen</Text>
              </Group>
              <Group gap="xs">
                {profile.roles.map((r) => (
                  <Badge
                    key={r.id}
                    variant="outline"
                    color={r.name === 'org_admin' ? 'blue' : 'gray'}
                  >
                    {roleLabel(r.name)}
                    {r.description && <span className="ml-1 font-normal opacity-60">– {r.description}</span>}
                  </Badge>
                ))}
                {profile.roles.length === 0 && <Text size="sm" c="dimmed">Keine Rollen zugewiesen</Text>}
              </Group>
            </Card.Section>
          </Card>

          {/* Custom Fields */}
          {Object.keys(profile.customFields).length > 0 && (
            <Card withBorder>
              <Card.Section p="md">
                <Text fw={600} size="sm" mb="md">Zusätzliche Felder</Text>
                <Stack gap="sm">
                  {Object.entries(profile.customFields).map(([key, value]) => (
                    <InfoRow key={key} label={key} value={value || '–'} />
                  ))}
                </Stack>
              </Card.Section>
            </Card>
          )}
        </>
      )}

      {/* Password Change Modal */}
      <Modal opened={passwordOpen} onClose={() => setPasswordOpen(false)} title="Passwort ändern" size="sm">
        <form method="post">
          <Stack gap="md">
            <input type="hidden" name="intent" value="change-password" />
            <TextInput label="Aktuelles Passwort" name="current_password" type="password" required />
            <TextInput label="Neues Passwort" name="new_password" type="password" required minLength={8} placeholder="Mind. 8 Zeichen" />
            <TextInput label="Neues Passwort bestätigen" name="confirm_password" type="password" required minLength={8} />
          </Stack>
          <Group justify="flex-end" mt="md">
            <Button type="button" variant="subtle" onClick={() => setPasswordOpen(false)}>Abbrechen</Button>
            <Button type="submit" disabled={navigationState === 'submitting'}>
              {navigationState === 'submitting' ? 'Ändern...' : 'Passwort ändern'}
            </Button>
          </Group>
        </form>
      </Modal>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Group justify="space-between">
      <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{icon}{label}</Text>
      <Text size="sm" fw={500}>{value}</Text>
    </Group>
  );
}
