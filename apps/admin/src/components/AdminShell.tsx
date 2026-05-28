"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { useAdminAuth } from "@/hooks/use-admin-auth.hook";

import { AdminSidebar } from "./AdminSidebar";

const PUBLIC_ADMIN_PATHS = ["/login"];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, admin, logout } = useAdminAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isPublicPage = PUBLIC_ADMIN_PATHS.includes(pathname);

  // Auth guard for protected admin pages
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicPage) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, isPublicPage, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="min-h-[120px] flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
          <p className="text-xs text-text-muted animate-pulse motion-reduce:animate-none">
            Loading admin workspace...
          </p>
        </div>
      </div>
    );
  }

  // Public pages (login) — render without shell
  if (isPublicPage) return <>{children}</>;

  // Not authenticated — return null (redirect happens in useEffect)
  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Main Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-border-subtle glass-strong z-40">
          <div className="flex items-center gap-3">
            <h1 className="text-white font-semibold text-sm capitalize">
              {pathname.split("/").slice(1).join(" / ") || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-text-muted text-sm hidden md:block">
              {admin?.name}
              <span className="ml-2 text-xs px-2 py-0.5 glass border border-accent-purple/30 text-accent-purple rounded-full capitalize">
                {admin?.role?.replace("_", " ")}
              </span>
            </span>
            <button
              id="admin-topbar-logout"
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-white glass border border-border-subtle rounded-lg transition-all motion-reduce:transition-none hover:border-error/40 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
