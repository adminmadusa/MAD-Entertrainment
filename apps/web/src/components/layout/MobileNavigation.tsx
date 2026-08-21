'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRef, useEffect, memo } from 'react';

import { Drawer } from '@mad/ui';

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

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="top"
      showHeader={false}
      showBackdrop={true}
      closeOnBackdropClick={true}
      backdropClassName="top-[4.5rem] md:hidden z-30"
      className="top-[4.5rem] border-t border-border-subtle max-h-[calc(100svh-4.5rem)] rounded-none w-full md:hidden z-40"
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
    </Drawer>
  );
});

MobileNavigation.displayName = 'MobileNavigation';
