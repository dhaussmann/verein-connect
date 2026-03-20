import { NavLink, useFetcher, useMatches } from "react-router";
import {
  LayoutDashboard, Users, UsersRound, GraduationCap, Calendar,
  ClipboardCheck, MessageSquare, Receipt,
  Settings, ChevronLeft, ChevronRight, ChevronDown, LogOut,
  User, BookOpen, FileText, ClipboardList, CreditCard, SlidersHorizontal,
  ListChecks,
} from 'lucide-react';
import { cn } from '@/core/lib/utils';
import { useEffect, useState } from 'react';
import { Badge } from '@mantine/core';
import { useCurrentUser } from "@/hooks/use-current-user";

interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const adminNavItems: NavItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Mitglieder', path: '/members', icon: Users },
  { title: 'Gruppen', path: '/groups', icon: UsersRound },
  { title: 'Kurse', path: '/courses', icon: GraduationCap },
  { title: 'Termine', path: '/events', icon: Calendar },
  { title: 'Anwesenheit', path: '/attendance', icon: ClipboardCheck },
  { title: 'Kommunikation', path: '/communication', icon: MessageSquare },
  {
    title: 'Verträge', path: '/contracts', icon: FileText,
    children: [
      { title: 'Übersicht', path: '/contracts', icon: ListChecks },
      { title: 'Einstellungen', path: '/contracts/settings', icon: SlidersHorizontal },
      { title: 'Abrechnung', path: '/billing', icon: CreditCard },
      { title: 'Anträge', path: '/applications', icon: ClipboardList },
    ],
  },
  { title: 'Finanzen', path: '/finance', icon: Receipt },
  { title: 'Einstellungen', path: '/settings', icon: Settings },
];

const memberNavItems: NavItem[] = [
  { title: 'Übersicht', path: '/portal', icon: LayoutDashboard },
  { title: 'Mein Profil', path: '/portal/profile', icon: User },
  { title: 'Meine Kurse', path: '/portal/courses', icon: GraduationCap },
  { title: 'Meine Anwesenheit', path: '/portal/attendance', icon: ClipboardCheck },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const user = useCurrentUser();
  const matches = useMatches();
  const logoutFetcher = useFetcher();
  const currentPath = matches[matches.length - 1]?.pathname ?? "/";

  const isChildActive = (item: NavItem) =>
    item.children?.some((child) => currentPath === child.path || currentPath.startsWith(child.path + "/"));

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    adminNavItems.forEach(item => {
      if (item.children) {
        const childPaths = item.children.map(c => c.path);
        if (childPaths.some((path) => currentPath === path || currentPath.startsWith(path + "/"))) {
          initial[item.path] = true;
        }
      }
    });
    return initial;
  });

  useEffect(() => {
    setOpenMenus((prev) => {
      const next = { ...prev };

      adminNavItems.forEach((item) => {
        if (!item.children) return;

        const shouldBeOpen = item.children.some(
          (child) => currentPath === child.path || currentPath.startsWith(child.path + "/"),
        );

        if (shouldBeOpen) {
          next[item.path] = true;
        }
      });

      return next;
    });
  }, [currentPath]);

  const toggleMenu = (path: string) =>
    setOpenMenus(prev => ({ ...prev, [path]: !prev[path] }));

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    trainer: 'Trainer',
    member: 'Mitglied',
  };

  const renderNavItem = (item: NavItem) => {
    const hasChildren = !!item.children?.length;
    const isOpen = !!openMenus[item.path];
    const childActive = hasChildren && isChildActive(item);
    const isActive = !hasChildren && (currentPath === item.path || currentPath.startsWith(item.path + "/"));

    if (hasChildren) {
      return (
        <div key={item.path}>
          <button
            onClick={() => toggleMenu(item.path)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 relative',
              childActive
                ? 'text-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0'
            )}
          >
            {childActive && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
            )}
            <item.icon className={cn('h-5 w-5 shrink-0', collapsed ? '' : 'ml-1')} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.title}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform duration-150', isOpen && 'rotate-180')} />
              </>
            )}
          </button>
          {!collapsed && isOpen && (
            <div className="ml-4 border-l border-border">
              {item.children!.map(child => {
                const isChildItemActive = currentPath === child.path
                  || (currentPath.startsWith(child.path + '/') && child.path !== '/contracts');
                return (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    className={() =>
                      cn(
                        'w-full flex items-center gap-3 pl-4 pr-4 py-2 text-sm transition-colors duration-150 relative',
                        isChildItemActive
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                    onClick={onMobileClose}
                  >
                    <child.icon className="h-4 w-4 shrink-0" />
                    <span>{child.title}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onMobileClose}
        className={() =>
          cn(
            'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 relative',
            isActive
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            collapsed && 'justify-center px-0'
          )
        }
      >
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
        )}
        <item.icon className={cn('h-5 w-5 shrink-0', collapsed ? '' : 'ml-1')} />
        {!collapsed && <span>{item.title}</span>}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-popover border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border min-h-[64px]">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-sm">CB</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-semibold text-sm truncate">{user?.clubName || 'Clubboard'}</p>
            <p className="text-xs text-muted-foreground truncate">Vereinsverwaltung</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {(user?.role === 'admin' || user?.role === 'trainer' ? adminNavItems : memberNavItems).map(renderNavItem)}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-4">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-xs font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <Badge variant="secondary" className="text-xs mt-0.5">{roleLabels[user?.role || 'member']}</Badge>
            </div>
          )}
        </div>
        {!collapsed && (
          <logoutFetcher.Form method="post" action="/logout">
            <button
              type="submit"
              className="mt-3 w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
          </logoutFetcher.Form>
        )}
      </div>

      {/* Collapse toggle - desktop only */}
      <button
        onClick={onToggle}
        className="hidden md:flex items-center justify-center h-10 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-foreground/20 z-40 md:hidden" onClick={onMobileClose} />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 w-[260px] transform transition-transform duration-150 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col shrink-0 h-screen sticky top-0 transition-all duration-150',
          collapsed ? 'w-16' : 'w-[260px]'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
