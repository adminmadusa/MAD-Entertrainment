'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';

import { useAuthModal } from '@/providers/AuthModalProvider';
import { useAuth } from '@/providers/AuthProvider';
import { BrandLogo } from '@mad/ui';

import { NavLink } from './NavLink';
import { UserDropdown } from './UserDropdown';

const MobileNavigation = dynamic(
  () => import('./MobileNavigation').then((mod) => mod.MobileNavigation),
  { ssr: false }
);

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isCheckoutOrBook = pathname?.startsWith('/checkout/');
  // Darker nav contrast scoped to event detail pages only — keeps home page
  // and all other routes using the standard transparent-on-load behaviour.
  const isEventDetail = pathname?.startsWith('/events/') && pathname !== '/events';

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasOpenedMobile, setHasOpenedMobile] = useState(false);

  const { isAuthenticated, user, logout } = useAuth();
  const { openAuthModal } = useAuthModal();

  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'Member';

  const dynamicLinks = useMemo(() => {
    return isAuthenticated
      ? [
          { label: 'Events', href: '/events' },
          { label: 'My Tickets', href: '/dashboard?tab=tickets' },
        ]
      : [
          { label: 'Events', href: '/events' },
          { label: 'My Tickets', href: '/tickets' },
        ];
  }, [isAuthenticated]);

  const handleLogout = useCallback(async () => {
    await logout();
    setMobileOpen(false);
    router.push('/');
  }, [logout, router]);

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  // Reset navigating flag or set hasOpenedMobile when mobile menu is opened
  useEffect(() => {
    if (mobileOpen) {
      setHasOpenedMobile(true);
    }
  }, [mobileOpen]);

  // Optimized throttled scroll handler
  useEffect(() => {
    if (isCheckoutOrBook) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll(); // Check scroll on mount

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isCheckoutOrBook]);

  // Close mobile menu on every route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isCheckoutOrBook) return null;

  const unscrolledNavClass = isEventDetail
    ? 'bg-background/90 backdrop-blur-xl border-white/10 py-3.5 shadow-sm'
    : 'bg-background/80 backdrop-blur-md border-white/5 py-4';

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b',
        scrolled
          ? 'bg-background/95 backdrop-blur-xl border-white/10 py-3 shadow-xl shadow-black/30'
          : unscrolledNavClass,
      ].join(' ')}
    >
      <nav className="container-mad flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="MAD Entertrainment Home"
        >
          <div className="transition-transform duration-200 group-hover:scale-105">
            <BrandLogo size="sm" imageSrc="/brand/logo-64.png" />
          </div>
        </Link>

        {/* Desktop Nav & CTAs (Right-aligned) */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          <div className="flex items-center gap-1 mr-1">
            {dynamicLinks.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </div>
          <UserDropdown />
          <Link
            href="/events"
            className="px-5 py-2.5 text-sm font-semibold btn-gradient text-white rounded-xl shadow-glow-sm hover:scale-[1.03] active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Book Now
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          id="mobile-menu-trigger"
          className="md:hidden w-11 h-11 p-3 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          <div className="w-5 h-5 flex flex-col justify-center gap-1.5">
            <span
              className={`block h-0.5 w-5 bg-current origin-center transition-all duration-300 ${
                mobileOpen ? 'rotate-45 translate-y-[8px]' : ''
              }`}
            />
            <span
              className={`block h-0.5 w-5 bg-current transition-all duration-300 ${
                mobileOpen ? 'opacity-0 scale-95' : 'opacity-100'
              }`}
            />
            <span
              className={`block h-0.5 w-5 bg-current origin-center transition-all duration-300 ${
                mobileOpen ? '-rotate-45 -translate-y-[8px]' : ''
              }`}
            />
          </div>
        </button>
      </nav>

      {/* Lazy Mobile Menu Drawer */}
      {hasOpenedMobile && (
        <MobileNavigation
          isOpen={mobileOpen}
          onClose={handleCloseMobile}
          dynamicLinks={dynamicLinks}
          isAuthenticated={isAuthenticated}
          firstName={firstName}
          handleLogout={handleLogout}
          openAuthModal={openAuthModal}
        />
      )}


    </header>
  );
}
