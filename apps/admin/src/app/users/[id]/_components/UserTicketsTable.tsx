import React, { useState } from 'react';

interface UserTicketItem {
  ticketId: string;
  tierName: string;
  admits: number;
  scannedAt: string | null;
  eventId: {
    _id: string;
    title: string;
    startDate: string;
  } | null;
  bookingId: string;
  purchaseDate: string;
}

interface UserTicketsTableProps {
  tickets: UserTicketItem[];
  itemsPerPage?: number;
}

export default function UserTicketsTable({
  tickets,
  itemsPerPage = 10,
}: UserTicketsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalTickets = tickets.length;
  const totalPages = Math.ceil(totalTickets / itemsPerPage) || 1;
  const paginatedTickets = tickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-white/[0.01]">
              <th className="text-left text-text-muted font-medium py-3 px-5">Ticket ID</th>
              <th className="text-left text-text-muted font-medium py-3 px-4">Event</th>
              <th className="text-left text-text-muted font-medium py-3 px-4">Tier</th>
              <th className="text-left text-text-muted font-medium py-3 px-4">Booking ID</th>
              <th className="text-left text-text-muted font-medium py-3 px-4">QR Status</th>
              <th className="text-right text-text-muted font-medium py-3 px-5">Scanned At</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-text-muted">
                  No tickets generated.
                </td>
              </tr>
            ) : (
              paginatedTickets.map((t) => (
                <tr key={t.ticketId} className="border-b border-border-subtle/30 hover:bg-white/2 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-xs text-white">{t.ticketId}</td>
                  <td className="py-3.5 px-4 text-text-primary">
                    {t.eventId ? (
                      <div>
                        <p className="font-semibold text-xs">{t.eventId.title}</p>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-text-secondary text-xs capitalize">
                    {t.tierName} (x{t.admits})
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-text-secondary">{t.bookingId}</td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-semibold border ${
                      t.scannedAt
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-green-500/10 border-green-500/20 text-green-400'
                    }`}>
                      {t.scannedAt ? 'Redeemed' : 'Valid'}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right text-text-secondary text-xs">
                    {t.scannedAt
                      ? new Date(t.scannedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Client Tickets Pagination */}
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
