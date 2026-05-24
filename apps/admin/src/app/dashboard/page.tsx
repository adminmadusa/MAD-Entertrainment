'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';

import { useAdminAuth } from '@/hooks/use-admin-auth.hook';
import { adminGetDashboardSummary } from '@/lib/api/admin/analytics.service';

export default function AdminDashboardPage() {
  const { admin } = useAdminAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['admin-analytics-summary'],
    queryFn: adminGetDashboardSummary,
  });

  const stats = [
    { label: 'Total Bookings', value: summary?.totalBookings, icon: '🎟️', href: '/bookings' },
    { label: 'Last 30 Days', value: summary?.recentBookings, icon: '📅', href: '/bookings' },
    {
      label: 'Total Revenue',
      value: summary ? `₹${summary.totalRevenue.toLocaleString('en-IN')}` : undefined,
      icon: '💰',
      href: '/analytics',
    },
  ];

  const quickLinks = [
    { label: 'Create Event', href: '/events/new', icon: '🎪', color: 'border-accent-purple/30 hover:border-accent-purple/60' },
    { label: 'View Bookings', href: '/bookings', icon: '🎟️', color: 'border-border-subtle hover:border-white/20' },
    { label: 'Process Refunds', href: '/refunds', icon: '💸', color: 'border-border-subtle hover:border-white/20' },
    { label: 'Analytics', href: '/analytics', icon: '📊', color: 'border-border-subtle hover:border-white/20' },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-2xl font-black text-white">
          Good {getTimeOfDay()}, {admin?.name?.split(' ')[0] ?? 'Admin'} 👋
        </h1>
        <p className="text-text-muted text-sm mt-1">Here&apos;s what&apos;s happening with MAD Entertrainment.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Link href={stat.href} className="block glass rounded-2xl border border-border-subtle p-6 hover:border-accent-purple/30 transition-colors group">
              <div className="text-3xl mb-3">{stat.icon}</div>
              <p className="text-text-muted text-sm">{stat.label}</p>
              <p className={`text-2xl font-black mt-1 group-hover:text-gradient transition-all ${isLoading ? 'text-text-muted animate-pulse' : 'text-white'}`}>
                {isLoading ? '...' : (stat.value?.toLocaleString?.() ?? stat.value ?? '0')}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}
              className={`glass rounded-xl border ${link.color} p-4 flex flex-col items-center gap-2 text-center transition-all hover:bg-white/3`}>
              <span className="text-2xl">{link.icon}</span>
              <span className="text-text-secondary text-sm font-medium">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Top Events */}
      {summary?.topEvents && summary.topEvents.length > 0 && (
        <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
          <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-white font-semibold">Top Events</h2>
            <Link href="/analytics" className="text-accent-purple text-sm hover:underline">View all →</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-text-muted font-medium py-3 px-6">Event</th>
                <th className="text-right text-text-muted font-medium py-3 px-6">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {summary.topEvents.slice(0, 5).map((ev) => (
                <tr key={ev._id} className="border-b border-border-subtle/40 hover:bg-white/2">
                  <td className="py-3 px-6 text-text-primary">{ev.event?.title ?? 'Deleted Event'}</td>
                  <td className="py-3 px-6 text-right text-white font-semibold">₹{ev.revenue.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
