'use client';

import React from 'react';

import type { AdminRefund } from '@/lib/api/admin/refund.service';
import { formatMoney } from '@mad/shared';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@mad/ui';
import { Receipt, Search } from '@mad/ui/icons';
import { formatDateTime } from '@mad/utils';

const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/10 text-green-400 border-green-500/30',
  failed: 'bg-red-500/10 text-red-400 border-red-500/30',
};

interface RefundsTableProps {
  refunds: AdminRefund[];
  isLoading: boolean;
  statusFilter: string;
  canProcessRefund: boolean;
  sortField: 'amount' | 'createdAt' | 'status' | null;
  sortOrder: 'asc' | 'desc';
  onSort: (field: 'amount' | 'createdAt' | 'status') => void;
  onProcess: (refund: AdminRefund) => void;
}

export function RefundsTable({
  refunds,
  isLoading,
  statusFilter,
  canProcessRefund,
  sortField,
  sortOrder,
  onSort,
  onProcess,
}: RefundsTableProps) {
  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/40 animate-pulse">
          {Array.from({ length: 6 }).map((__, j) => (
            <TableCell key={j} className="py-4 px-4">
              <div className="h-3.5 bg-white/5 rounded w-20" />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    if (refunds.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8">
            <EmptyState
              variant="table"
              icon={statusFilter !== '' ? <Search /> : <Receipt />}
              title={statusFilter !== '' ? 'No results match your search.' : 'No refunds processed yet.'}
              description={statusFilter !== '' ? 'Try changing your filters.' : undefined}
            />
          </TableCell>
        </TableRow>
      );
    }

    return refunds.map((refund) => (
      <TableRow key={refund._id} className="border-b border-border-subtle/40 hover:bg-white/2">
        <TableCell className="py-3.5 px-4 font-mono text-xs text-accent-purple">
          <div>{(refund.bookingId as { bookingId?: string })?.bookingId ?? String(refund.bookingId).slice(-8)}</div>
          {refund.ticketIds && refund.ticketIds.length > 0 && (
            <div className="text-[10px] text-text-muted mt-0.5">{refund.ticketIds.length} tickets</div>
          )}
        </TableCell>
        <TableCell className="py-3.5 px-4 text-white font-semibold">{formatMoney(refund.amount, refund.currency)}</TableCell>
        <TableCell className="py-3.5 px-4 text-text-secondary max-w-40 truncate">{refund.reason ?? '—'}</TableCell>
        <TableCell className="py-3.5 px-4">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[refund.status] ?? ''}`}>
            {refund.status}
          </span>
        </TableCell>
        <TableCell className="py-3.5 px-4 text-text-muted text-xs">{formatDateTime(refund.createdAt)}</TableCell>
        <TableCell className="py-3.5 px-4">
          {canProcessRefund && refund.status === 'requested' && (
            <button
              onClick={() => onProcess(refund)}
              className="px-3 py-1.5 text-xs glass border border-accent-purple/30 rounded-lg text-accent-purple hover:bg-accent-purple/10 transition-all"
            >
              Process
            </button>
          )}
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow>
          <TableHead className="py-3.5 px-4">Booking</TableHead>
          <TableHead onClick={() => onSort('amount')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
            Amount {sortField === 'amount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
          </TableHead>
          <TableHead className="py-3.5 px-4">Reason</TableHead>
          <TableHead onClick={() => onSort('status')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
            Status {sortField === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
          </TableHead>
          <TableHead onClick={() => onSort('createdAt')} className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
            Requested {sortField === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
          </TableHead>
          <TableHead className="py-3.5 px-4">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {renderTableBody()}
      </TableBody>
    </Table>
  );
}
