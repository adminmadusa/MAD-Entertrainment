'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useRef, useEffect, memo } from 'react';

import { useFocusTrap } from '@mad/ui';

interface LinkItem {
  label: string;
  href: string;
}

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  dynamicLinks: LinkItem[];
  isAuthenticated: boolean;
  firstName: string;
  handleLogout: () => void;
  openAuthModal: () => void;
}

export const MobileNavigation = memo(function MobileNavigation({
  isOpen,
  onClose,
  dynamicLinks,
  isAuthenticated,
  firstName,
  handleLogout,
  openAuthModal,
}: MobileNavigationProps) {
  const navigatingRef = useRef(false);

  // Reset navigating flag when opening
  useEffect(() => {
    if (isOpen) {
      navigatingRef.current = false;
    }
  }, [isOpen]);

  const mobileMenuRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onClose,
    shouldRestoreFocus: !navigatingRef.current,
  });

  // Body scroll locking when mobile menu is open (Safari-friendly & layout-shift free)
  useEffect(() => {
    if (!isOpen) return;

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

      if (!navigatingRef.current && typeof window !== 'undefined') {
        window.scrollTo(0, scrollY);
      }
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          <motion.div
            key="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            aria-hidden="true"
          />

          {/* Mobile Drawer */}
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
            className="fixed top-[4.5rem] left-0 right-0 z-40 md:hidden glass-strong border-t border-border-subtle max-h-[calc(100svh-4.5rem)] overflow-y-auto focus:outline-none"
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
                      onClose();
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
                        onClose();
                      }}
                      className="block py-3 px-4 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                    >
                      My Tickets
                    </Link>
                    <Link
                      href="/dashboard?tab=account"
                      onClick={() => {
                        navigatingRef.current = true;
                        onClose();
                      }}
                      className="block py-3 px-4 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                    >
                      Account
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        navigatingRef.current = true;
                        handleLogout();
                      }}
                      className="w-full py-3 px-4 text-red-400 hover:text-red-355 hover:bg-white/5 rounded-xl transition-colors font-medium text-left block focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
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
                    onClose();
                  }}
                  className="w-full py-3 px-4 btn-gradient text-white rounded-xl font-semibold text-center block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Book Now
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

MobileNavigation.displayName = 'MobileNavigation';
