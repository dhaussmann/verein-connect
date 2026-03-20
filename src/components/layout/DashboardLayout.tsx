import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AppSidebar } from './AppSidebar';
import { Topbar } from './Topbar';

export function DashboardLayout() {
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!authChecked) {
      checkAuth().finally(() => setAuthChecked(true));
    }
  }, [authChecked, checkAuth]);

  if (!authChecked || (isLoading && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Laden...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 p-6">
          <div className="max-w-[1280px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
