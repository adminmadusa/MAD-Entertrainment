import React, { useState } from 'react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@mad/ui';
import { formatDateTime } from '@mad/utils';

interface UserRefundItem {
  refundId: string;
  amount: number;
  currency: string;
  reason?: string;
  status: string;
  processedAt: string | null;
  bookingId: string;
}

interface UserRefundsTableProps {
  refunds: UserRefundItem[];
  itemsPerPage?: number;
}

export default function UserRefundsTable({
  refunds,
  itemsPerPage = 10,
}: UserRefundsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalRefunds = refunds.length;
  const totalPages = Math.ceil(totalRefunds / itemsPerPage) || 1;
  const paginatedRefunds = refunds.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
      <Table>
        <TableHeader stickyHeader className="bg-white/[0.01]">
          <TableRow>
            <TableHead sticky="start" showStickyDivider className="py-3 px-5">Refund ID</TableHead>
            <TableHead className="py-3 px-4">Booking ID</TableHead>
            <TableHead className="py-3 px-4">Reason</TableHead>
            <TableHead className="py-3 px-4">Status</TableHead>
            <TableHead className="py-3 px-4">Processed Date</TableHead>
            <TableHead sticky="end" showStickyDivider className="py-3 px-5 text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedRefunds.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-text-muted">
                No refund logs registered.
              </TableCell>
            </TableRow>
          ) : (
            paginatedRefunds.map((r) => (
              <TableRow key={r.refundId} className="border-b border-border-subtle/30 hover:bg-white/2 transition-colors">
                <TableCell sticky="start" showStickyDivider className="py-3.5 px-5 font-mono text-xs text-white">{r.refundId}</TableCell>
                <TableCell className="py-3.5 px-4 font-mono text-xs text-text-secondary">{r.bookingId}</TableCell>
                <TableCell className="py-3.5 px-4 text-text-secondary text-xs italic">
                  {r.reason || 'No reason specified'}
                </TableCell>
                <TableCell className="py-3.5 px-4">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-semibold border capitalize ${
                    r.status === 'completed'
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                  }`}>
                    {r.status}
                  </span>
                </TableCell>
                <TableCell className="py-3.5 px-4 text-text-secondary text-xs">
                  {r.processedAt ? formatDateTime(r.processedAt) : 'Pending'}
                </TableCell>
                <TableCell sticky="end" showStickyDivider className="py-3.5 px-5 text-right font-semibold text-white">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: r.currency,
                  }).format(r.amount)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Client Refunds Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-white/[0.01]">
          <p className="text-text-muted text-xs">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary"
            >
              ← Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
