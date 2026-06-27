'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowRight } from '@mad/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useAuthModal } from '@/providers/AuthModalProvider';
import { NavLink } from './NavLink';
import { UserDropdown } from './UserDropdown';
import dynamic from 'next/dynamic';

const MobileNavigation = dynamic(
  () => import('./MobileNavigation').then((mod) => mod.MobileNavigation),
  { ssr: false }
);

export function Navbar() {
  const pathname = usePathname();
  const isCheckoutOrBook = pathname?.startsWith('/checkout/');

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasOpenedMobile, setHasOpenedMobile] = useState(false);

  const { isAuthenticated, user, logout } = useAuth();
  const { openAuthModal } = useAuthModal();

  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'Member';

  const dynamicLinks = useMemo(() => {
    return isAuthenticated
      ? [
          { label: 'Home', href: '/' },
          { label: 'Events', href: '/events' },
          { label: 'DJs', href: '/dj-operators' },
          { label: 'Help Center', href: '/support' },
          { label: 'My Tickets', href: '/dashboard?tab=tickets' },
        ]
      : [
          { label: 'Events', href: '/events' },
          { label: 'DJs', href: '/dj-operators' },
          { label: 'Help Center', href: '/support' },
          { label: 'My Tickets', href: '/tickets' },
        ];
  }, [isAuthenticated]);

  const handleLogout = useCallback(async () => {
    await logout();
    setMobileOpen(false);
  }, [logout]);

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

  const [footerIntersecting, setFooterIntersecting] = useState(false);

  // Safe MutationObserver-based IntersectionObserver hook without timeouts
  useEffect(() => {
    if (pathname !== '/') {
      setFooterIntersecting(false);
      return;
    }

    let observer: IntersectionObserver | null = null;
    const footer = document.querySelector('footer');

    const setupObserver = (target: Element) => {
      observer = new IntersectionObserver(
        ([entry]) => {
          setFooterIntersecting(entry.isIntersecting);
        },
        {
          rootMargin: '0px 0px 100px 0px',
          threshold: 0,
        }
      );
      observer.observe(target);
    };

    if (footer) {
      setupObserver(footer);
    } else {
      const mutationObserver = new MutationObserver(() => {
        const target = document.querySelector('footer');
        if (target) {
          setupObserver(target);
          mutationObserver.disconnect();
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
      return () => {
        mutationObserver.disconnect();
        if (observer) observer.disconnect();
      };
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [pathname]);

  if (isCheckoutOrBook) return null;

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b',
        scrolled
          ? 'bg-background/75 backdrop-blur-md border-white/5 py-3 shadow-lg shadow-black/20'
          : 'bg-transparent border-transparent py-5',
      ].join(' ')}
    >
      <nav className="container-mad flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="MAD Entertrainment Home"
        >
          <div className="flex items-center gap-2 transition-transform duration-200 group-hover:scale-105">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-glow-sm">
              <span className="text-white font-black text-sm">M</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              MAD{' '}
              <span className="text-gradient">Entertrainment</span>
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {dynamicLinks.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
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

      {/* Mobile Floating Sticky CTA on Homepage */}
      {pathname === '/' && (
        <div
          className={[
            'fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 md:hidden flex justify-center w-auto pointer-events-none transition-all duration-300 ease-in-out',
            (!mobileOpen && !footerIntersecting)
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95',
          ].join(' ')}
        >
          <Link
            href="/events"
            tabIndex={(!mobileOpen && !footerIntersecting) ? 0 : -1}
            aria-hidden={!(!mobileOpen && !footerIntersecting)}
            className={[
              'py-3 px-6 btn-gradient text-white rounded-full font-bold shadow-glow text-sm inline-flex items-center gap-2 active:scale-95 transition-transform border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              (!mobileOpen && !footerIntersecting)
                ? 'pointer-events-auto'
                : 'pointer-events-none',
            ].join(' ')}
          >
            Book Now
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </header>
  );
}
