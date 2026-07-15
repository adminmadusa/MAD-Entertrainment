'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, useMemo } from 'react';

import BookingsSummaryWidget from '@/components/bookings/BookingsSummaryWidget';
import { adminGetBookings, adminCancelBooking, adminCorrectBookingEmail, adminResendBookingTickets, adminGetBookingsSummary, type AdminBooking, } from '@/lib/api/admin/booking.service';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { BookingStatus, AdminRole } from '@mad/shared';
import { ErrorState, LoadingState } from '@mad/ui';

import BookingDetailsModal from './_components/BookingDetailsModal';
import BookingFilters from './_components/BookingFilters';
import BookingsTable from './_components/BookingsTable';
import CancelBookingModal from './_components/CancelBookingModal';
import CorrectEmailModal from './_components/CorrectEmailModal';

const BOOKING_STATUS_FILTERS = [
  BookingStatus.AWAITING_PAYMENT,
  BookingStatus.CONFIRMED,
  BookingStatus.FAILED,
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.EXPIRED,
  BookingStatus.EXPIRING,
];

function BookingsContent() {
  const { admin } = useAdminAuth();
  const qc = useQueryClient();
  const searchParams = useSearchParams();

  // Coordinates & Selection States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdminBooking | null>(null);
  const [sortField, setSortField] = useState<'bookingId' | 'totalAmount' | 'createdAt' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal Control & Alerts
  const [isEditEmailOpen, setIsEditEmailOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const canMutateBookings = !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT].includes(admin.role as AdminRole);

  useEffect(() => {
    const querySearch = searchParams.get('search') || searchParams.get('ref');
    if (querySearch) setSearch(querySearch);
  }, [searchParams]);

  // Combined feedback auto-dismiss timer
  useEffect(() => {
    const sTimer = successToast ? setTimeout(() => setSuccessToast(null), 4000) : null;
    const eTimer = errorToast ? setTimeout(() => setErrorToast(null), 4000) : null;
    return () => {
      if (sTimer) clearTimeout(sTimer);
      if (eTimer) clearTimeout(eTimer);
    };
  }, [successToast, errorToast]);

  // Queries
  const { data: eventsData } = useQuery({
    queryKey: ['admin-events', { status: 'published' }],
    queryFn: () => adminGetEvents({ limit: 100 }),
  });
  const events = eventsData?.items || [];

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-bookings', { page, search, status: statusFilter, eventId: eventFilter, sortField, sortOrder }],
    queryFn: () => adminGetBookings({ 
      page, 
      limit: 15, 
      ...(search && { search }), 
      ...(statusFilter && { status: statusFilter }), 
      ...(eventFilter && { eventId: eventFilter }),
      ...(sortField && { sortField }),
      ...(sortOrder && { sortOrder })
    }),
  });

  const { data: summary, isLoading: isSummaryLoading, isError: isSummaryError } = useQuery({
    queryKey: ['admin-bookings-summary', eventFilter],
    queryFn: () => adminGetBookingsSummary(eventFilter),
    staleTime: 60000,
  });

  // Mutations
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminCancelBooking(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      setCancelTarget(null);
    },
  });

  const correctEmailMutation = useMutation({
    mutationFn: ({ id, newEmail, reason }: { id: string; newEmail: string; reason: string }) => adminCorrectBookingEmail(id, newEmail, reason),
    onSuccess: (updatedBooking) => {
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      setSelectedBooking(updatedBooking);
      setIsEditEmailOpen(false);
      setSuccessToast('Booking email corrected successfully');
    },
  });

  const resendTicketsMutation = useMutation({
    mutationFn: (id: string) => adminResendBookingTickets(id),
    onSuccess: () => setSuccessToast('Tickets enqueued for resend successfully'),
    onError: (err: any) => setErrorToast(err.response?.data?.message || 'Failed to resend tickets'),
  });

  const bookings = useMemo(() => data?.items ?? [], [data?.items]);
  const pagination = data?.pagination;

  useEffect(() => {
    if (search && bookings.length === 1 && !selectedBooking) {
      setSelectedBooking(bookings[0]);
    }
  }, [bookings, search, selectedBooking]);

  const handleCorrectEmailSubmit = async (newEmail: string, reason: string) => {
    await correctEmailMutation.mutateAsync({ id: selectedBooking!._id, newEmail, reason });
  };

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load bookings.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Bookings</h1>
          <p className="text-text-muted text-sm mt-0.5">{pagination?.total ?? 0} total bookings</p>
        </div>
      </div>

      <BookingFilters
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        eventFilter={eventFilter}
        onEventFilterChange={(val) => { setEventFilter(val); setPage(1); }}
        events={events}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => { setStatusFilter(val); setPage(1); }}
        bookingStatusFilters={BOOKING_STATUS_FILTERS}
        bookings={bookings}
      />

      {isSummaryError && (
        <div className="text-red-400 text-xs font-semibold flex items-center gap-1.5 px-1 animate-pulse">
          <span>⚠️</span>
          <span>Failed to refresh summary metrics</span>
        </div>
      )}

      <BookingsSummaryWidget {...(summary ?? { totalBookings: 0, totalTickets: 0, revenue: 0, confirmed: 0, pending: 0, cancelled: 0, checkedIn: 0 })} isLoading={isSummaryLoading} />

      <BookingsTable
        bookings={bookings}
        isLoading={isLoading}
        canMutateBookings={canMutateBookings}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={(field) => {
          if (sortField === field) setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
          else { setSortField(field); setSortOrder('asc'); }
        }}
        onRowClick={setSelectedBooking}
        onCancelClick={setCancelTarget}
        pagination={pagination}
        onPageChange={setPage}
        currentPage={page}
      />

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelTarget && (
          <CancelBookingModal
            key={cancelTarget._id}
            booking={cancelTarget}
            isOpen={!!cancelTarget}
            onClose={() => setCancelTarget(null)}
            onSubmit={(reason) => cancelMutation.mutate({ id: cancelTarget._id, reason })}
            isPending={cancelMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailsModal
            key={selectedBooking._id}
            booking={selectedBooking}
            isOpen={!!selectedBooking}
            onClose={() => setSelectedBooking(null)}
            canMutateBookings={canMutateBookings}
            onEditEmailClick={() => setIsEditEmailOpen(true)}
            onResendTickets={() => resendTicketsMutation.mutate(selectedBooking._id)}
            isResending={resendTicketsMutation.isPending}
            onCancelClick={() => { setCancelTarget(selectedBooking); setSelectedBooking(null); }}
            successToast={successToast}
            errorToast={errorToast}
          />
        )}
      </AnimatePresence>

      {/* Correct Email Modal */}
      <AnimatePresence>
        {isEditEmailOpen && selectedBooking && (
          <CorrectEmailModal
            key={selectedBooking._id}
            booking={selectedBooking}
            isOpen={isEditEmailOpen}
            onClose={() => setIsEditEmailOpen(false)}
            onSubmit={handleCorrectEmailSubmit}
            isPending={correctEmailMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading bookings..." />}>
      <BookingsContent />
    </Suspense>
  );
}
