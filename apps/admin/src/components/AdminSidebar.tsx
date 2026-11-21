'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BrandLogo, Button } from '@mad/ui';
import { canAccessRoute } from '@/lib/rbac/navigation-permissions';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import {
  GridIcon,
  ChartIcon,
  CalendarIcon,
  HeadphonesIcon,
  TicketIcon,
  RefundIcon,
  TagIcon,
  ScanIcon,
  BellIcon,
  MailIcon,
  UsersIcon,
  ChevronLeftIcon,
  LayersIcon,
} from './AdminSidebarIcons';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <GridIcon /> },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Users', href: '/users', icon: <UsersIcon /> },
      { label: 'Bookings', href: '/bookings', icon: <TicketIcon /> },
      { label: 'Ticket Management', href: '/ticket-management', icon: <LayersIcon /> },
      { label: 'Events', href: '/events', icon: <CalendarIcon /> },
      { label: 'Refunds', href: '/refunds', icon: <RefundIcon /> },
      { label: 'Scanner', href: '/scanner', icon: <ScanIcon /> },
      { label: 'Coupons', href: '/coupons', icon: <TagIcon /> },
      { label: 'DJ Operators', href: '/dj-operators', icon: <HeadphonesIcon /> },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { label: 'Popups', href: '/popups', icon: <BellIcon /> },
      { label: 'Notifications', href: '/notifications', icon: <MailIcon /> },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Admin Users', href: '/team', icon: <UsersIcon /> },
      { label: 'Diagnostics', href: '/diagnostics', icon: <ChartIcon /> },
    ],
  },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AdminSidebar({ collapsed, onToggle, mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { admin } = useAdminAuth();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={[
        'flex flex-col h-full bg-background-card border-r border-border-subtle overflow-hidden flex-shrink-0',
        'fixed md:static inset-y-0 left-0 z-50 md:z-auto transition-transform duration-300 md:transition-none',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border-subtle flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <BrandLogo
            variant={collapsed ? 'emblem' : 'with-text'}
            text="MAD"
            subtext="Admin"
            size="sm"
            imageSrc="/brand/logo-64.png"
          />
        </Link>

        {/* Close Toggle for Mobile (Touch target at least 44x44px) */}
        {mobileOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileClose}
            className="md:hidden w-11 h-11 p-0 flex items-center justify-center rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-all -mr-2"
            aria-label="Close navigation menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6 scrollbar-hide" aria-label="Admin primary navigation">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !admin?.role || canAccessRoute(item.href, admin.role)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-text-secondary text-[10px] font-semibold uppercase tracking-widest px-2 mb-2"
                  >
                    {group.title}
                  </motion.p>
                )}
              </AnimatePresence>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isActive(item.href);
                  if (item.disabled) {
                    return (
                      <li key={item.href}>
                        <div
                          title={collapsed ? `${item.label} (Coming Soon)` : undefined}
                          className="flex items-center gap-3 px-2 py-2.5 rounded-xl opacity-40 cursor-not-allowed select-none text-text-secondary group relative"
                        >
                          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            {item.icon}
                          </span>
                          <AnimatePresence>
                            {!collapsed && (
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-sm font-medium whitespace-nowrap overflow-hidden flex items-center gap-2"
                              >
                                {item.label}
                                <span className="text-[9px] font-bold tracking-wider uppercase px-1 py-0.5 rounded bg-white/10 text-text-secondary">
                                  Soon
                                </span>
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={[
                          'flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all duration-150 group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-inset',
                          active
                            ? 'bg-accent-purple/15 text-accent-purple-light'
                            : 'text-text-secondary hover:text-text-primary hover:bg-white/5',
                        ].join(' ')}
                      >
                        {/* Active indicator */}
                        {active && (
                          <motion.div
                            layoutId="activeNav"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent-purple rounded-r"
                          />
                        )}
                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                          {item.icon}
                        </span>
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-sm font-medium whitespace-nowrap overflow-hidden"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="hidden md:block p-2 border-t border-border-subtle">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronLeftIcon />
          </motion.div>
        </Button>
      </div>
    </motion.aside>
  );
}
