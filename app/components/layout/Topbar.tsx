import { Bell, Menu as MenuIcon, Search, ChevronRight, User, LogOut, Building2 } from 'lucide-react';
import { Link, useLocation, useRouteLoaderData, useFetcher } from "react-router";
import type { RootLoaderData } from "@/root";
import { ActionIcon, Badge, Menu, Modal, TextInput } from '@mantine/core';
import { useState, useEffect, useCallback } from 'react';

const breadcrumbMap: Record<string, string> = {
  dashboard: 'Dashboard',
  members: 'Mitglieder',
  courses: 'Kurse',
  events: 'Termine',
  attendance: 'Anwesenheit',
  communication: 'Kommunikation',
  finance: 'Finanzen',
  settings: 'Einstellungen',
  new: 'Neu',
  email: 'E-Mail',
  accounting: 'Buchhaltung',
  roles: 'Rollen',
  fields: 'Profilfelder',
};

interface TopbarProps {
  onMobileMenuOpen: () => void;
}

export function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const location = useLocation();
  const { user } = (useRouteLoaderData("root") as RootLoaderData) ?? {};
  const logoutFetcher = useFetcher();
  const [searchOpen, setSearchOpen] = useState(false);

  const segments = location.pathname.split('/').filter(Boolean);
  const crumbs = segments.map((seg) => breadcrumbMap[seg] || seg);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setSearchOpen(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <header className="h-14 border-b border-border bg-popover flex items-center px-4 gap-4 shrink-0">
        <ActionIcon variant="subtle" className="md:hidden" onClick={onMobileMenuOpen}>
          <MenuIcon size={20} />
        </ActionIcon>

        {/* Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} />}
              <span className={i === crumbs.length - 1 ? 'text-foreground font-medium' : ''}>{crumb}</span>
            </span>
          ))}
        </nav>

        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted rounded-md hover:bg-border transition-colors"
        >
          <Search size={16} />
          <span className="hidden sm:inline">Suche...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-popover px-1.5 py-0.5 text-xs">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <div className="relative">
          <ActionIcon variant="subtle">
            <Bell size={20} />
          </ActionIcon>
          <Badge
            size="xs"
            color="red"
            style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, padding: '0 4px' }}
          >
            3
          </Badge>
        </div>

        {/* User dropdown */}
        <Menu position="bottom-end" width={180}>
          <Menu.Target>
            <button className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<User size={14} />} component={Link} to="/settings">
              Profil
            </Menu.Item>
            <Menu.Item leftSection={<Building2 size={14} />}>
              Vereinswechsel
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<LogOut size={14} />}>
              <logoutFetcher.Form method="post" action="/logout" style={{ display: 'contents' }}>
                <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                  Abmelden
                </button>
              </logoutFetcher.Form>
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </header>

      {/* Search modal */}
      <Modal opened={searchOpen} onClose={() => setSearchOpen(false)} size="lg" padding={0} withCloseButton={false}>
        <div className="p-4">
          <TextInput
            placeholder="Mitglieder, Kurse, Termine durchsuchen..."
            leftSection={<Search size={16} />}
            autoFocus
            size="md"
            mb="sm"
          />
          <div className="py-4 text-sm text-center" style={{ color: 'var(--mantine-color-dimmed)' }}>
            Tippe um zu suchen...
          </div>
        </div>
      </Modal>
    </>
  );
}
