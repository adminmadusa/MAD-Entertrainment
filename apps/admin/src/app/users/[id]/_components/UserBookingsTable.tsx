import React, { useState } from 'react';
import { BookingStatus, BOOKING_STATUS_META } from '@mad/shared';
import { UserDetailResponse } from '@/lib/api/admin/user.service';

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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-white/[0.01]">
              <th className="text-left text-text-muted font-medium py-3 px-5">Booking ID</th>
              <th className="text-left text-text-muted font-medium py-3 px-4">Event</th>
              <th className="text-left text-text-muted font-medium py-3 px-4">Status</th>
              <th className="text-left text-text-muted font-medium py-3 px-4">Date</th>
              <th className="text-left text-text-muted font-medium py-3 px-4">Tickets</th>
              <th className="text-right text-text-muted font-medium py-3 px-5">Paid</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-text-muted">
                  No bookings registered.
                </td>
              </tr>
            ) : (
              paginatedBookings.map((b) => (
                <tr key={b._id} className="border-b border-border-subtle/30 hover:bg-white/2 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-xs text-white">{b.bookingId}</td>
                  <td className="py-3.5 px-4 text-text-primary">
                    {b.eventId ? (
                      <div>
                        <p className="font-semibold text-xs">{b.eventId.title}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {new Date(b.eventId.startDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-semibold capitalize border ${
                      b.status === BookingStatus.CONFIRMED
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {BOOKING_STATUS_META[b.status as BookingStatus]?.label || b.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-text-secondary text-xs">
                    {new Date(b.purchaseDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-text-primary font-medium">{b.ticketCount}</td>
                  <td className="py-3.5 px-5 text-right font-semibold text-white">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: b.currency,
                    }).format(b.totalAmount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
