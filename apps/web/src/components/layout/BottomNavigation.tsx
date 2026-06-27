'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

// ─── Visibility Helper ────────────────────────────────────────

export function shouldShowBottomNav(pathname: string | null): boolean {
  if (!pathname) return false;
  // Hidden on checkout or booking flow
  if (pathname.startsWith('/checkout/')) return false;

  const visiblePrefixes = ['/events', '/dj-operators', '/support', '/tickets', '/dashboard'];
  const isExactHome = pathname === '/';
  const matchesPrefix = visiblePrefixes.some((prefix) => pathname.startsWith(prefix));

  return isExactHome || matchesPrefix;
}

export function BottomNavigationSpacer() {
  const pathname = usePathname();
  if (!shouldShowBottomNav(pathname)) return null;

  return <div className="h-16 md:hidden pb-[env(safe-area-inset-bottom)]" aria-hidden="true" />;
}

// ─── Main Component ───────────────────────────────────────────

export function BottomNavigation() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();

  if (!shouldShowBottomNav(pathname)) return null;

  const isHomeActive = pathname === '/';
  const isEventsActive = pathname?.startsWith('/events');
  const isProfileActive = pathname?.startsWith('/dashboard');

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

        {/* Browse Events */}
        <Link
          href="/events"
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-inset ${
            isEventsActive ? 'text-accent-purple' : 'text-text-secondary hover:text-white'
          }`}
          aria-label="Navigate to Browse Events"
        >
          <div className="w-5 h-5 mb-1 flex items-center justify-center">
            <CalendarIcon className="w-full h-full" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Browse Events</span>
        </Link>

        {/* Book Now (CTA - Intentionally never highlighted as active) */}
        <Link
          href="/events"
          className="flex flex-col items-center justify-center flex-1 h-full text-text-secondary hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-inset"
          aria-label="Book Now"
        >
          <TicketIcon size={20} className="mb-1 text-accent-pink" />
          <span className="text-[10px] font-semibold tracking-tight text-accent-pink">Book Now</span>
        </Link>

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
