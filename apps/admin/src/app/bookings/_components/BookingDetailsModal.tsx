'use client';

import React, { useState } from 'react';

import { BookingStatus, getBookingStatusLabel } from '@mad/shared';
import { Modal, Button } from '@mad/ui';

import { AdminBooking } from '@/lib/api/admin/booking.service';

import { BookingAttendanceSummary } from './BookingAttendanceSummary';
import { BookingAuditHistory } from './BookingAuditHistory';
import { BookingCustomerContact } from './BookingCustomerContact';
import { BookingIndividualTickets } from './BookingIndividualTickets';
import { BookingMarketingPreferences } from './BookingMarketingPreferences';
import { BookingOverviewGrid } from './BookingOverviewGrid';
import { BookingTicketDetails } from './BookingTicketDetails';

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

export interface BookingDetailsModalProps {
  booking: AdminBooking;
  isOpen: boolean;
  onClose: () => void;
  canMutateBookings: boolean;
  onEditEmailClick: () => void;
  onResendTickets: () => void;
  isResending: boolean;
  onCancelClick: (ticketIds?: string[]) => void;
  successToast: string | null;
  errorToast: string | null;
}

export default function BookingDetailsModal({
  booking,
  isOpen,
  onClose,
  canMutateBookings,
  onEditEmailClick,
  onResendTickets,
  isResending,
  onCancelClick,
  successToast,
  errorToast,
}: BookingDetailsModalProps) {
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);

  if (!isOpen) return null;
  const customer = booking.userId ?? booking.guestInfo;
  const email = customer?.email ?? '—';
  const phone = customer?.phone || '—';

  const handleTicketToggle = (ticketId: string) => {
    setSelectedTicketIds((prev) =>
      prev.includes(ticketId) ? prev.filter((id) => id !== ticketId) : [...prev, ticketId]
    );
  };

  const handleSelectAllActive = () => {
    const activeTicketIds = (booking.individualTickets || [])
      .filter((t) => t.status === 'active')
      .map((t) => t.ticketId);
    if (selectedTicketIds.length === activeTicketIds.length) {
      setSelectedTicketIds([]);
    } else {
      setSelectedTicketIds(activeTicketIds);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy="booking-details-title"
      className="glass-strong border border-border-subtle p-6 max-w-lg overflow-y-auto max-h-[90vh] scrollbar-thin space-y-5"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <span id="booking-details-title" className="text-xs text-text-muted font-mono uppercase tracking-wider">
            Booking ID
          </span>
          <h3 className="text-white text-lg font-black font-mono mt-0.5">{booking.bookingId}</h3>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full border font-semibold ${
            STATUS_COLORS[booking.status] ?? 'text-text-muted border-border-subtle'
          }`}
        >
          {getBookingStatusLabel(booking.status)}
        </span>
      </div>

      <BookingOverviewGrid
        customerName={customer?.name}
        email={email}
        phone={phone}
        eventTitle={(booking.eventId as { title?: string })?.title}
        eventStartDate={booking.eventId?.startDate}
        mode={booking.mode}
      />

      <BookingAttendanceSummary
        attendanceStatus={booking.attendanceStatus}
        totalTickets={booking.totalTickets}
        ticketsScanned={booking.ticketsScanned}
        ticketsRemaining={booking.ticketsRemaining}
      />

      <BookingMarketingPreferences
        keepUpdated={customer?.keepUpdated}
        sendBestEvents={customer?.sendBestEvents}
      />

      {(successToast || errorToast) && (
        <div
          className={`px-4 py-2 rounded-xl text-xs ${
            successToast
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-error/10 border border-error/30 text-red-400'
          }`}
        >
          {successToast || errorToast}
        </div>
      )}

      <BookingCustomerContact
        email={email}
        isUserBooking={!!booking.userId}
        canMutateBookings={canMutateBookings}
        isConfirmed={booking.status === BookingStatus.CONFIRMED}
        isResending={isResending}
        onEditEmailClick={onEditEmailClick}
        onResendTickets={onResendTickets}
      />

      <BookingTicketDetails
        tickets={booking.tickets}
        totalAmount={booking.totalAmount}
      />

      {booking.status === BookingStatus.CANCELLED && booking.cancellationReason && (
        <div className="border-t border-white/5 pt-3">
          <h4 className="text-red-400 font-medium text-xs uppercase tracking-wider mb-0.5">Cancellation Detail</h4>
          <p className="text-text-secondary text-xs italic">&ldquo;{booking.cancellationReason}&rdquo;</p>
        </div>
      )}

      <BookingAuditHistory auditHistory={booking.auditHistory} />

      <BookingIndividualTickets
        tickets={booking.individualTickets || []}
        selectedTicketIds={selectedTicketIds}
        canMutateBookings={canMutateBookings}
        isConfirmed={booking.status === BookingStatus.CONFIRMED}
        onTicketToggle={handleTicketToggle}
        onSelectAllActive={handleSelectAllActive}
      />

      <div className="flex gap-2.5 border-t border-white/10 pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="flex-1 py-2 rounded-xl text-xs"
        >
          Close
        </Button>
        {canMutateBookings && booking.status === BookingStatus.CONFIRMED && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => {
              if (selectedTicketIds.length > 0) {
                onCancelClick(selectedTicketIds);
              } else {
                onCancelClick();
              }
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
              selectedTicketIds.length > 0
                ? 'bg-yellow-500/80 hover:bg-yellow-500 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                : 'shadow-[0_0_15px_rgba(239,68,68,0.3)]'
            }`}
          >
            {selectedTicketIds.length > 0 ? `Cancel ${selectedTicketIds.length} Selected Tickets` : 'Cancel Entire Booking'}
          </Button>
        )}
      </div>
    </Modal>
  );
}
