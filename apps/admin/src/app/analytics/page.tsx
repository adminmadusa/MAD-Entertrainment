'use client';

import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import { adminGetDashboardSummary, adminGetRevenueChart } from '@/lib/api/admin/analytics.service';

export default function AdminAnalyticsPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['admin-analytics-summary'],
    queryFn: adminGetDashboardSummary,
  });

  const { data: revenue } = useQuery({
    queryKey: ['admin-revenue-chart', 30],
    queryFn: () => adminGetRevenueChart(30),
  });

  const stats = [
    { label: 'Total Bookings', value: summary?.totalBookings?.toLocaleString('en-IN') ?? '—', icon: '🎟️' },
    { label: 'Last 30 Days', value: summary?.recentBookings?.toLocaleString('en-IN') ?? '—', icon: '📅' },
    { label: 'Total Revenue', value: summary ? `₹${summary.totalRevenue.toLocaleString('en-IN')}` : '—', icon: '💰' },
  ];

  const chartData = revenue?.map((point) => ({
    date: point._id.slice(5),
    revenue: point.revenue,
    bookings: point.count,
  })) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Analytics</h1>
        <p className="text-text-muted text-sm mt-0.5">Platform performance overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className="glass rounded-2xl border border-border-subtle p-6">
            <div className="text-3xl mb-3">{stat.icon}</div>
            <p className="text-text-muted text-sm">{stat.label}</p>
            <p className={`text-2xl font-black mt-1 ${isLoading ? 'text-text-muted animate-pulse' : 'text-white'}`}>
              {isLoading ? '...' : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
        <h2 className="text-white font-semibold">Revenue — Last 30 Days</h2>
        {!revenue || revenue.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-text-muted text-sm">
            No revenue data yet. Bookings will appear here.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Events */}
      {Array.isArray(summary?.topEvents) && summary.topEvents.length > 0 ? (
        <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
          <div className="px-6 py-4 border-b border-border-subtle">
            <h2 className="text-white font-semibold">Top Events by Revenue</h2>
          </div>
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
      ) : null}
    </div>
  );
}
