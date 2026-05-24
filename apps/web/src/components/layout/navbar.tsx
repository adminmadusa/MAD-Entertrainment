'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

const navLinks = [
  { label: 'Events', href: '/events' },
  { label: 'Artists', href: '/artists' },
  { label: 'DJs', href: '/dj-operators' },
  { label: 'Venues', href: '/venues' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastScrollY = useRef(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 20);
      // Hide navbar on scroll down, show on scroll up
      setVisible(currentY < lastScrollY.current || currentY < 100);
      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, []);

  return (
    <motion.header
      animate={{ y: visible ? 0 : -100 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b',
        scrolled
          ? 'bg-background/80 backdrop-blur-lg border-border-subtle py-3'
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
          <Link href="/my-booking">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              My Booking
            </motion.button>
          </Link>
          <Link href="/events">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-2.5 text-sm font-semibold btn-gradient text-white rounded-xl shadow-glow-sm"
            >
              Book Now
            </motion.button>
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden glass-strong border-t border-border-subtle overflow-hidden"
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
                <Link href="/my-booking" onClick={() => setMobileOpen(false)}>
                  <button className="w-full py-3 px-4 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-colors font-medium text-left">
                    My Booking
                  </button>
                </Link>
                <Link href="/events" onClick={() => setMobileOpen(false)}>
                  <button className="w-full py-3 px-4 btn-gradient text-white rounded-xl font-semibold text-center">
                    Book Now
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
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
