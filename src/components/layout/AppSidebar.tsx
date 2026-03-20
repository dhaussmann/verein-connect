import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UsersRound, GraduationCap, Calendar,
  ClipboardCheck, MessageSquare, Receipt, ShoppingBag,
  FolderArchive, Settings, ChevronLeft, ChevronRight, ChevronDown, LogOut,
  User, BookOpen, FileText, ClipboardList, CreditCard, SlidersHorizontal,
  ListChecks, Heart, Shield, Columns3, Bell, Puzzle, Lock, UserCog,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useOrganizationSettings } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const adminNavItems: NavItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  {
    title: 'Mitglieder', path: '/members', icon: Users,
    children: [
      { title: 'Verwaltung', path: '/members', icon: ListChecks },
      { title: 'Gruppen', path: '/groups', icon: UsersRound },
      { title: 'Familien', path: '/families', icon: Heart },
    ],
  },
  { title: 'Training', path: '/courses', icon: GraduationCap },
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
  { title: 'Webshop', path: '/shop', icon: ShoppingBag },
  { title: 'Materialbank', path: '/files', icon: FolderArchive },
  {
    title: 'Einstellungen', path: '/settings', icon: Settings,
    children: [
      { title: 'Benutzer', path: '/settings/users', icon: Users },
      { title: 'Allgemein', path: '/settings/general', icon: SlidersHorizontal },
      { title: 'Mitglieder', path: '/settings/members', icon: UserCog },
      { title: 'Rollen & Berechtigungen', path: '/settings/roles', icon: Shield },
      { title: 'Profilfelder', path: '/settings/fields', icon: Columns3 },
      { title: 'Benachrichtigungen', path: '/settings/notifications', icon: Bell },
      { title: 'Integrationen', path: '/settings/integrations', icon: Puzzle },
      { title: 'DSGVO & Datenschutz', path: '/settings/gdpr', icon: Lock },
    ],
  },
];

const memberNavItems: NavItem[] = [
  { title: 'Übersicht', path: '/portal', icon: LayoutDashboard },
  { title: 'Mein Profil', path: '/portal/profile', icon: User },
  { title: 'Mein Training', path: '/portal/courses', icon: GraduationCap },
  { title: 'Meine Anwesenheit', path: '/portal/attendance', icon: ClipboardCheck },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { data: orgData } = useOrganizationSettings();
  const org = orgData as any;
  const apiBase = import.meta.env.VITE_API_URL || 'https://verein-connect-api.cloudflareone-demo-account.workers.dev';
  const logoSrc = org?.logoUrl ? `${apiBase}${org.logoUrl}` : null;

  const isChildActive = (item: NavItem) =>
    item.children?.some(c => location.pathname === c.path || location.pathname.startsWith(c.path + '/'));

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    adminNavItems.forEach(item => {
      if (item.children) {
        const childPaths = item.children.map(c => c.path);
        if (childPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))) {
          initial[item.path] = true;
        }
      }
    });
    return initial;
  });

  const toggleMenu = (path: string) =>
    setOpenMenus(prev => ({ ...prev, [path]: !prev[path] }));

  const handleNav = (path: string) => {
    navigate(path);
    onMobileClose();
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    trainer: 'Trainer',
    member: 'Mitglied',
  };

  const renderNavItem = (item: NavItem) => {
    const hasChildren = !!item.children?.length;
    const isOpen = !!openMenus[item.path];
    const childActive = hasChildren && isChildActive(item);
    const isActive = !hasChildren && (location.pathname === item.path || location.pathname.startsWith(item.path + '/'));

    if (hasChildren) {
      return (
        <div key={item.path}>
          <button
            onClick={() => collapsed ? handleNav(item.path) : toggleMenu(item.path)}
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
                const siblings = item.children!.filter(s => s.path !== child.path);
                const matchedBySibling = siblings.some(s => location.pathname === s.path || location.pathname.startsWith(s.path + '/'));
                const isExactMatch = location.pathname === child.path;
                const isSubPath = location.pathname.startsWith(child.path + '/');
                // If child.path equals parent path (e.g. /members under Mitglieder), treat sub-paths as active only if no sibling matches
                const isChildItemActive = isExactMatch
                  || (isSubPath && (child.path !== item.path || !matchedBySibling));
                return (
                  <button
                    key={child.path}
                    onClick={() => handleNav(child.path)}
                    className={cn(
                      'w-full flex items-center gap-3 pl-4 pr-4 py-2 text-sm transition-colors duration-150 relative',
                      isChildItemActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <child.icon className="h-4 w-4 shrink-0" />
                    <span>{child.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.path}
        onClick={() => handleNav(item.path)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 relative',
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          collapsed && 'justify-center px-0'
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
        )}
        <item.icon className={cn('h-5 w-5 shrink-0', collapsed ? '' : 'ml-1')} />
        {!collapsed && <span>{item.title}</span>}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-popover border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border min-h-[64px]">
        {logoSrc ? (
          <img src={logoSrc} alt="" className="w-8 h-8 rounded-md object-contain shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">
              {(org?.name || user?.clubName || 'VC').slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-semibold text-sm truncate">{org?.name || user?.clubName || 'Verein Connect'}</p>
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
          <button
            onClick={logout}
            className="mt-3 w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
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
