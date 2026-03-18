import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, GraduationCap, Calendar,
  ClipboardCheck, MessageSquare, Receipt, ShoppingBag,
  FolderArchive, Settings, ChevronLeft, ChevronRight, LogOut,
  User, BookOpen,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

const adminNavItems = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Mitglieder', path: '/members', icon: Users },
  { title: 'Kurse', path: '/courses', icon: GraduationCap },
  { title: 'Termine', path: '/events', icon: Calendar },
  { title: 'Anwesenheit', path: '/attendance', icon: ClipboardCheck },
  { title: 'Kommunikation', path: '/communication', icon: MessageSquare },
  { title: 'Finanzen', path: '/finance', icon: Receipt },
  { title: 'Webshop', path: '/shop', icon: ShoppingBag },
  { title: 'Materialbank', path: '/files', icon: FolderArchive },
  { title: 'Einstellungen', path: '/settings', icon: Settings },
];

const memberNavItems = [
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
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleNav = (path: string) => {
    navigate(path);
    onMobileClose();
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    trainer: 'Trainer',
    member: 'Mitglied',
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
        {(user?.role === 'admin' || user?.role === 'trainer' ? adminNavItems : memberNavItems).map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
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
        })}
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
