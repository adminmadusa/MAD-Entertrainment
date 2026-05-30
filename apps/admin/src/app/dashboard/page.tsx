'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import { useAdminAuth } from '@/hooks/use-admin-auth.hook';
import {
  adminGetDashboardSummary,
  adminGetRevenueChart,
  adminGetAttendanceSummary,
  adminGetAttendanceRankings,
} from '@/lib/api/admin/analytics.service';

const RevenueChartWidget = dynamic(
  () => import('@/components/dashboard/RevenueChartWidget'),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center animate-pulse bg-white/5 rounded-xl border border-border-subtle text-text-muted text-sm">Loading chart...</div> }
);

const AttendanceMetricsWidget = dynamic(
  () => import('@/components/dashboard/AttendanceMetricsWidget'),
  { loading: () => <div className="h-24 animate-pulse bg-white/5 rounded-xl border border-border-subtle"></div> }
);

const AttendanceRankingsWidget = dynamic(
  () => import('@/components/dashboard/AttendanceRankingsWidget'),
  { loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-xl border border-border-subtle"></div> }
);

function DashboardContent() {
  const { admin } = useAdminAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab') || 'overview';

  const { data: summary, isLoading } = useQuery({
    queryKey: ['admin-analytics-summary'],
    queryFn: adminGetDashboardSummary,
  });

  const { data: revenue } = useQuery({
    queryKey: ['admin-revenue-chart', 30],
    queryFn: () => adminGetRevenueChart(30),
    enabled: tab === 'analytics',
  });

  const { data: attendanceSummary, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['admin-attendance-summary'],
    queryFn: adminGetAttendanceSummary,
    enabled: tab === 'analytics',
  });

  const { data: attendanceRankings, isLoading: isRankingsLoading } = useQuery({
    queryKey: ['admin-attendance-rankings'],
    queryFn: adminGetAttendanceRankings,
    enabled: tab === 'analytics',
  });

  const stats = [
    { label: 'Total Bookings', value: summary?.totalBookings, icon: '🎟️', href: '/bookings' },
    { label: 'Last 30 Days', value: summary?.recentBookings, icon: '📅', href: '/bookings' },
    {
      label: 'Total Revenue',
      value: summary ? `₹${summary.totalRevenue.toLocaleString('en-IN')}` : undefined,
      icon: '💰',
      href: '/dashboard?tab=analytics',
    },
  ];

  const quickLinks = [
    { label: 'Create Event', href: '/events/new', icon: '🎪', color: 'border-accent-purple/30 hover:border-accent-purple/60' },
    { label: 'View Bookings', href: '/bookings', icon: '🎟️', color: 'border-border-subtle hover:border-white/20' },
    { label: 'Process Refunds', href: '/refunds', icon: '💸', color: 'border-border-subtle hover:border-white/20' },
    { label: 'Analytics', href: '/dashboard?tab=analytics', icon: '📊', color: 'border-border-subtle hover:border-white/20' },
  ];



  const handleTabChange = (tabName: string) => {
    router.push(`/dashboard?tab=${tabName}`);
  };



  return (
    <div className="space-y-8">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-2xl font-black text-white">
          Good {getTimeOfDay()}, {admin?.name?.split(' ')[0] ?? 'Admin'} 👋
        </h1>
        <p className="text-text-muted text-sm mt-1">Here&apos;s what&apos;s happening with MAD Entertrainment.</p>
      </motion.div>

      {/* Tabs Controller */}
      <div className="flex border-b border-border-subtle gap-6">
        <button
          onClick={() => handleTabChange('overview')}
          className={`pb-3 text-sm font-semibold relative transition-colors ${
            tab === 'overview' ? 'text-accent-purple' : 'text-text-muted hover:text-white'
          }`}
        >
          Overview
          {tab === 'overview' && (
            <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-purple" />
          )}
        </button>
        <button
          onClick={() => handleTabChange('analytics')}
          className={`pb-3 text-sm font-semibold relative transition-colors ${
            tab === 'analytics' ? 'text-accent-purple' : 'text-text-muted hover:text-white'
          }`}
        >
          Analytics
          {tab === 'analytics' && (
            <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-purple" />
          )}
        </button>
      </div>

      {/* Stats Cards */}
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

      {/* Tab Content A: Overview */}
      {tab === 'overview' && (
        <div className="space-y-8">
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
                <button onClick={() => handleTabChange('analytics')} className="text-accent-purple text-sm hover:underline">View all →</button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left text-text-muted font-medium py-3 px-6">Event</th>
                    <th className="text-right text-text-muted font-medium py-3 px-6">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(summary?.topEvents) && summary.topEvents.length > 0 ? (
                    summary.topEvents.slice(0, 5).map((ev) => (
                      <tr key={ev._id} className="border-b border-border-subtle/40 hover:bg-white/2">
                        <td className="py-3.5 px-6 text-text-primary">{ev.event?.title ?? 'Deleted Event'}</td>
                        <td className="py-3.5 px-4 text-text-secondary">₹{ev.revenue.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content B: Analytics */}
      {tab === 'analytics' && (
        <div className="space-y-8">
          {/* Revenue Chart */}
          <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
            <h2 className="text-white font-semibold">Revenue — Last 30 Days</h2>
            <RevenueChartWidget revenue={revenue} />
          </div>

          {/* Attendance Metric Cards */}
          <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
            <h2 className="text-white font-semibold">Attendance Overview</h2>
            <AttendanceMetricsWidget attendanceSummary={attendanceSummary} isLoading={isAttendanceLoading} />
          </div>

          <AttendanceRankingsWidget attendanceRankings={attendanceRankings} isLoading={isRankingsLoading} />

          {/* Top Events Table */}
          {Array.isArray(summary?.topEvents) && summary.topEvents.length > 0 && (
            <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
              <div className="px-6 py-4 border-b border-border-subtle">
                <h2 className="text-white font-semibold">Top Events by Revenue</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="text-left text-text-muted font-medium py-3 px-6">Event</th>
                      <th className="text-left text-text-muted font-medium py-3 px-4">Bookings</th>
                      <th className="text-right text-text-muted font-medium py-3 px-6">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topEvents.map((ev) => (
                      <tr key={ev._id} className="border-b border-border-subtle/40 hover:bg-white/2">
                        <td className="py-3.5 px-6 text-text-primary">{ev.event?.title ?? 'Deleted Event'}</td>
                        <td className="py-3.5 px-4 text-text-secondary">{ev.count}</td>
                        <td className="py-3.5 px-6 text-right text-white font-semibold">₹{ev.revenue.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
