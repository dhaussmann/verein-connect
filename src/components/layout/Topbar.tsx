import { Bell, Menu, Search, ChevronRight, User, LogOut, Building2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const breadcrumbMap: Record<string, string> = {
  dashboard: 'Dashboard',
  members: 'Mitglieder',
  courses: 'Kurse',
  events: 'Termine',
  attendance: 'Anwesenheit',
  communication: 'Kommunikation',
  finance: 'Finanzen',
  shop: 'Webshop',
  files: 'Materialbank',
  settings: 'Einstellungen',
  new: 'Neu',
  chat: 'Chat',
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
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
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
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMobileMenuOpen}>
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className={i === crumbs.length - 1 ? 'text-foreground font-medium' : ''}>{crumb}</span>
            </span>
          ))}
        </nav>

        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted rounded-md hover:bg-border transition-colors"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Suche...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-popover px-1.5 py-0.5 text-xs">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
            3
          </Badge>
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <User className="h-4 w-4 mr-2" /> Profil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Building2 className="h-4 w-4 mr-2" /> Vereinswechsel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" /> Abmelden
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Search dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg p-0">
          <div className="p-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Mitglieder, Kurse, Termine durchsuchen..."
                className="border-0 focus-visible:ring-0 text-base"
                autoFocus
              />
            </div>
            <div className="py-4 text-sm text-muted-foreground text-center">
              Tippe um zu suchen...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
