import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@mad/ui';

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
      <Table>
        <TableHeader className="bg-white/[0.01]">
          <TableRow>
            <TableHead className="py-3 px-5">Ticket ID</TableHead>
            <TableHead className="py-3 px-4">Event</TableHead>
            <TableHead className="py-3 px-4">Tier</TableHead>
            <TableHead className="py-3 px-4">Booking ID</TableHead>
            <TableHead className="py-3 px-4">QR Status</TableHead>
            <TableHead className="py-3 px-5 text-right">Scanned At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedTickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-text-muted">
                No tickets generated.
              </TableCell>
            </TableRow>
          ) : (
            paginatedTickets.map((t) => (
              <TableRow key={t.ticketId} className="border-b border-border-subtle/30 hover:bg-white/2 transition-colors">
                <TableCell className="py-3.5 px-5 font-mono text-xs text-white">{t.ticketId}</TableCell>
                <TableCell className="py-3.5 px-4 text-text-primary">
                  {t.eventId ? (
                    <div>
                      <p className="font-semibold text-xs">{t.eventId.title}</p>
                    </div>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="py-3.5 px-4 text-text-secondary text-xs capitalize">
                  {t.tierName} (x{t.admits})
                </TableCell>
                <TableCell className="py-3.5 px-4 font-mono text-xs text-text-secondary">{t.bookingId}</TableCell>
                <TableCell className="py-3.5 px-4">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-semibold border ${
                    t.scannedAt
                      ? 'bg-red-500/10 border-red-500/20 text-red-400'
                      : 'bg-green-500/10 border-green-500/20 text-green-400'
                  }`}>
                    {t.scannedAt ? 'Redeemed' : 'Valid'}
                  </span>
                </TableCell>
                <TableCell className="py-3.5 px-5 text-right text-text-secondary text-xs">
                  {t.scannedAt
                    ? new Date(t.scannedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

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
