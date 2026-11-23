'use client';

import React from 'react';

import { RefundStatus, formatMoney } from '@mad/shared';
import type { AdminRefund } from '@mad/types';
import { Badge, Button, EmptyState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@mad/ui';
import { Receipt, Search } from '@mad/ui/icons';
import { formatDateTime } from '@mad/utils';

const STATUS_VARIANT: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
  [RefundStatus.REQUESTED]: 'warning',
  [RefundStatus.PROCESSING]: 'info',
  [RefundStatus.COMPLETED]: 'success',
  [RefundStatus.FAILED]: 'danger',
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
          <div>{refund.bookingId?.bookingId ?? String(refund.bookingId).slice(-8)}</div>
          {refund.ticketIds && refund.ticketIds.length > 0 && (
            <div className="text-[10px] text-text-muted mt-0.5">{refund.ticketIds.length} tickets</div>
          )}
        </TableCell>
        <TableCell className="py-3.5 px-4 text-white font-semibold">{formatMoney(refund.amount, refund.currency)}</TableCell>
        <TableCell className="py-3.5 px-4 text-text-secondary max-w-40 truncate">{refund.reason ?? '—'}</TableCell>
        <TableCell className="py-3.5 px-4">
          <Badge variant={STATUS_VARIANT[refund.status] ?? 'default'} size="sm">
            {refund.status}
          </Badge>
        </TableCell>
        <TableCell className="py-3.5 px-4 text-text-muted text-xs">{formatDateTime(refund.createdAt)}</TableCell>
        <TableCell className="py-3.5 px-4">
          {canProcessRefund && refund.status === RefundStatus.REQUESTED && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onProcess(refund)}
              className="text-accent-purple border-accent-purple/30 hover:bg-accent-purple/10"
            >
              Process
            </Button>
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
          <TableHead
            role="columnheader"
            tabIndex={0}
            aria-sort={sortField === 'amount' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
            onClick={() => onSort('amount')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSort('amount');
              }
            }}
            className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none"
          >
            <span>Amount</span>
            {sortField === 'amount' && (
              <span aria-hidden="true" className="ml-1 text-xs">
                {sortOrder === 'asc' ? '▲' : '▼'}
              </span>
            )}
          </TableHead>
          <TableHead className="py-3.5 px-4">Reason</TableHead>
          <TableHead
            role="columnheader"
            tabIndex={0}
            aria-sort={sortField === 'status' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
            onClick={() => onSort('status')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSort('status');
              }
            }}
            className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none"
          >
            <span>Status</span>
            {sortField === 'status' && (
              <span aria-hidden="true" className="ml-1 text-xs">
                {sortOrder === 'asc' ? '▲' : '▼'}
              </span>
            )}
          </TableHead>
          <TableHead
            role="columnheader"
            tabIndex={0}
            aria-sort={sortField === 'createdAt' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
            onClick={() => onSort('createdAt')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSort('createdAt');
              }
            }}
            className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none"
          >
            <span>Requested</span>
            {sortField === 'createdAt' && (
              <span aria-hidden="true" className="ml-1 text-xs">
                {sortOrder === 'asc' ? '▲' : '▼'}
              </span>
            )}
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
