'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';

import { useAdminAuth } from '@/hooks/use-admin-auth.hook';
import { AdminRole } from '@mad/shared';
import {
  adminGetDashboardSummary,
  adminGetRevenueChart,
  adminGetAttendanceSummary,
  adminGetAttendanceRankings,
} from '@/lib/api/admin/analytics.service';
import { adminGetConsistencyReport, adminGetWebhooks, adminGetEmailLogs } from '@/lib/api/admin/diagnostics.service';
import { adminGetEvents } from '@/lib/api/admin/event.service';

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
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchError, setGlobalSearchError] = useState('');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['admin-analytics-summary'],
    queryFn: adminGetDashboardSummary,
  });

  const { data: consistencyReport } = useQuery({
    queryKey: ['admin-diagnostics-consistency'],
    queryFn: adminGetConsistencyReport,
    refetchInterval: 30000,
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
  });

  const { data: emailLogsData, isLoading: isEmailsLoading } = useQuery({
    queryKey: ['admin-diagnostics-emails'],
    queryFn: () => adminGetEmailLogs({ page: 1, limit: 10 }),
  });

  const failedEmails = (emailLogsData?.data || []).filter(email => email.status === 'failed');
  const failedWebhooks = failedWebhooksData?.data || [];

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

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalSearchError('');
    const query = globalSearchQuery.trim();
    if (!query) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const refRegex = /^MAD-\d{4}-[A-Z0-9]{5}$/i;

    if (emailRegex.test(query)) {
      router.push(`/bookings?search=${encodeURIComponent(query)}`);
    } else if (refRegex.test(query)) {
      const normalizedRef = query.toUpperCase();
      router.push(`/bookings?search=${encodeURIComponent(normalizedRef)}`);
    } else {
      setGlobalSearchError('Please enter a valid Booking Reference (MAD-YYYY-XXXXX) or Customer Email.');
    }
  };

  const failedPaymentRecoveryCount = (consistencyReport?.counts?.orphanPayments ?? 0) + (consistencyReport?.counts?.awaitingPaymentBookings ?? 0);

  const stats = [
    { label: 'Confirmed Bookings', value: summary?.totalBookings, icon: '🎟️', href: '/bookings' },
    { label: 'Last 30 Days', value: summary?.recentBookings, icon: '📅', href: '/bookings' },
    {
      label: 'Total Revenue',
      value: summary ? `₹${summary.totalRevenue.toLocaleString('en-IN')}` : undefined,
      icon: '💰',
      href: '/dashboard?tab=analytics',
    },
  ];

  const allQuickLinks = [
    { label: 'Create Event', href: '/events/new', icon: '🎪', color: 'border-accent-purple/30 hover:border-accent-purple/60', roles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER] },
    { label: 'View Bookings', href: '/bookings', icon: '🎟️', color: 'border-border-subtle hover:border-white/20', roles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT, AdminRole.SCANNER] },
    { label: 'Process Refunds', href: '/refunds', icon: '💸', color: 'border-border-subtle hover:border-white/20', roles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN] },
    { label: 'Analytics', href: '/dashboard?tab=analytics', icon: '📊', color: 'border-border-subtle hover:border-white/20', roles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT] },
    { label: 'Scanner Console', href: '/scanner', icon: '📷', color: 'border-border-subtle hover:border-white/20', roles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT, AdminRole.SCANNER] },
    { label: 'Diagnostics', href: '/diagnostics', icon: '🔧', color: 'border-border-subtle hover:border-white/20', roles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT] },
  ];

  const quickLinks = allQuickLinks.filter(link => {
    if (!admin?.role) return false;
    return link.roles.includes(admin.role as AdminRole);
  });



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
          {/* Global Search Bar */}
          <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
            <div>
              <h2 className="text-white font-semibold">Global Operational Search</h2>
              <p className="text-text-muted text-xs mt-0.5">Locate customer bookings instantly by email or reference number</p>
            </div>
            
            <form onSubmit={handleGlobalSearch} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={globalSearchQuery}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    if (globalSearchError) setGlobalSearchError('');
                  }}
                  placeholder="e.g. MAD-2026-XXXXX or customer@gmail.com"
                  className="flex-1 px-4 py-3 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-accent-purple hover:bg-accent-purple-light text-white text-sm font-semibold rounded-xl shadow-glow-sm hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
                >
                  Search Booking
                </button>
              </div>
              {globalSearchError && (
                <p className="text-red-400 text-xs mt-1 animate-pulse">{globalSearchError}</p>
              )}
            </form>
          </div>

          {summary?.pendingRefundsCount && summary.pendingRefundsCount > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Link
                href="/refunds"
                className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-sm font-semibold hover:bg-amber-500/15 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
                  <span>Pending Actions Required: You have {summary.pendingRefundsCount} refund request{summary.pendingRefundsCount > 1 ? 's' : ''} awaiting review.</span>
                </div>
                <span className="text-xs font-bold underline bg-amber-500/20 px-2.5 py-1.5 rounded">Process →</span>
              </Link>
            </motion.div>
          ) : null}

          {failedPaymentRecoveryCount > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Link
                href="/diagnostics"
                className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/15 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span>Action Required: You have {failedPaymentRecoveryCount} payment recovery drift{failedPaymentRecoveryCount > 1 ? 's' : ''} requiring investigation.</span>
                </div>
                <span className="text-xs font-bold underline bg-red-500/20 px-2.5 py-1.5 rounded">Investigate →</span>
              </Link>
            </motion.div>
          ) : null}

          {/* Quick Links */}
          <div>
            <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href}
                  className={`glass rounded-xl border ${link.color} p-4 flex flex-col items-center gap-2 text-center transition-all hover:bg-white/3`}>
                  <span className="text-2xl">{link.icon}</span>
                  <span className="text-text-secondary text-sm font-medium">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Happening Today Feed */}
          <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">Happening Today</h2>
                <p className="text-text-muted text-xs mt-0.5">Today's active event schedules and gate volumes</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium">
                {todaysEvents.length} Active {todaysEvents.length === 1 ? 'Event' : 'Events'}
              </span>
            </div>
            
            {isEventsLoading ? (
              <div className="p-8 text-center text-text-muted animate-pulse">Loading active schedule...</div>
            ) : todaysEvents.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-text-muted text-sm">No events scheduled for today.</p>
                <Link href="/events/new" className="inline-block px-4 py-2 bg-white/5 border border-border-subtle rounded-xl text-xs font-semibold text-white hover:bg-white/10 transition-colors">
                  + Schedule Event
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle/40">
                {todaysEvents.map((event) => {
                  const sold = event.ticketsSold ?? 0;
                  const capacity = event.totalCapacity ?? 1;
                  const pct = Math.min(100, Math.round((sold / capacity) * 100));
                  
                  return (
                    <div key={event._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/2 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${event.status === 'published' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                          <h3 className="text-white font-bold text-base">{event.title}</h3>
                        </div>
                        <p className="text-text-muted text-xs">{event.venue}</p>
                        <p className="text-text-secondary text-xs font-mono">
                          Gates: {new Date(event.startDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      
                      <div className="w-full sm:w-48 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-text-secondary">Capacity Sold ({pct}%)</span>
                          <span className="text-white font-semibold">{sold} / {capacity}</span>
                        </div>
                        <div className="w-full bg-white/5 border border-white/10 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-accent-purple h-full rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Simplified Diagnostic Alert Feed */}
          <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
            <div>
              <h2 className="text-white font-semibold">System Delivery Alerts</h2>
              <p className="text-text-muted text-xs mt-0.5">Critical ticket email and callback webhook delivery status logs</p>
            </div>
            
            {isWebhooksLoading || isEmailsLoading ? (
              <div className="text-text-muted text-xs animate-pulse">Checking system delivery logs...</div>
            ) : failedWebhooks.length === 0 && failedEmails.length === 0 ? (
              <div className="text-emerald-400 text-xs flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-4 py-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>System notifications are operating normally. 0 transmission errors.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {failedEmails.map((email) => (
                  <div key={email._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span className="text-white text-xs font-semibold">Ticket Email Delivery Failure</span>
                      </div>
                      <p className="text-text-muted text-[10px] font-mono">Reference: {email.bookingId?.bookingId ?? '—'}</p>
                      {email.errorMessage && <p className="text-red-400/80 text-[10px] leading-relaxed italic">{email.errorMessage}</p>}
                    </div>
                    <Link href="/diagnostics/emails" className="shrink-0 text-[10px] font-bold text-red-400 hover:text-white bg-red-500/20 px-2.5 py-1.5 rounded-lg border border-red-500/30 transition-all text-center">
                      View Log →
                    </Link>
                  </div>
                ))}
                
                {failedWebhooks.map((hook) => (
                  <div key={hook._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span className="text-white text-xs font-semibold">Webhook Callback Failure ({hook.provider})</span>
                      </div>
                      <p className="text-text-muted text-[10px] font-mono">Event: {hook.eventType ?? '—'}</p>
                      {hook.errorMessage && <p className="text-red-400/80 text-[10px] leading-relaxed italic">{hook.errorMessage}</p>}
                    </div>
                    <Link href="/diagnostics/webhooks" className="shrink-0 text-[10px] font-bold text-red-400 hover:text-white bg-red-500/20 px-2.5 py-1.5 rounded-lg border border-red-500/30 transition-all text-center">
                      Retry Webhook →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
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
