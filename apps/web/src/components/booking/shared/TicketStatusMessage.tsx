'use client';

import { BookingStatus } from '@mad/shared';

interface TicketStatusMessageProps {
  status: string;
}

export function TicketStatusMessage({ status }: TicketStatusMessageProps) {
  const messages: Record<string, string> = {
    [BookingStatus.AWAITING_PAYMENT]: 'Complete payment to receive tickets.',
    [BookingStatus.FAILED]: 'Payment was unsuccessful. Create a new booking to try again.',
    [BookingStatus.EXPIRED]: 'Reservation expired before payment completed.',
    [BookingStatus.CANCELLED]: 'This booking was cancelled.',
    [BookingStatus.REFUNDED]: 'Payment has been refunded.',
    [BookingStatus.EXPIRING]: 'We are processing this booking. Please check back shortly.',
    [BookingStatus.PENDING]: 'This booking is pending. Please check back shortly.',
  };

  return (
    <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center text-text-secondary text-sm">
      {messages[status] || 'This booking is not ready for ticket access yet.'}
    </div>
  );
}
