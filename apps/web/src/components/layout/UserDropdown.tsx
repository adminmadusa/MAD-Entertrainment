'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { useAuthModal } from '@/providers/AuthModalProvider';
import { useAuth } from '@/providers/AuthProvider';

export function UserDropdown() {
  const { isAuthenticated, user, logout } = useAuth();
  const { openAuthModal } = useAuthModal();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'Member';

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    router.push('/');
  };

  // Close dropdown on click outside or escape press
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal()}
        className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
      >
        Login
      </button>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-text-secondary hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        aria-controls="user-dropdown-menu"
        aria-label="User profile menu"
      >
        <span>Hi, <span className="text-white font-bold">{firstName}</span></span>
        <span
          className="text-[10px] transition-transform duration-200 ml-0.5"
          style={{
            display: 'inline-block',
            transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
          }}
        >
          ▼
        </span>
      </button>

      {dropdownOpen && (
        <div
          id="user-dropdown-menu"
          role="menu"
          aria-label="User navigation"
          className="absolute right-0 mt-2 w-60 bg-[#111827] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-4 py-2.5 border-b border-white/10 mb-1 bg-white/[0.02]" role="presentation">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Signed in as
            </p>
            <p className="text-xs font-semibold text-white truncate mt-0.5">
              {user?.email || 'User'}
            </p>
          </div>

          <Link
            href="/dashboard?tab=tickets"
            onClick={() => setDropdownOpen(false)}
            role="menuitem"
            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-text-secondary hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
          >
            <span>🎟️</span>
            <span>My Tickets</span>
          </Link>

          {user?.isEmailVerified ? (
            <Link
              href="/dashboard?tab=account"
              onClick={() => setDropdownOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-text-secondary hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            >
              <span>⚙️</span>
              <span>Account Settings</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                openAuthModal({
                  returnTo: '/dashboard?tab=account',
                  initialEmail: user?.email,
                  readonlyEmail: true,
                  autoRequestOtp: true,
                });
              }}
              role="menuitem"
              className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
            >
              <span>⚠️</span>
              <span>Verify Account</span>
            </button>
          )}

          <div className="border-t border-white/10 my-1" role="separator" />

          <button
            type="button"
            onClick={handleLogout}
            role="menuitem"
            className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
