'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { Suspense } from 'react';

import { useAuthModal } from '@/providers/AuthModalProvider';
import { useAuth } from '@/providers/AuthProvider';
import { CalendarIcon } from '@mad/ui';
import { Home, Ticket, User } from '@mad/ui/icons';

export function shouldShowBottomNav(pathname: string | null): boolean {
  if (!pathname) return false;

  // 1. Task-focused/transactional paths where the Bottom Navigation must be hidden to prevent distraction/overlap.
  // This includes details pages (events/[slug], dj-operators/[slug]), checkout paths, and authentication.
  const isEventDetail = pathname.startsWith('/events/');
  const isDjDetail = pathname.startsWith('/dj-operators/');
  const isCheckout = pathname.startsWith('/checkout/');

  if (isEventDetail || isDjDetail || isCheckout) {
    return false;
  }

  // 2. Primary navigation routes where the Bottom Navigation is explicitly visible.
  const primaryRoutes = [
    '/',
    '/events',
    '/dj-operators',
    '/support',
    '/tickets',
  ];

  if (primaryRoutes.includes(pathname)) {
    return true;
  }

  // 3. User Dashboard sub-routes (which are treated as primary navigation areas)
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return true;
  }

  // Default fallback is to hide the navigation for any other unrecognized or task-focused pages
  return false;
}

export function BottomNavigationSpacer() {
  const pathname = usePathname();
  if (!shouldShowBottomNav(pathname)) return null;

  return <div className="h-16 md:hidden pb-[env(safe-area-inset-bottom)]" aria-hidden="true" />;
}

// ─── Main Component ───────────────────────────────────────────

function BottomNavigationContent() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const searchParams = useSearchParams();

  if (!shouldShowBottomNav(pathname)) return null;

  const isHomeActive = pathname === '/';
  const isEventsActive = pathname?.startsWith('/events');

  // Determine active tab for My Tickets and Profile/Login
  const tab = searchParams ? searchParams.get('tab') : null;
  const refParam = searchParams ? searchParams.get('ref') : null;

  const isTicketsActive = isAuthenticated
    ? pathname === '/dashboard' && (tab === 'tickets' || !tab || !!refParam)
    : pathname === '/tickets';

  const isProfileActive = isAuthenticated && pathname === '/dashboard' && tab === 'account';

  let profileNavItem = (
    <button
      type="button"
      onClick={() => openAuthModal()}
      className="flex flex-col items-center justify-center flex-1 h-full text-text-secondary hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-inset"
      aria-label="Open Login Modal"
    >
      <User size={20} className="mb-1" />
      <span className="text-[10px] font-medium tracking-tight">Login</span>
    </button>
  );

  if (isAuthenticated) {
    profileNavItem = (
      <Link
        href="/dashboard?tab=account"
        className={`flex flex-col items-center justify-center flex-1 h-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-inset ${
          isProfileActive ? 'text-accent-purple' : 'text-text-secondary hover:text-white'
        }`}
        aria-label="Navigate to Profile"
      >
        <User size={20} className="mb-1" />
        <span className="text-[10px] font-medium tracking-tight">Profile</span>
      </Link>
    );
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)] md:hidden block transition-transform duration-300"
      aria-label="Mobile navigation bar"
    >
      <div className="h-16 flex items-center justify-around">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-inset ${
            isHomeActive ? 'text-accent-purple' : 'text-text-secondary hover:text-white'
          }`}
          aria-label="Navigate to Home"
        >
          <Home size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-tight">Home</span>
        </Link>

        {/* Browse Events / Book Now */}
        <Link
          href="/events"
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-inset ${
            isEventsActive ? 'text-accent-purple' : 'text-text-secondary hover:text-white'
          }`}
          aria-label={isHomeActive ? 'Navigate to Book Now' : 'Navigate to Browse Events'}
        >
          <div className="w-5 h-5 mb-1 flex items-center justify-center">
            <CalendarIcon className="w-full h-full" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">
            {isHomeActive ? 'Book Now' : 'Browse Events'}
          </span>
        </Link>

        {/* My Tickets */}
        {isAuthenticated ? (
          <Link
            href="/dashboard?tab=tickets"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-inset ${
              isTicketsActive ? 'text-accent-purple' : 'text-text-secondary hover:text-white'
            }`}
            aria-label="Navigate to My Tickets"
          >
            <Ticket size={20} className="mb-1" />
            <span className="text-[10px] font-medium tracking-tight">My Tickets</span>
          </Link>
        ) : (
          <Link
            href="/tickets"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-inset ${
              isTicketsActive ? 'text-accent-purple' : 'text-text-secondary hover:text-white'
            }`}
            aria-label="Navigate to My Tickets"
          >
            <Ticket size={20} className="mb-1" />
            <span className="text-[10px] font-medium tracking-tight">My Tickets</span>
          </Link>
        )}

        {/* Login / Profile */}
        {profileNavItem}
      </div>
    </nav>
  );
}

export function BottomNavigation() {
  return (
    <Suspense fallback={null}>
      <BottomNavigationContent />
    </Suspense>
  );
}
