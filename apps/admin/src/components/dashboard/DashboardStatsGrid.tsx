'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import React from 'react';

import type { DashboardSummary } from '@/lib/api/admin/analytics.service';
import { Ticket, CalendarDays, Banknote, CreditCard, ShieldCheck } from '@mad/ui/icons';

interface DashboardStatsGridProps {
  summary?: DashboardSummary;
  isLoading: boolean;
}

export function DashboardStatsGrid({ summary, isLoading }: DashboardStatsGridProps) {
  const stats = [
    { label: 'Confirmed Bookings', value: summary?.totalBookings, icon: <Ticket className="w-8 h-8 text-accent-purple" />, href: '/bookings' },
    { label: 'Bookings (Last 30 Days)', value: summary?.recentBookings, icon: <CalendarDays className="w-8 h-8 text-accent-purple" />, href: '/bookings' },
    {
      label: 'Lifetime Gross Revenue',
      value: summary ? `₹${summary.grossRevenue.toLocaleString('en-IN')}` : undefined,
      icon: <Banknote className="w-8 h-8 text-accent-purple" />,
      href: '/dashboard',
    },
    {
      label: 'Refund Amount',
      value: summary ? `₹${summary.refundAmount.toLocaleString('en-IN')}` : undefined,
      icon: <CreditCard className="w-8 h-8 text-accent-purple" />,
      href: '/refunds',
    },
    {
      label: 'Lifetime Net Revenue',
      value: summary ? `₹${summary.netRevenue.toLocaleString('en-IN')}` : undefined,
      icon: <ShieldCheck className="w-8 h-8 text-accent-purple" />,
      href: '/dashboard',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
      {stats.map((stat, i) => (
        <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
          <Link href={stat.href} className="block glass rounded-2xl border border-border-subtle p-6 hover:border-accent-purple/50 hover:scale-[1.01] hover:shadow-glow-sm cursor-pointer transition-all duration-200 group">
            <div className="mb-3">{stat.icon}</div>
            <p className="text-text-secondary text-sm">{stat.label}</p>
            <p className={`text-2xl font-black mt-1 group-hover:text-gradient transition-all ${isLoading ? 'text-text-secondary animate-pulse' : 'text-white'}`}>
              {isLoading ? '...' : (stat.value?.toLocaleString?.() ?? stat.value ?? '0')}
            </p>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
