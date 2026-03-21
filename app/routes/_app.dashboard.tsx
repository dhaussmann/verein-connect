import { useLoaderData, type LoaderFunctionArgs } from 'react-router';
import {
  Title,
  Text,
  SimpleGrid,
  Paper,
  Group,
  ThemeIcon,
} from '@mantine/core';
import {
  IconUsers,
  IconCalendarEvent,
  IconFileText,
  IconCoin,
} from '@tabler/icons-react';
import { requireAuth } from '~/core/auth/auth.server';
import { drizzle } from 'drizzle-orm/d1';
import { eq, count, sql } from 'drizzle-orm';
import { users, events, contracts } from '~/core/db/schema';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await requireAuth(request, context.cloudflare.env as any);
  const db = drizzle(context.cloudflare.env.DB);

  const [memberCount] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.orgId, user.orgId));

  const [eventCount] = await db
    .select({ count: count() })
    .from(events)
    .where(eq(events.orgId, user.orgId));

  const [contractCount] = await db
    .select({ count: count() })
    .from(contracts)
    .where(eq(contracts.orgId, user.orgId));

  return {
    user,
    stats: {
      members: memberCount?.count ?? 0,
      events: eventCount?.count ?? 0,
      contracts: contractCount?.count ?? 0,
    },
  };
}

export default function DashboardPage() {
  const { user, stats } = useLoaderData<typeof loader>();

  const statCards = [
    { title: 'Mitglieder', value: stats.members, icon: IconUsers, color: 'blue' },
    { title: 'Veranstaltungen', value: stats.events, icon: IconCalendarEvent, color: 'green' },
    { title: 'Verträge', value: stats.contracts, icon: IconFileText, color: 'violet' },
  ];

  return (
    <>
      <Title order={2} mb="lg">
        Dashboard
      </Title>
      <Text c="dimmed" mb="xl">
        Willkommen zurück, {user.firstName}!
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {statCards.map((stat) => (
          <Paper key={stat.title} withBorder p="md" radius="md" shadow="sm">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  {stat.title}
                </Text>
                <Text fw={700} size="xl">
                  {stat.value}
                </Text>
              </div>
              <ThemeIcon color={stat.color} variant="light" size={38} radius="md">
                <stat.icon size={22} stroke={1.5} />
              </ThemeIcon>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>
    </>
  );
}
