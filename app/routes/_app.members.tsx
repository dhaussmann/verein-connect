import { useLoaderData, useNavigate, type LoaderFunctionArgs } from 'react-router';
import {
  Title,
  Text,
  Paper,
  Table,
  Group,
  Button,
  TextInput,
  Badge,
  ActionIcon,
  Avatar,
} from '@mantine/core';
import { IconPlus, IconSearch, IconEye } from '@tabler/icons-react';
import { requireAuth } from '~/core/auth/auth.server';
import { drizzle } from 'drizzle-orm/d1';
import { eq, like, or, count, desc } from 'drizzle-orm';
import { users } from '~/core/db/schema';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await requireAuth(request, context.cloudflare.env as any);
  const db = drizzle(context.cloudflare.env.DB);
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';

  let query = db.select().from(users).where(eq(users.orgId, user.orgId));

  const members = await db
    .select()
    .from(users)
    .where(eq(users.orgId, user.orgId))
    .orderBy(desc(users.createdAt))
    .limit(50);

  return { members, search };
}

export default function MembersPage() {
  const { members, search } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Mitglieder</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/members/new')}>
          Neues Mitglied
        </Button>
      </Group>

      <Paper withBorder p="md" radius="md" mb="md">
        <TextInput
          placeholder="Mitglieder suchen..."
          leftSection={<IconSearch size={16} />}
          defaultValue={search}
          onChange={(e) => {
            const val = e.currentTarget.value;
            if (val) {
              navigate(`/members?search=${encodeURIComponent(val)}`);
            } else {
              navigate('/members');
            }
          }}
        />
      </Paper>

      <Paper withBorder radius="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>E-Mail</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Mitgliedsnr.</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {members.map((member: any) => (
              <Table.Tr key={member.id}>
                <Table.Td>
                  <Group gap="sm">
                    <Avatar size="sm" color="blue">
                      {member.firstName?.[0]}{member.lastName?.[0]}
                    </Avatar>
                    <Text size="sm">{member.firstName} {member.lastName}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{member.email}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={member.status === 'active' ? 'green' : 'gray'}
                    variant="light"
                    size="sm"
                  >
                    {member.status === 'active' ? 'Aktiv' : member.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{member.memberNumber || '–'}</Text>
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    <IconEye size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
            {members.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="xl">
                    Keine Mitglieder gefunden.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </>
  );
}
