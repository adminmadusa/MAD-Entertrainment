import React, { useState } from 'react';

import { UserDetailResponse } from '@/lib/api/admin/user.service';
import { BookingStatus, BOOKING_STATUS_META } from '@mad/shared';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@mad/ui';
import { formatDateTime, formatEventDate } from '@mad/utils';

interface UserBookingsTableProps {
  bookings: UserDetailResponse['data']['bookings'];
  itemsPerPage?: number;
}

export default function UserBookingsTable({
  bookings,
  itemsPerPage = 10,
}: UserBookingsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalBookings = bookings.length;
  const totalPages = Math.ceil(totalBookings / itemsPerPage) || 1;
  const paginatedBookings = bookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
      <Table>
        <TableHeader className="bg-white/[0.01]">
          <TableRow>
            <TableHead className="py-3 px-5">Booking ID</TableHead>
            <TableHead className="py-3 px-4">Event</TableHead>
            <TableHead className="py-3 px-4">Status</TableHead>
            <TableHead className="py-3 px-4">Date</TableHead>
            <TableHead className="py-3 px-4">Tickets</TableHead>
            <TableHead className="py-3 px-5 text-right">Paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedBookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-text-muted">
                No bookings registered.
              </TableCell>
            </TableRow>
          ) : (
            paginatedBookings.map((b) => (
              <TableRow key={b._id} className="border-b border-border-subtle/30 hover:bg-white/2 transition-colors">
                <TableCell className="py-3.5 px-5 font-mono text-xs text-white">{b.bookingId}</TableCell>
                <TableCell className="py-3.5 px-4 text-text-primary">
                  {b.eventId ? (
                    <div>
                      <p className="font-semibold text-xs">{b.eventId.title}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {formatEventDate(b.eventId.startDate)}
                      </p>
                    </div>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="py-3.5 px-4">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-semibold capitalize border ${
                    b.status === BookingStatus.CONFIRMED
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {BOOKING_STATUS_META[b.status]?.label || b.status}
                  </span>
                </TableCell>
                <TableCell className="py-3.5 px-4 text-text-secondary text-xs">
                  {formatDateTime(b.purchaseDate)}
                </TableCell>
                <TableCell className="py-3.5 px-4 text-text-primary font-medium">{b.ticketCount}</TableCell>
                <TableCell className="py-3.5 px-5 text-right font-semibold text-white">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: b.currency,
                  }).format(b.totalAmount)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Client Bookings Pagination */}
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
