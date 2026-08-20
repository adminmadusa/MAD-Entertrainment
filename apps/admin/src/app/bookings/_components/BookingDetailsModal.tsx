'use client';

import React, { useState } from 'react';

import { BookingStatus, getBookingStatusLabel } from '@mad/shared';
import { Modal } from '@mad/ui';
import { formatEventDate } from '@mad/utils';

import { AdminBooking } from '@/lib/api/admin/booking.service';

import { BookingAttendanceSummary } from './BookingAttendanceSummary';
import { BookingAuditHistory } from './BookingAuditHistory';
import { BookingIndividualTickets } from './BookingIndividualTickets';

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
  const keepUpdated = customer?.keepUpdated ? 'Yes' : 'No';
  const sendBestEvents = customer?.sendBestEvents ? 'Yes' : 'No';

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

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">Customer Info</h4>
          <p className="text-white font-semibold">{customer?.name ?? '—'}</p>
          <p className="text-text-secondary text-xs mt-0.5">{email}</p>
          <p className="text-text-secondary text-xs">{phone}</p>
        </div>
        <div>
          <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">Event</h4>
          <p className="text-white font-semibold">{(booking.eventId as { title?: string })?.title ?? '—'}</p>
          <p className="text-text-secondary text-xs mt-0.5">
            {booking.eventId?.startDate ? formatEventDate(booking.eventId.startDate) : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm border-t border-white/5 pt-3">
        <div>
          <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">Booking Mode</h4>
          <p className="text-white font-medium capitalize">{booking.mode?.replace('_', ' ')}</p>
        </div>
      </div>

      <BookingAttendanceSummary
        attendanceStatus={booking.attendanceStatus}
        totalTickets={booking.totalTickets}
        ticketsScanned={booking.ticketsScanned}
        ticketsRemaining={booking.ticketsRemaining}
      />

      <div className="border-t border-white/5 pt-3 space-y-1.5">
        <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">Marketing Preferences</h4>
        <div className="flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-2.5">
          <span className="text-text-secondary">Keep updated about event updates</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${
              customer?.keepUpdated
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-white/5 text-text-muted border border-white/10'
            }`}
          >
            {keepUpdated}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-2.5">
          <span className="text-text-secondary">Receive details on best events</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${
              customer?.sendBestEvents
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-white/5 text-text-muted border border-white/10'
            }`}
          >
            {sendBestEvents}
          </span>
        </div>
      </div>

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

      <div className="border-t border-white/5 pt-3 space-y-2.5">
        <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider">Customer Contact</h4>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white/5 rounded-xl p-3.5">
          <div>
            <span className="text-text-muted text-[10px] uppercase tracking-wider block">Current Email</span>
            <span className="text-white font-semibold font-mono text-xs select-all">{email}</span>
          </div>
          {canMutateBookings && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={onEditEmailClick}
                disabled={!!booking.userId}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  booking.userId
                    ? 'bg-white/5 border-white/10 text-text-muted cursor-not-allowed opacity-50'
                    : 'glass border-border-subtle text-text-secondary hover:text-white hover:border-accent-purple/50'
                }`}
              >
                Edit Email
              </button>
              <button
                type="button"
                onClick={onResendTickets}
                disabled={booking.status !== BookingStatus.CONFIRMED || isResending}
                className="px-3 py-1.5 text-xs font-semibold bg-accent-purple/25 hover:bg-accent-purple/40 border border-accent-purple/40 rounded-lg text-accent-purple hover:text-white disabled:opacity-50 transition-all"
              >
                {isResending ? 'Resending...' : 'Resend Tickets'}
              </button>
            </div>
          )}
        </div>
        {booking.userId && (
          <div className="px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-[11px] text-yellow-400 flex items-start gap-2">
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Email changes are not permitted for authenticated bookings.</span>
          </div>
        )}
      </div>

      <div className="border-t border-white/5 pt-3">
        <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-2">Ticket Details</h4>
        <div className="space-y-1.5">
          {booking.tickets.map((t, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs">
              <div>
                <p className="text-white font-medium">{t.tierName}</p>
                <p className="text-text-muted text-[10px]">₹{t.price.toLocaleString('en-IN')} × {t.quantity}</p>
              </div>
              <span className="text-white font-semibold">₹{(t.price * t.quantity).toLocaleString('en-IN')}</span>
            </div>
          ))}
          <div className="flex justify-between items-center text-sm border-t border-white/5 pt-2 mt-2">
            <span className="text-text-secondary font-medium">Grand Total</span>
            <span className="text-accent-purple text-sm font-black">₹{booking.totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

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
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 glass border border-border-subtle rounded-xl text-xs text-text-secondary hover:text-white transition-colors"
        >
          Close
        </button>
        {canMutateBookings && booking.status === BookingStatus.CONFIRMED && (
          <button
            type="button"
            onClick={() => {
              if (selectedTicketIds.length > 0) {
                onCancelClick(selectedTicketIds);
              } else {
                onCancelClick();
              }
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all ${
              selectedTicketIds.length > 0
                ? 'bg-yellow-500/80 hover:bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                : 'bg-error/80 hover:bg-error shadow-[0_0_15px_rgba(239,68,68,0.3)]'
            }`}
          >
            {selectedTicketIds.length > 0 ? `Cancel ${selectedTicketIds.length} Selected Tickets` : 'Cancel Entire Booking'}
          </button>
        )}
      </div>
    </Modal>
  );
}
