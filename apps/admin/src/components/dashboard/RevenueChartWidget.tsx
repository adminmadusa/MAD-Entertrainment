'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface RevenuePoint {
  _id: string;
  revenue: number;
  count: number;
  dailyGrossRevenue?: number;
  dailyRefundAmount?: number;
  dailyNetRevenue?: number;
}

interface RevenueChartWidgetProps {
  revenue: RevenuePoint[] | undefined;
}

const formatYAxisTick = (value: number) => {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  }
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `₹${value}`;
};

export default function RevenueChartWidget({ revenue }: RevenueChartWidgetProps) {
  const chartData = revenue?.map((point) => ({
    date: point._id.slice(5),
    revenue: point.revenue,
    bookings: point.count,
    dailyGrossRevenue: point.dailyGrossRevenue || 0,
    dailyRefundAmount: point.dailyRefundAmount || 0,
    dailyNetRevenue: point.dailyNetRevenue || 0,
  })) || [];

  if (!revenue || revenue.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted text-sm">
        No revenue data yet. Bookings will appear here.
      </div>
    );
  }

  return (
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
          <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatYAxisTick} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-bg-card border border-border-subtle p-4 rounded-xl space-y-1.5 shadow-glow-sm">
                    <p className="text-text-secondary text-xs font-semibold">{label}</p>
                    <p className="text-white text-xs font-medium">
                      Gross: <span className="text-emerald-400 font-semibold">₹{data.dailyGrossRevenue.toLocaleString('en-IN')}</span>
                    </p>
                    <p className="text-white text-xs font-medium">
                      Refunds: <span className="text-red-400 font-semibold">₹{data.dailyRefundAmount.toLocaleString('en-IN')}</span>
                    </p>
                    <div className="border-t border-white/10 pt-1.5 mt-1.5">
                      <p className="text-white text-xs font-bold">
                        Net: <span className="text-accent-purple font-bold">₹{data.dailyNetRevenue.toLocaleString('en-IN')}</span>
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
