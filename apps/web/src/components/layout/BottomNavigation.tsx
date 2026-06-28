'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useAuthModal } from '@/providers/AuthModalProvider';
import { CalendarIcon } from '@mad/ui';

// ─── Custom Icons inline to preserve UI package stability ──────

function HomeIcon({ className = '', size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function TicketIcon({ className = '', size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  );
}

function UserIcon({ className = '', size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function shouldShowBottomNav(pathname: string | null): boolean {
  if (!pathname) return false;

  // 1. Task-focused/transactional paths where the Bottom Navigation must be hidden to prevent distraction/overlap.
  // This includes details pages (events/[slug], dj-operators/[slug]), checkout paths, and authentication.
  const isEventDetail = pathname.startsWith('/events/');
  const isDjDetail = pathname.startsWith('/dj-operators/');
  const isCheckout = pathname.startsWith('/checkout/');
  const isLogin = pathname === '/login';

  if (isEventDetail || isDjDetail || isCheckout || isLogin) {
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

  const isProfileActive = isAuthenticated
    ? pathname === '/dashboard' && tab === 'account'
    : false;

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
          <HomeIcon size={20} className="mb-1" />
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
            <TicketIcon size={20} className="mb-1" />
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
            <TicketIcon size={20} className="mb-1" />
            <span className="text-[10px] font-medium tracking-tight">My Tickets</span>
          </Link>
        )}

        {/* Login / Profile */}
        {isAuthenticated ? (
          <Link
            href="/dashboard?tab=account"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-inset ${
              isProfileActive ? 'text-accent-purple' : 'text-text-secondary hover:text-white'
            }`}
            aria-label="Navigate to Profile"
          >
            <UserIcon size={20} className="mb-1" />
            <span className="text-[10px] font-medium tracking-tight">Profile</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => openAuthModal()}
            className="flex flex-col items-center justify-center flex-1 h-full text-text-secondary hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-inset"
            aria-label="Open Login Modal"
          >
            <UserIcon size={20} className="mb-1" />
            <span className="text-[10px] font-medium tracking-tight">Login</span>
          </button>
        )}
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
