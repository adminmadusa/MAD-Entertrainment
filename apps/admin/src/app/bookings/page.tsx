'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookingStatus, getBookingStatusLabel, AdminRole } from '@mad/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/providers/AdminAuthProvider';

import {
  adminGetBookings,
  adminCancelBooking,
  adminCorrectBookingEmail,
  adminResendBookingTickets,
  adminGetBookingsSummary,
  type AdminBooking,
} from '@/lib/api/admin/booking.service';
import { extractApiError } from '@/lib/api/client';
import ErrorState from '@/components/states/ErrorState';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import BookingsSummaryWidget from '@/components/bookings/BookingsSummaryWidget';

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

const BOOKING_STATUS_FILTERS = [
  BookingStatus.AWAITING_PAYMENT,
  BookingStatus.CONFIRMED,
  BookingStatus.FAILED,
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.EXPIRED,
  BookingStatus.EXPIRING,
];

const ATTENDANCE_COLORS: Record<string, string> = {
  NOT_ATTENDED: 'bg-red-500/10 text-red-400 border-red-500/30',
  PARTIALLY_ATTENDED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  FULLY_ATTENDED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

function BookingsContent() {
  const { admin } = useAdminAuth();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const canMutateBookings = !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT].includes(admin.role as AdminRole);
  const [statusFilter, setStatusFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<AdminBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [sortField, setSortField] = useState<'bookingId' | 'totalAmount' | 'createdAt' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'bookingId' | 'totalAmount' | 'createdAt') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  useEffect(() => {
    const querySearch = searchParams.get('search') || searchParams.get('ref');
    if (querySearch) {
      setSearch(querySearch);
    }
  }, [searchParams]);

  const { data: eventsData } = useQuery({
    queryKey: ['admin-events', { status: 'published' }],
    queryFn: () => adminGetEvents({ limit: 100 }),
  });
  const events = eventsData?.items || [];

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-bookings', { page, search, status: statusFilter, eventId: eventFilter }],
    queryFn: () => adminGetBookings({ page, limit: 15, ...(search && { search }), ...(statusFilter && { status: statusFilter }), ...(eventFilter && { eventId: eventFilter }) }),
  });

  const { data: summary, isLoading: isSummaryLoading, isError: isSummaryError } = useQuery({
    queryKey: ['admin-bookings-summary', eventFilter],
    queryFn: () => adminGetBookingsSummary(eventFilter),
    staleTime: 60000,
  });

  const fallbackSummary = {
    totalBookings: 0,
    totalTickets: 0,
    revenue: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    checkedIn: 0,
  };

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminCancelBooking(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      setCancelTarget(null);
      setCancelReason('');
    },
  });

  // Email correction and ticket resending states
  const [isEditEmailOpen, setIsEditEmailOpen] = useState(false);
  const [editEmailValue, setEditEmailValue] = useState('');
  const [editReasonValue, setEditReasonValue] = useState('');
  const [editEmailError, setEditEmailError] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Auto-dismiss feedback messages
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  useEffect(() => {
    if (errorToast) {
      const timer = setTimeout(() => setErrorToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorToast]);

  const correctEmailMutation = useMutation({
    mutationFn: ({ id, newEmail, reason }: { id: string; newEmail: string; reason: string }) =>
      adminCorrectBookingEmail(id, newEmail, reason),
    onSuccess: (updatedBooking) => {
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      // Update local state instantly so the details modal shows the corrected email
      setSelectedBooking(updatedBooking);
      setIsEditEmailOpen(false);
      setEditEmailValue('');
      setEditReasonValue('');
      setEditEmailError('');
      setSuccessToast('Booking email corrected successfully');
    },
    onError: (err) => {
      setEditEmailError(extractApiError(err).message || 'Failed to correct email');
    },
  });

  const resendTicketsMutation = useMutation({
    mutationFn: (id: string) => adminResendBookingTickets(id),
    onSuccess: () => {
      setSuccessToast('Tickets enqueued for resend successfully');
    },
    onError: (err) => {
      setErrorToast(extractApiError(err).message || 'Failed to resend tickets');
    },
  });

  const bookings = useMemo(() => data?.items ?? [], [data?.items]);
  const pagination = data?.pagination;

  useEffect(() => {
    if (search && bookings.length === 1 && !selectedBooking) {
      setSelectedBooking(bookings[0]);
    }
  }, [bookings, search, selectedBooking]);

  const sortedBookings = [...bookings].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const aStr = aVal.toLowerCase();
      const bStr = bVal.toLowerCase();
      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border-subtle/40 animate-pulse">
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} className="py-4 px-4"><div className="h-3.5 bg-white/5 rounded w-20" /></td>
          ))}
        </tr>
      ));
    }

    if (sortedBookings.length === 0) {
      return (
        <tr><td colSpan={7} className="py-16 text-center text-text-muted">No bookings found.</td></tr>
      );
    }

    return sortedBookings.map((booking) => {
      const customer = booking.userId ?? booking.guestInfo;
      const customerName = (customer as { name?: string })?.name ?? '—';
      const customerEmail = (customer as { email?: string })?.email ?? '—';
      return (
        <tr key={booking._id} onClick={() => setSelectedBooking(booking)} className="border-b border-border-subtle/40 hover:bg-white/2 cursor-pointer transition-colors">
          <td className="py-4 px-5 font-mono text-xs text-accent-purple">{booking.bookingId}</td>
          <td className="py-4 px-4">
            <p className="text-text-primary text-sm">{customerName}</p>
            <p className="text-text-muted text-xs">{customerEmail}</p>
          </td>
          <td className="py-4 px-4 text-text-secondary text-sm max-w-40 truncate">
            {(booking.eventId as { title?: string })?.title ?? '—'}
          </td>
          <td className="py-4 px-4 text-text-primary font-medium">₹{booking.totalAmount.toLocaleString('en-IN')}</td>
          <td className="py-4 px-4">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[booking.status] ?? 'text-text-muted border-border-subtle'}`}>
              {getBookingStatusLabel(booking.status)}
            </span>
            {booking.status === BookingStatus.CONFIRMED && booking.totalTickets > 0 && (
              <div className="mt-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-md border ${booking.ticketsScanned === booking.totalTickets ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-border-subtle text-text-secondary'}`}>
                  {booking.ticketsScanned === booking.totalTickets ? 'Fully Checked In' : `${booking.ticketsScanned ?? 0} / ${booking.totalTickets} Checked In`}
                </span>
              </div>
            )}
          </td>
          <td className="py-4 px-4 text-text-muted text-xs">
            {new Date(booking.createdAt).toLocaleDateString('en-IN')}
          </td>
          <td className="py-4 px-5 text-right">
            {canMutateBookings && booking.status === BookingStatus.CONFIRMED && (
              <button onClick={(e) => { e.stopPropagation(); setCancelTarget(booking); }}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg text-text-muted hover:text-red-400 hover:border-red-500/40 transition-all">
                Cancel
              </button>
            )}
          </td>
        </tr>
      );
    });
  };

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load bookings.'} />
      </div>
    );
  }

  const handleExportCSV = () => {
    if (!bookings || bookings.length === 0) return;
    
    const headers = [
      'Reference',
      'First Name',
      'Last Name',
      'Customer Email',
      'Customer Phone',
      'Marketing: Keep Updated',
      'Marketing: Best Events',
      'Event',
      'Amount',
      'Status',
      'Date'
    ];
    const csvContent = [
      headers.join(','),
      ...bookings.map((b) => {
        const customer = b.userId ?? b.guestInfo;
        const firstName = customer?.firstName?.replace(/,/g, '') ?? '—';
        const lastName = customer?.lastName?.replace(/,/g, '') ?? '—';
        const email = customer?.email?.replace(/,/g, '') ?? '—';
        const phone = customer?.phone || '—';
        const keepUpdated = customer?.keepUpdated ? 'Yes' : 'No';
        const sendBestEvents = customer?.sendBestEvents ? 'Yes' : 'No';
        const eventTitle = (b.eventId as { title?: string })?.title?.replace(/,/g, '') ?? '—';
        return `${b.bookingId},${firstName},${lastName},${email},${phone},${keepUpdated},${sendBestEvents},${eventTitle},${b.totalAmount},${getBookingStatusLabel(b.status)},${new Date(b.createdAt).toLocaleDateString('en-IN')}`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Bookings</h1>
          <p className="text-text-muted text-sm mt-0.5">{pagination?.total ?? 0} total bookings</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input type="search" placeholder="Search by reference or email..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full md:w-auto min-w-[20rem] px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple" />
        
        <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setPage(1); }}
          className="flex-1 min-w-[12rem] px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple">
          <option value="">All Events</option>
          {events.map((ev) => (
            <option key={ev._id} value={ev._id}>{ev.title}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple">
          <option value="">All Statuses</option>
          {BOOKING_STATUS_FILTERS.map((status) => (
            <option key={status} value={status}>{getBookingStatusLabel(status)}</option>
          ))}
        </select>

        <button
          onClick={handleExportCSV}
          disabled={bookings.length === 0}
          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {isSummaryError && (
        <div className="text-red-400 text-xs font-semibold flex items-center gap-1.5 px-1 animate-pulse">
          <span>⚠️</span>
          <span>Failed to refresh summary metrics</span>
        </div>
      )}

      <BookingsSummaryWidget
        {...(summary ?? fallbackSummary)}
        isLoading={isSummaryLoading}
      />

      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th onClick={() => handleSort('bookingId')} className="text-left text-text-muted font-medium py-3.5 px-5 cursor-pointer hover:text-white transition-colors select-none">
                  Reference {sortField === 'bookingId' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Customer</th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Event</th>
                <th onClick={() => handleSort('totalAmount')} className="text-left text-text-muted font-medium py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
                  Amount {sortField === 'totalAmount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">Status</th>
                <th onClick={() => handleSort('createdAt')} className="text-left text-text-muted font-medium py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none">
                  Date {sortField === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="text-right text-text-muted font-medium py-3.5 px-5">Action</th>
              </tr>
            </thead>
            <tbody>
              {renderTableBody()}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
            <p className="text-text-muted text-xs">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary">← Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-sm w-full space-y-4">
              <h3 className="text-white font-bold">Cancel Booking</h3>
              <p className="text-text-secondary text-sm">Booking <span className="text-accent-purple font-mono">{cancelTarget.bookingId}</span> will be cancelled.</p>
              <div className="space-y-1.5">
                <label className="text-sm text-text-secondary">Reason (optional)</label>
                <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation..." className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setCancelTarget(null); setCancelReason(''); }}
                  className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm text-text-secondary">Cancel</button>
                <button onClick={() => cancelMutation.mutate({ id: cancelTarget._id, reason: cancelReason })}
                  disabled={cancelMutation.isPending}
                  className="flex-1 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-medium disabled:opacity-60">
                  {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedBooking && (() => {
          const customer = selectedBooking.userId ?? selectedBooking.guestInfo;
          const email = customer?.email ?? '—';
          const phone = customer?.phone || '—';
          const keepUpdated = customer?.keepUpdated ? 'Yes' : 'No';
          const sendBestEvents = customer?.sendBestEvents ? 'Yes' : 'No';
          
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-lg w-full space-y-6 overflow-y-auto max-h-[90vh] scrollbar-thin"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs text-text-muted font-mono uppercase tracking-wider">Booking ID</span>
                    <h3 className="text-white text-lg font-black font-mono mt-0.5">{selectedBooking.bookingId}</h3>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${STATUS_COLORS[selectedBooking.status] ?? 'text-text-muted border-border-subtle'}`}>
                    {getBookingStatusLabel(selectedBooking.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">Customer Info</h4>
                    <p className="text-white font-semibold">{customer?.name ?? '—'}</p>
                    <p className="text-text-secondary text-xs mt-0.5">{email}</p>
                    <p className="text-text-secondary text-xs">{phone}</p>
                  </div>
                  <div>
                    <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">Event</h4>
                    <p className="text-white font-semibold">{(selectedBooking.eventId as { title?: string })?.title ?? '—'}</p>
                    <p className="text-text-secondary text-xs mt-0.5">
                      {selectedBooking.eventId?.startDate
                        ? new Date(selectedBooking.eventId.startDate).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm border-t border-white/5 pt-4">
                  <div>
                    <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">Booking Mode</h4>
                    <p className="text-white font-medium capitalize">{selectedBooking.mode?.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider">Attendance Status</h4>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${ATTENDANCE_COLORS[selectedBooking.attendanceStatus ?? 'NOT_ATTENDED']}`}>
                      {selectedBooking.attendanceStatus?.replace('_', ' ') ?? 'NOT ATTENDED'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center bg-white/5 rounded-xl p-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-text-muted text-[9px] uppercase tracking-wider block">Purchased</span>
                      <span className="text-white font-black text-sm">{selectedBooking.totalTickets ?? 0}</span>
                    </div>
                    <div className="space-y-0.5 border-x border-white/5">
                      <span className="text-text-muted text-[9px] uppercase tracking-wider block">Checked In</span>
                      <span className="text-emerald-400 font-black text-sm">{selectedBooking.ticketsScanned ?? 0}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-text-muted text-[9px] uppercase tracking-wider block">Remaining</span>
                      <span className="text-white font-black text-sm">{selectedBooking.ticketsRemaining ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-2">
                  <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">Marketing Preferences</h4>
                  <div className="flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-3">
                    <span className="text-text-secondary">Keep updated about event updates</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${customer?.keepUpdated ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-text-muted border border-white/10'}`}>
                      {keepUpdated}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-3">
                    <span className="text-text-secondary">Receive details on best events</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${customer?.sendBestEvents ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-text-muted border border-white/10'}`}>
                      {sendBestEvents}
                    </span>
                  </div>
                </div>

                {/* Success / Error Feedback Alert inside Modal */}
                {successToast && (
                  <div className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400">
                    {successToast}
                  </div>
                )}
                {errorToast && (
                  <div className="px-4 py-2.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400">
                    {errorToast}
                  </div>
                )}

                <div className="border-t border-white/5 pt-4 space-y-3">
                  <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider">Customer Contact</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 rounded-xl p-4">
                    <div className="space-y-0.5">
                      <span className="text-text-muted text-[10px] uppercase tracking-wider block">Current Email</span>
                      <span className="text-white font-semibold font-mono text-sm">{email}</span>
                    </div>
                    {canMutateBookings && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditEmailValue(email === '—' ? '' : email);
                            setEditReasonValue('');
                            setEditEmailError('');
                            setIsEditEmailOpen(true);
                          }}
                          disabled={!!selectedBooking.userId}
                          className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
                            selectedBooking.userId
                              ? 'bg-white/5 border-white/10 text-text-muted cursor-not-allowed opacity-50'
                              : 'glass border-border-subtle text-text-secondary hover:text-white hover:border-accent-purple/50'
                          }`}
                        >
                          Edit Email
                        </button>
                        <button
                          type="button"
                          onClick={() => resendTicketsMutation.mutate(selectedBooking._id)}
                          disabled={selectedBooking.status !== BookingStatus.CONFIRMED || resendTicketsMutation.isPending}
                          className="px-3.5 py-2 text-xs font-semibold bg-accent-purple/25 hover:bg-accent-purple/40 border border-accent-purple/40 rounded-lg text-accent-purple hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {resendTicketsMutation.isPending ? 'Resending...' : 'Resend Tickets'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Authenticated booking protection warning */}
                  {selectedBooking.userId && (
                    <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-xs text-yellow-400 flex items-start gap-2.5">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                      <span className="leading-relaxed">
                        Email changes are not permitted for authenticated bookings.
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5 pt-4">
                  <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-3">Ticket Details</h4>
                  <div className="space-y-2">
                    {selectedBooking.tickets.map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <div>
                          <p className="text-white font-medium">{t.tierName}</p>
                          <p className="text-text-muted text-xs">₹{t.price.toLocaleString('en-IN')} × {t.quantity}</p>
                        </div>
                        <span className="text-white font-semibold">₹{(t.price * t.quantity).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-sm border-t border-white/5 pt-3 mt-3">
                      <span className="text-text-secondary font-medium">Grand Total</span>
                      <span className="text-accent-purple text-base font-black">₹{selectedBooking.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {selectedBooking.status === BookingStatus.CANCELLED && selectedBooking.cancellationReason && (
                  <div className="border-t border-white/5 pt-4">
                    <h4 className="text-red-400 font-medium text-xs uppercase tracking-wider mb-1">Cancellation Detail</h4>
                    <p className="text-text-secondary text-sm italic">&ldquo;{selectedBooking.cancellationReason}&rdquo;</p>
                  </div>
                )}

                {/* Audit & Operations History */}
                {selectedBooking.auditHistory && selectedBooking.auditHistory.length > 0 && (
                  <div className="border-t border-white/5 pt-4 space-y-3">
                    <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider">Audit & Operations History</h4>
                    <div className="space-y-2">
                      {selectedBooking.auditHistory.map((log, idx) => (
                        <div key={idx} className="bg-white/5 rounded-xl p-3 text-xs space-y-1.5 border border-white/5">
                          <div className="flex justify-between items-center">
                            <span className="text-accent-purple font-semibold">
                              {log.action === 'BOOKING_EMAIL_CORRECTED' ? 'Email Corrected' : 'Tickets Resent'}
                            </span>
                            <span className="text-text-muted">{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                          </div>
                          <p className="text-text-secondary">{log.description}</p>
                          {log.metadata?.reason && (
                            <p className="text-text-muted italic bg-black/20 p-1.5 rounded">
                              Reason: &ldquo;{log.metadata.reason}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Tickets & Status */}
                {selectedBooking.individualTickets && selectedBooking.individualTickets.length > 0 && (
                  <div className="border-t border-white/5 pt-4 space-y-3">
                    <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider">Individual Tickets & QR Status</h4>
                    <div className="space-y-2">
                      {selectedBooking.individualTickets.map((t, idx) => (
                        <div key={idx} className="bg-white/5 rounded-xl p-3 text-xs space-y-2 border border-white/5">
                          <div className="flex justify-between items-center">
                            <span className="text-white font-mono font-semibold">{t.ticketId}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              t.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              t.status === 'replaced' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                          
                          <div className="text-[10px] text-text-muted space-y-1">
                            <p>Created: {new Date(t.createdAt).toLocaleString('en-IN')}</p>
                            {t.replacedAt && (
                              <p>Replaced: {new Date(t.replacedAt).toLocaleString('en-IN')}</p>
                            )}
                            {t.replacedByTicketId && (
                              <p className="font-mono text-accent-purple">Replaced by: {t.replacedByTicketId}</p>
                            )}
                            {t.replacementReason && (
                              <p className="italic">Reason: {t.replacementReason}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 border-t border-white/10 pt-4">
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm text-text-secondary hover:text-white transition-colors"
                  >
                    Close
                  </button>
                  {canMutateBookings && selectedBooking.status === BookingStatus.CONFIRMED && (
                    <button
                      onClick={() => {
                        setCancelTarget(selectedBooking);
                        setSelectedBooking(null);
                      }}
                      className="px-4 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-semibold transition-colors"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Correct Email Modal */}
      <AnimatePresence>
        {isEditEmailOpen && selectedBooking && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-md w-full space-y-4"
            >
              <div>
                <h3 className="text-white font-bold text-lg">Correct Booking Email</h3>
                <p className="text-text-muted text-xs">Update recipient email for guest booking</p>
              </div>

              {editEmailError && (
                <div className="px-4 py-2.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400">
                  {editEmailError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setEditEmailError('');

                  // Basic client-side email format validation
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(editEmailValue.trim())) {
                    setEditEmailError('Please enter a valid email address.');
                    return;
                  }

                  // Reason length checks
                  const reason = editReasonValue.trim();
                  if (reason.length < 5 || reason.length > 500) {
                    setEditEmailError('Reason must be between 5 and 500 characters.');
                    return;
                  }

                  correctEmailMutation.mutate({
                    id: selectedBooking._id,
                    newEmail: editEmailValue.trim(),
                    reason,
                  });
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">Current Email</label>
                  <div className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-sm text-text-muted font-mono select-all">
                    {(selectedBooking.userId ?? selectedBooking.guestInfo)?.email ?? '—'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">New Email Address</label>
                  <input
                    type="email"
                    value={editEmailValue}
                    onChange={(e) => setEditEmailValue(e.target.value)}
                    placeholder="e.g. customer.fixed@gmail.com"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">Reason for Correction</label>
                  <textarea
                    value={editReasonValue}
                    onChange={(e) => setEditReasonValue(e.target.value)}
                    placeholder="e.g. Customer typo in domain extension (gmial.com to gmail.com)"
                    required
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors resize-none"
                  />
                  <p className="text-[10px] text-text-muted">
                    Administrative audit trails require 5 to 500 characters.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditEmailOpen(false);
                      setEditEmailError('');
                    }}
                    className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={correctEmailMutation.isPending}
                    className="flex-1 py-2.5 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all text-sm"
                  >
                    {correctEmailMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-text-muted">Loading bookings...</div>}>
      <BookingsContent />
    </Suspense>
  );
}
