'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { canAccessRoute, DEFAULT_ROUTE_BY_ROLE } from '@/lib/rbac/navigation-permissions';

import { AdminSidebar } from './AdminSidebar';


const PUBLIC_ADMIN_PATHS = ['/login'];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, admin, logout } = useAdminAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isPublicPage = PUBLIC_ADMIN_PATHS.includes(pathname);

  // Auth guard for protected admin pages
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      if (!isPublicPage) {
        router.replace('/login');
      }
    } else {
      // Authenticated — enforce RBAC route authorization
      if (admin?.role && !isPublicPage && !canAccessRoute(pathname, admin.role)) {
        const redirectHome = DEFAULT_ROUTE_BY_ROLE[admin.role] || '/dashboard';
        router.replace(redirectHome);
      }
    }
  }, [isAuthenticated, isLoading, isPublicPage, pathname, admin, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Public pages (login) — render without shell
  if (isPublicPage) return <>{children}</>;

  // Not authenticated — return null (redirect happens in useEffect)
  if (!isAuthenticated) return null;

  // Authenticated, but not authorized for this specific route — redirect is enqueued
  if (admin?.role && !isPublicPage && !canAccessRoute(pathname, admin.role)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-border-subtle glass-strong z-40">
          <div className="flex items-center gap-3">
            {/* Hamburger Toggle for Mobile (Touch target at least 44x44px) */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-all -ml-2"
              aria-label="Open navigation menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
            <h1 className="text-white font-semibold text-sm capitalize">
              {pathname.split('/').slice(1).join(' / ') || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-text-muted text-sm hidden md:block">
              {admin?.name}
              <span className="ml-2 text-xs px-2 py-0.5 glass border border-accent-purple/30 text-accent-purple rounded-full capitalize">
                {admin?.role?.replace('_', ' ')}
              </span>
            </span>
            <button
              id="admin-topbar-logout"
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-white glass border border-border-subtle rounded-lg transition-all hover:border-error/40 hover:text-red-400"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
