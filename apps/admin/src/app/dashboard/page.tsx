'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense } from 'react';

import { DashboardGlobalSearch } from '@/components/dashboard/DashboardGlobalSearch';
import { DashboardOperationalAlerts } from '@/components/dashboard/DashboardOperationalAlerts';
import { DashboardStatsGrid } from '@/components/dashboard/DashboardStatsGrid';
import { DashboardTodaysEventsFeed } from '@/components/dashboard/DashboardTodaysEventsFeed';
import { DashboardTopEventsTable } from '@/components/dashboard/DashboardTopEventsTable';
import { adminGetDashboardSummary, adminGetRevenueChart, adminGetAttendanceSummary, adminGetAttendanceRankings } from '@/lib/api/admin/analytics.service';
import { adminGetConsistencyReport, adminGetWebhooks, adminGetEmailLogs } from '@/lib/api/admin/diagnostics.service';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole } from '@mad/shared';
import { Ticket, CreditCard, Plus, BarChart2, Scan, Settings } from '@mad/ui/icons';

const RevenueChartWidget = dynamic(
  () => import('@/components/dashboard/RevenueChartWidget'),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center animate-pulse bg-white/5 rounded-xl border border-border-subtle text-text-secondary text-sm">Loading chart...</div> }
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

  const { data: summary, isLoading } = useQuery({
    queryKey: ['admin-analytics-summary'],
    queryFn: adminGetDashboardSummary,
    enabled: !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(admin.role as AdminRole),
  });

  const { data: consistencyReport } = useQuery({
    queryKey: ['admin-diagnostics-consistency'],
    queryFn: adminGetConsistencyReport,
    refetchInterval: 30000,
    enabled: !!admin?.role && [AdminRole.SUPER_ADMIN].includes(admin.role as AdminRole),
  });

  const { data: eventsData, isLoading: isEventsLoading } = useQuery({
    queryKey: ['admin-events-list', { limit: 100 }],
    queryFn: () => adminGetEvents({ limit: 100 }),
  });

  const todaysEvents = (eventsData?.items || [])
    .filter(ev => {
      if (!ev.startDate) return false;
      return new Date(ev.startDate).toDateString() === new Date().toDateString();
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const { data: failedWebhooksData, isLoading: isWebhooksLoading } = useQuery({
    queryKey: ['admin-diagnostics-webhooks-failed'],
    queryFn: () => adminGetWebhooks({ page: 1, limit: 5, status: 'failed' }),
    enabled: !!admin?.role && [AdminRole.SUPER_ADMIN].includes(admin.role as AdminRole),
  });

  const { data: emailLogsData, isLoading: isEmailsLoading } = useQuery({
    queryKey: ['admin-diagnostics-emails'],
    queryFn: () => adminGetEmailLogs({ page: 1, limit: 10 }),
    enabled: !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT].includes(admin.role as AdminRole),
  });

  const failedEmails = (emailLogsData?.data || []).filter(email => email.status === 'failed');
  const failedWebhooks = failedWebhooksData?.data || [];

  const { data: revenue } = useQuery({
    queryKey: ['admin-revenue-chart', 30],
    queryFn: () => adminGetRevenueChart(30),
    enabled: !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(admin.role as AdminRole),
  });

  const { data: attendanceSummary, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['admin-attendance-summary'],
    queryFn: adminGetAttendanceSummary,
    enabled: !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(admin.role as AdminRole),
  });

  const { data: attendanceRankings, isLoading: isRankingsLoading } = useQuery({
    queryKey: ['admin-attendance-rankings'],
    queryFn: adminGetAttendanceRankings,
    enabled: !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(admin.role as AdminRole),
  });

  const failedPaymentRecoveryCount = (consistencyReport?.counts?.orphanPayments ?? 0) + (consistencyReport?.counts?.awaitingPaymentBookings ?? 0);
  const totalDeliveryIssues = failedEmails.length + failedWebhooks.length;

  const showAnalytics = !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(admin.role as AdminRole);
  const showDiagnosticsAlerts = !!admin?.role && [AdminRole.SUPER_ADMIN].includes(admin.role as AdminRole);
  const showBookingsSearch = !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT].includes(admin.role as AdminRole);

  const allQuickLinks = [
    { label: 'Create Event', href: '/events/new', icon: <Plus className="w-6 h-6 text-text-secondary group-hover:text-accent-purple transition-colors" />, color: 'border-accent-purple/30 hover:border-accent-purple/60', roles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER] },
    { label: 'View Bookings', href: '/bookings', icon: <Ticket className="w-6 h-6 text-text-secondary group-hover:text-accent-purple transition-colors" />, color: 'border-border-subtle hover:border-white/20', roles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT] },
    { label: 'Process Refunds', href: '/refunds', icon: <CreditCard className="w-6 h-6 text-text-secondary group-hover:text-accent-purple transition-colors" />, color: 'border-border-subtle hover:border-white/20', roles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN] },
    { label: 'Analytics', href: '/dashboard', icon: <BarChart2 className="w-6 h-6 text-text-secondary group-hover:text-accent-purple transition-colors" />, color: 'border-border-subtle hover:border-white/20', roles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER] },
    { label: 'Scanner Console', href: '/scanner', icon: <Scan className="w-6 h-6 text-text-secondary group-hover:text-accent-purple transition-colors" />, color: 'border-border-subtle hover:border-white/20', roles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT, AdminRole.SCANNER] },
    { label: 'Diagnostics', href: '/diagnostics', icon: <Settings className="w-6 h-6 text-text-secondary group-hover:text-accent-purple transition-colors" />, color: 'border-border-subtle hover:border-white/20', roles: [AdminRole.SUPER_ADMIN] },
  ];

  const quickLinks = allQuickLinks.filter(link => {
    if (!admin?.role) return false;
    return link.roles.includes(admin.role as AdminRole);
  });

  if (admin?.role === AdminRole.SCANNER) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple mx-auto shadow-glow-sm">
          <Scan className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Welcome Scanner Console</h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            Ready to scan tickets and manage gate volumes. Use the link below to open the scanner console.
          </p>
        </div>
        <Link
          href="/scanner"
          className="inline-block px-6 py-3 bg-accent-purple hover:bg-accent-purple-light text-white text-sm font-semibold rounded-xl shadow-glow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Open Scanner Console
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-2xl font-black text-white">
          Good {getTimeOfDay()}, {admin?.name?.split(' ')[0] ?? 'Admin'} 👋
        </h1>
        <p className="text-text-secondary text-sm mt-1">Here&apos;s what&apos;s happening with MAD Entertrainment.</p>
      </motion.div>

      {/* Stats Cards */}
      {showAnalytics && (
        <DashboardStatsGrid summary={summary} isLoading={isLoading} />
      )}

      {/* Revenue Trend Area Chart */}
      {showAnalytics && (
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
          <h2 className="text-white font-semibold">Net Revenue — Last 30 Days</h2>
          <RevenueChartWidget revenue={revenue} />
        </div>
      )}

      {/* Global Search Bar */}
      {showBookingsSearch && <DashboardGlobalSearch />}

      {/* Operational Alerts & System Health */}
      <DashboardOperationalAlerts
        pendingRefundsCount={summary?.pendingRefundsCount}
        showDiagnosticsAlerts={showDiagnosticsAlerts}
        failedPaymentRecoveryCount={failedPaymentRecoveryCount}
        isDeliveryLoading={isWebhooksLoading || isEmailsLoading}
        totalDeliveryIssues={totalDeliveryIssues}
      />

      {/* Quick Links */}
      <div>
        <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}
              className={`glass rounded-xl border ${link.color} p-4 flex flex-col items-center gap-2 text-center hover:bg-white/5 hover:scale-[1.02] hover:shadow-glow-sm cursor-pointer transition-all duration-200 group`}>
              <span>{link.icon}</span>
              <span className="text-text-secondary text-sm font-medium">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Split Row: Happening Today & Live Attendance Overview */}
      <div className={`grid grid-cols-1 ${showAnalytics ? 'lg:grid-cols-2' : ''} gap-5`}>
        <DashboardTodaysEventsFeed
          todaysEvents={todaysEvents}
          isEventsLoading={isEventsLoading}
        />

        {/* Live Attendance Overview */}
        {showAnalytics && (
          <div className="glass rounded-2xl border border-border-subtle p-6 space-y-6 flex flex-col justify-between">
            <div>
              <h2 className="text-white font-semibold">Live Attendance Overview</h2>
              <p className="text-text-secondary text-xs mt-0.5">Real-time guest scans and check-in efficiency</p>
            </div>
            <div className="flex-1 flex items-center">
              <AttendanceMetricsWidget attendanceSummary={attendanceSummary} isLoading={isAttendanceLoading} />
            </div>
          </div>
        )}
      </div>

      {/* Attendance Rankings */}
      {showAnalytics && (
        <AttendanceRankingsWidget attendanceRankings={attendanceRankings} isLoading={isRankingsLoading} />
      )}

      {/* Top Events Table */}
      {showAnalytics && <DashboardTopEventsTable topEvents={summary?.topEvents} />}
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
