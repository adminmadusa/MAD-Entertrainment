'use client';


import { AdminBooking } from '@/lib/api/admin/booking.service';
import { BookingStatus, getBookingStatusLabel } from '@mad/shared';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, TablePagination } from '@mad/ui';
import { Search } from '@mad/ui/icons';
import { formatDateTime } from '@mad/utils';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-500/10 text-green-400 border-green-500/30',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  awaiting_payment: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  expiring: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
  failed: 'bg-red-500/10 text-red-400 border-red-500/30',
  refunded: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  expired: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

export interface BookingsTableProps {
  bookings: AdminBooking[];
  isLoading: boolean;
  canMutateBookings: boolean;
  sortField: 'bookingId' | 'totalAmount' | 'createdAt' | null;
  sortOrder: 'asc' | 'desc';
  onSort: (field: 'bookingId' | 'totalAmount' | 'createdAt') => void;
  onRowClick: (booking: AdminBooking) => void;
  onCancelClick: (booking: AdminBooking) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  currentPage: number;
}

export default function BookingsTable({
  bookings,
  isLoading,
  canMutateBookings,
  sortField,
  sortOrder,
  onSort,
  onRowClick,
  onCancelClick,
  pagination,
  onPageChange,
  currentPage,
}: BookingsTableProps) {
  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/40 animate-pulse">
          {Array.from({ length: 7 }).map((__, j) => (
            <TableCell key={j} className="py-4 px-4">
              <div className="h-3.5 bg-white/5 rounded w-20" />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    if (bookings.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="py-8">
            <EmptyState 
              variant="table"
              icon={<Search />}
              title="No results match your search." 
              description="Try changing your filters or search criteria." 
            />
          </TableCell>
        </TableRow>
      );
    }

    return bookings.map((booking) => {
      const customer = booking.userId ?? booking.guestInfo;
      const customerName = (customer as { name?: string })?.name ?? '—';
      const customerEmail = (customer as { email?: string })?.email ?? '—';
      return (
        <TableRow
          key={booking._id}
          onClick={() => onRowClick(booking)}
          className="border-b border-border-subtle/40 hover:bg-white/2 cursor-pointer transition-colors"
        >
          <TableCell sticky="start" showStickyDivider className="py-4 px-5 font-mono text-xs text-accent-purple">{booking.bookingId}</TableCell>
          <TableCell className="py-4 px-4">
            <p className="text-text-primary text-sm">{customerName}</p>
            <p className="text-text-secondary text-xs">{customerEmail}</p>
          </TableCell>
          <TableCell className="py-4 px-4 text-text-secondary text-sm max-w-40 truncate">
            {(booking.eventId as { title?: string })?.title ?? '—'}
          </TableCell>
          <TableCell className="py-4 px-4 text-text-primary font-medium">
            ₹{booking.totalAmount.toLocaleString('en-IN')}
          </TableCell>
          <TableCell className="py-4 px-4">
            <span
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                STATUS_COLORS[booking.status] ?? 'text-text-muted border-border-subtle'
              }`}
            >
              {getBookingStatusLabel(booking.status)}
            </span>
            {booking.status === BookingStatus.CONFIRMED && booking.totalTickets > 0 && (
              <div className="mt-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md border ${
                    booking.ticketsScanned === booking.totalTickets
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/5 border-border-subtle text-text-secondary'
                  }`}
                >
                  {booking.ticketsScanned === booking.totalTickets
                    ? 'Fully Checked In'
                    : `${booking.ticketsScanned ?? 0} / ${booking.totalTickets} Checked In`}
                </span>
              </div>
            )}
          </TableCell>
          <TableCell className="py-4 px-4 text-text-muted text-xs">
            {formatDateTime(booking.createdAt)}
          </TableCell>
          <TableCell sticky="end" showStickyDivider className="py-4 px-5 text-right">
            {canMutateBookings && booking.status === BookingStatus.CONFIRMED && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelClick(booking);
                }}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg text-text-muted hover:text-red-400 hover:border-red-500/40 transition-all"
              >
                Cancel
              </button>
            )}
          </TableCell>
        </TableRow>
      );
    });
  };

  const renderSortArrow = (field: 'bookingId' | 'totalAmount' | 'createdAt') => {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
      <Table className="min-w-[900px]">
        <TableHeader stickyHeader>
          <TableRow>
            <TableHead
              sticky="start"
              showStickyDivider
              onClick={() => onSort('bookingId')}
              className="py-3.5 px-5 cursor-pointer hover:text-white transition-colors select-none"
            >
              Reference{renderSortArrow('bookingId')}
            </TableHead>
            <TableHead className="py-3.5 px-4">Customer</TableHead>
            <TableHead className="py-3.5 px-4">Event</TableHead>
            <TableHead
              onClick={() => onSort('totalAmount')}
              className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none"
            >
              Amount{renderSortArrow('totalAmount')}
            </TableHead>
            <TableHead className="py-3.5 px-4">Status</TableHead>
            <TableHead
              onClick={() => onSort('createdAt')}
              className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none"
            >
              Date{renderSortArrow('createdAt')}
            </TableHead>
            <TableHead sticky="end" showStickyDivider className="py-3.5 px-5 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{renderTableBody()}</TableBody>
      </Table>
      {pagination && pagination.totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
