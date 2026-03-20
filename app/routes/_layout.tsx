import { useState } from "react";
import { Outlet } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireAuth } from "@/lib/auth.server";
import { getEnv } from "@/lib/session.server";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context as Parameters<typeof getEnv>[0]);
  const { user, refreshedCookieHeader } = await requireAuth(request, env);

  const headers: Record<string, string> = {};
  if (refreshedCookieHeader) headers["Set-Cookie"] = refreshedCookieHeader;

  return Response.json({ user }, { headers });
}

export default function ProtectedLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
