import { useState } from 'react';
import { Button, Group, Modal, Select, Stack } from '@mantine/core';
import { useFetcherNotify } from '@/hooks/use-fetcher-notify';

type Role = {
  id: string;
  name: string;
  roleType: string;
  scope: string;
};

type Props = {
  availableRoles: Role[];
};

export function RoleModal({ availableRoles }: Props) {
  const [opened, setOpened] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  const fetcher = useFetcherNotify(
    { 'assign-role': 'Rolle zugewiesen' },
    { onSuccess: () => { setOpened(false); setSelectedRoleId(''); } },
  );

  return (
    <>
      <Button size="xs" onClick={() => setOpened(true)}>Rolle zuweisen</Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Rolle zuweisen">
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
            <Button variant="outline" onClick={() => setOpened(false)}>Abbrechen</Button>
            <Button
              disabled={!selectedRoleId || fetcher.state !== 'idle'}
              onClick={() => fetcher.submit({ intent: 'assign-role', roleId: selectedRoleId }, { method: 'post' })}
            >
              Zuweisen
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
