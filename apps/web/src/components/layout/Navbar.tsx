'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { ArrowRight, useFocusTrap } from '@mad/ui';

const navLinks = [
  { label: 'Events', href: '/events' },
  { label: 'My Tickets', href: '/tickets' },
  { label: 'DJs', href: '/dj-operators' },
];

export function Navbar() {
  const pathname = usePathname();
  const isCheckoutOrBook = pathname?.endsWith('/book') || pathname?.startsWith('/checkout/');

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const mobileMenuRef = useFocusTrap<HTMLDivElement>({
    isActive: mobileOpen,
    onClose: () => setMobileOpen(false),
  });

  // Body scroll locking when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
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
        <Link href="/" className="flex items-center gap-2 group" aria-label="MAD Entertrainment Home">
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
          {navLinks.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {/* H-08 FIX: replaced Link>button nesting (invalid HTML) with styled Link */}
          <Link
            href="/tickets"
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            My Tickets
          </Link>
          <Link
            href="/events"
            className="px-5 py-2.5 text-sm font-semibold btn-gradient text-white rounded-xl shadow-glow-sm hover:scale-[1.03] active:scale-95 transition-transform"
          >
            Book Now
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-colors text-text-primary"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
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
            ref={mobileMenuRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden glass-strong border-t border-border-subtle overflow-hidden focus:outline-none"
            tabIndex={-1}
          >
            <div className="container-mad py-4 flex flex-col gap-1">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-3 px-4 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-colors font-medium"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <div className="mt-3 pt-3 border-t border-border-subtle flex flex-col gap-2">
                {/* H-08 FIX: replaced Link>button nesting with styled Link */}
                <Link
                  href="/tickets"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3 px-4 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-colors font-medium text-left block"
                >
                  My Tickets
                </Link>
                <Link
                  href="/events"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3 px-4 btn-gradient text-white rounded-xl font-semibold text-center block"
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
              'py-3 px-6 btn-gradient text-white rounded-full font-bold shadow-glow text-sm inline-flex items-center gap-2 active:scale-95 transition-transform border border-white/10',
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
    <Link href={href}>
      <motion.span
        whileHover={{ color: '#FFFFFF' }}
        className="px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors inline-block cursor-pointer"
      >
        {children}
      </motion.span>
    </Link>
  );
}
