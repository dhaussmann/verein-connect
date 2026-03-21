import { Outlet, useLoaderData, useNavigate, type LoaderFunctionArgs } from 'react-router';
import { redirect } from 'react-router';
import { useState } from 'react';
import {
  AppShell,
  NavLink,
  ScrollArea,
  Group,
  Text,
  ActionIcon,
  Divider,
  Avatar,
  Menu,
  Burger,
  useMantineColorScheme,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard,
  IconUsers,
  IconCalendar,
  IconCalendarEvent,
  IconClipboardCheck,
  IconMail,
  IconFileText,
  IconCoin,
  IconShoppingCart,
  IconFolder,
  IconSettings,
  IconLogout,
  IconHeart,
  IconUsersGroup,
  IconReceipt,
  IconFileCheck,
  IconFileInvoice,
  IconUser,
  IconBook,
  IconTimeline,
} from '@tabler/icons-react';
import { requireAuth } from '~/core/auth/auth.server';
import { signOut } from '~/core/auth/auth.client';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await requireAuth(request, context.cloudflare.env as any);
  return { user };
}

const adminNavItems = [
  { label: 'Dashboard', icon: IconDashboard, href: '/dashboard' },
  { label: 'Mitglieder', icon: IconUsers, href: '/members' },
  { label: 'Kurse', icon: IconCalendar, href: '/courses' },
  { label: 'Veranstaltungen', icon: IconCalendarEvent, href: '/events' },
  { label: 'Anwesenheit', icon: IconClipboardCheck, href: '/attendance' },
  { label: 'Kommunikation', icon: IconMail, href: '/communication' },
  { label: 'Verträge', icon: IconFileText, href: '/contracts' },
  { label: 'Abrechnung', icon: IconReceipt, href: '/billing' },
  { label: 'Anträge', icon: IconFileCheck, href: '/applications' },
  { label: 'Familien', icon: IconHeart, href: '/families' },
  { label: 'Gruppen', icon: IconUsersGroup, href: '/groups' },
  { label: 'Finanzen', icon: IconCoin, href: '/finance' },
  { label: 'Shop', icon: IconShoppingCart, href: '/shop' },
  { label: 'Dateien', icon: IconFolder, href: '/files' },
  { label: 'Einstellungen', icon: IconSettings, href: '/settings' },
];

const memberNavItems = [
  { label: 'Übersicht', icon: IconDashboard, href: '/portal' },
  { label: 'Mein Profil', icon: IconUser, href: '/portal/profile' },
  { label: 'Meine Kurse', icon: IconBook, href: '/portal/courses' },
  { label: 'Meine Anwesenheit', icon: IconTimeline, href: '/portal/attendance' },
];

export default function AppLayout() {
  const { user } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [opened, { toggle, close }] = useDisclosure();

  const isAdmin = user.roles.includes('org_admin') || user.roles.includes('member_admin');
  const isTrainer = user.roles.includes('trainer');
  const navItems = isAdmin || isTrainer ? adminNavItems : memberNavItems;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg">
              Verein Connect
            </Text>
          </Group>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" size="lg" radius="xl">
                <Avatar size="sm" color="blue">
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </Avatar>
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>
                {user.firstName} {user.lastName}
              </Menu.Label>
              <Menu.Item
                leftSection={<IconSettings size={14} />}
                onClick={() => navigate('/settings')}
              >
                Einstellungen
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconLogout size={14} />}
                onClick={handleLogout}
              >
                Abmelden
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <AppShell.Section grow component={ScrollArea}>
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              label={item.label}
              leftSection={<item.icon size={18} stroke={1.5} />}
              onClick={() => {
                navigate(item.href);
                close();
              }}
              active={typeof window !== 'undefined' && window.location.pathname.startsWith(item.href)}
            />
          ))}
        </AppShell.Section>
        <AppShell.Section>
          <Divider my="xs" />
          <Group px="xs" py="xs">
            <Avatar size="sm" color="blue">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </Avatar>
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {user.firstName} {user.lastName}
              </Text>
              <Text size="xs" c="dimmed">
                {user.email}
              </Text>
            </Box>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
