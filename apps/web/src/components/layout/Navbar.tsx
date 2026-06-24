'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { ArrowRight, useFocusTrap } from '@mad/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useAuthModal } from '@/providers/AuthModalProvider';

export function Navbar() {
  const pathname = usePathname();
  const isCheckoutOrBook = pathname?.startsWith('/checkout/');

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { isAuthenticated, user, logout } = useAuth();
  const { openAuthModal } = useAuthModal();

  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'Member';

  const dynamicLinks = isAuthenticated
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

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    setDropdownOpen(false);
  };

  const navigatingRef = useRef(false);

  // Reset navigating flag when mobile menu is opened
  useEffect(() => {
    if (mobileOpen) {
      navigatingRef.current = false;
    }
  }, [mobileOpen]);

  const mobileMenuRef = useFocusTrap<HTMLDivElement>({
    isActive: mobileOpen,
    onClose: () => setMobileOpen(false),
    shouldRestoreFocus: !navigatingRef.current,
  });

  // Body scroll locking when mobile menu is open (Safari-friendly & layout-shift free)
  useEffect(() => {
    if (!mobileOpen) return;

    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    const originalStyle = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.position = originalStyle.position;
      document.body.style.top = originalStyle.top;
      document.body.style.width = originalStyle.width;
      document.body.style.overflow = originalStyle.overflow;
      document.body.style.paddingRight = originalStyle.paddingRight;

      if (!navigatingRef.current) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (isCheckoutOrBook) return;

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll(); // Check scroll on mount

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isCheckoutOrBook]);

  // H-07 FIX: Close mobile menu on every route change.
  // Previously used [], which only ran once on mount — navigating away left
  // the menu open on the new page.
  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  const [footerIntersecting, setFooterIntersecting] = useState(false);

  useEffect(() => {
    if (pathname !== '/') {
      setFooterIntersecting(false);
      return;
    }

    const handleObserver = () => {
      const footer = document.querySelector('footer');
      if (!footer) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          setFooterIntersecting(entry.isIntersecting);
        },
        {
          rootMargin: '0px 0px 100px 0px',
          threshold: 0,
        }
      );

      observer.observe(footer);
      return observer;
    };

    let observerInstance: IntersectionObserver | undefined;
    const timer = setTimeout(() => {
      const obs = handleObserver();
      if (obs) observerInstance = obs;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (observerInstance) {
        observerInstance.disconnect();
      }
    };
  }, [pathname]);

  if (isCheckoutOrBook) return null;  return (
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
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-glow-sm">
              <span className="text-white font-black text-sm">M</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              MAD{' '}
              <span className="text-gradient">Entertrainment</span>
            </span>
          </motion.div>
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
          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-text-secondary hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                Hi, <span className="text-white font-bold">{firstName}</span>
                <span className="text-[10px] transition-transform duration-200" style={{ display: 'inline-block', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
              </button>
              {dropdownOpen && (
                <>
                  {/* Backdrop overlay to close the dropdown on click outside */}
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-background-secondary border border-border-subtle rounded-xl shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-border-subtle/50 mb-1">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
                    </div>
                    <Link
                      href="/dashboard?tab=tickets"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                    >
                      My Tickets
                    </Link>
                    <Link
                      href="/dashboard?tab=account"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                    >
                      Account
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left block px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-450"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
            >
              Login
            </button>
          )}
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
          className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-colors text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          <motion.div
            animate={mobileOpen ? 'open' : 'closed'}
            className="w-5 h-5 flex flex-col justify-center gap-1.5"
          >
            <motion.span
              variants={{
                closed: { rotate: 0, y: 0 },
                open: { rotate: 45, y: 7 },
              }}
              className="block h-0.5 w-5 bg-current origin-center transition-all"
            />
            <motion.span
              variants={{
                closed: { opacity: 1 },
                open: { opacity: 0 },
              }}
              className="block h-0.5 w-5 bg-current"
            />
            <motion.span
              variants={{
                closed: { rotate: 0, y: 0 },
                open: { rotate: -45, y: -7 },
              }}
              className="block h-0.5 w-5 bg-current origin-center transition-all"
            />
          </motion.div>
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-[-1] bg-black/40 backdrop-blur-sm md:hidden"
            aria-hidden="true"
          />
        )}
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            ref={mobileMenuRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            className="md:hidden glass-strong border-t border-border-subtle max-h-[calc(100svh-4.5rem)] overflow-y-auto focus:outline-none"
            tabIndex={-1}
          >
            <div className="container-mad py-4 flex flex-col gap-1">
              {dynamicLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => {
                      navigatingRef.current = true;
                      setMobileOpen(false);
                    }}
                    className="block py-3 px-4 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <div className="mt-3 pt-3 border-t border-border-subtle flex flex-col gap-2">
                {isAuthenticated ? (
                  <>
                    <div className="px-4 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                      Hi, {firstName}
                    </div>
                    <Link
                      href="/dashboard?tab=tickets"
                      onClick={() => {
                        navigatingRef.current = true;
                        setMobileOpen(false);
                      }}
                      className="block py-3 px-4 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                    >
                      My Tickets
                    </Link>
                    <Link
                      href="/dashboard?tab=account"
                      onClick={() => {
                        navigatingRef.current = true;
                        setMobileOpen(false);
                      }}
                      className="block py-3 px-4 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                    >
                      Account
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full py-3 px-4 text-red-400 hover:text-red-350 hover:bg-white/5 rounded-xl transition-colors font-medium text-left block focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      openAuthModal();
                    }}
                    className="w-full py-3 px-4 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-colors font-medium text-left block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                  >
                    Login
                  </button>
                )}
                <Link
                  href="/events"
                  onClick={() => {
                    navigatingRef.current = true;
                    setMobileOpen(false);
                  }}
                  className="w-full py-3 px-4 btn-gradient text-white rounded-xl font-semibold text-center block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Book Now
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <motion.span
        whileHover={{ color: '#FFFFFF' }}
        className="px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors inline-block cursor-pointer"
      >
        {children}
      </motion.span>
    </Link>
  );
}
