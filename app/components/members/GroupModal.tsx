import { useState } from 'react';
import { Button, Group, Modal, Select, Stack } from '@mantine/core';
import { Plus } from 'lucide-react';
import { useFetcherNotify } from '@/hooks/use-fetcher-notify';
import { groupMemberRoleOptions } from '@/modules/hockey/hockey-options';

type GroupItem = {
  id: string;
  name: string;
  ageBand?: string | null;
  season?: string | null;
};

type Props = {
  groups: GroupItem[];
  assignedGroupIds: string[];
};

export function GroupModal({ groups, assignedGroupIds }: Props) {
  const [opened, setOpened] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedGroupRole, setSelectedGroupRole] = useState('Spieler');

  const fetcher = useFetcherNotify(
    { 'add-group-member': 'Gruppe zugewiesen' },
    { onSuccess: () => { setOpened(false); setSelectedGroupId(''); } },
  );

  const availableGroups = groups.filter((g) => !assignedGroupIds.includes(g.id));

  return (
    <>
      <Button size="xs" variant="outline" leftSection={<Plus size={14} />} onClick={() => setOpened(true)}>
        Team zuweisen
      </Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Team / Gruppe zuweisen">
        <Stack>
          <Select
            label="Gruppe"
            value={selectedGroupId}
            onChange={(value) => setSelectedGroupId(value ?? '')}
            data={availableGroups.map((group) => ({
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
            <Button variant="outline" onClick={() => setOpened(false)}>Abbrechen</Button>
            <Button
              disabled={!selectedGroupId || fetcher.state !== 'idle'}
              onClick={() => fetcher.submit({ intent: 'add-group-member', groupId: selectedGroupId, groupRole: selectedGroupRole }, { method: 'post' })}
            >
              Zuweisen
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
