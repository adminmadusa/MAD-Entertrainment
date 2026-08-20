'use client';

import React from 'react';

import type { DashboardSummary } from '@/lib/api/admin/analytics.service';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@mad/ui';

interface DashboardTopEventsTableProps {
  topEvents?: DashboardSummary['topEvents'];
}

export function DashboardTopEventsTable({ topEvents }: DashboardTopEventsTableProps) {
  if (!Array.isArray(topEvents) || topEvents.length === 0) {
    return null;
  }

  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
      <div className="px-6 py-4 border-b border-border-subtle">
        <h2 className="text-white font-semibold">Top Events by Revenue</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-3 px-6">Event</TableHead>
            <TableHead className="py-3 px-4">Bookings</TableHead>
            <TableHead className="py-3 px-6 text-right">Net Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topEvents.map((ev) => (
            <TableRow key={ev._id} className="border-b border-border-subtle/40 hover:bg-white/2">
              <TableCell className="py-3.5 px-6 text-text-primary">{ev.event?.title ?? 'Deleted Event'}</TableCell>
              <TableCell className="py-3.5 px-4 text-text-secondary">{ev.count}</TableCell>
              <TableCell className="py-3.5 px-6 text-right text-white font-semibold">₹{ev.revenue.toLocaleString('en-IN')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
