'use client';

import dynamic from 'next/dynamic';
import { TicketSummaryItem } from '@/components/booking/shared/TicketSummaryItem';
import { BookingStatus } from '@mad/shared';
import type { Booking, Ticket, Event } from '@mad/types';

import { BookingDetailsGrid } from './BookingDetailsGrid';
import { PaymentRecoveryBanner } from './PaymentRecoveryBanner';
import { TicketStatusMessage } from './TicketStatusMessage';
import { BookingCardQuickActions } from './BookingCardQuickActions';

const EntryPassGrid = dynamic(
  () => import('@/components/booking/shared/EntryPassGrid').then((mod) => mod.EntryPassGrid),
  { ssr: false }
);

interface BookingCardExpandedContentProps {
  booking: Booking;
  tickets: Ticket[];
  ticketsReady: boolean;
  eventInfo?: Partial<Event>;
  lifecycle: string;
  collapsible?: boolean;
  pollCount?: number;
  downloading: boolean;
  resending: boolean;
  resendCooldown: number;
  onDownload: () => void;
  onResend: () => void;
}

export function BookingCardExpandedContent({
  booking,
  tickets,
  ticketsReady,
  eventInfo,
  lifecycle,
  collapsible,
  pollCount = 0,
  downloading,
  resending,
  resendCooldown,
  onDownload,
  onResend,
}: BookingCardExpandedContentProps) {
  const renderTicketsOrStatus = () => {
    if (booking.status === BookingStatus.CONFIRMED) {
      const pollsExhausted = pollCount >= 5;

      if (!ticketsReady) {
        return (
          <div className="space-y-3 pt-3 border-t border-border-subtle/30">
            {pollsExhausted ? (
              <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center text-text-secondary text-sm">
                Your tickets are being processed and will appear in your email shortly.
              </div>
            ) : (
              <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-accent-purple-light text-sm font-semibold">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Generating your tickets...
                </div>
                <p className="text-text-muted text-xs">
                  This usually takes a few seconds. Your tickets will appear here automatically.
                </p>
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="space-y-4 pt-3 border-t border-border-subtle/30">
          <EntryPassGrid tickets={tickets} />
        </div>
      );
    }

    if (booking.status === BookingStatus.AWAITING_PAYMENT) {
      return (
        <div className="space-y-4">
          <PaymentRecoveryBanner booking={booking} />
          <TicketStatusMessage status={booking.status} />
        </div>
      );
    }

    return <TicketStatusMessage status={booking.status} />;
  };

  return (
    <div
      className={
        collapsible
          ? 'px-4 pb-5 pt-2 sm:px-5 border-t border-white/5 space-y-4 animate-in fade-in duration-200'
          : 'space-y-4'
      }
    >
      {renderTicketsOrStatus()}

      {booking.status === BookingStatus.CONFIRMED && booking.tickets && booking.tickets.length > 0 && (
        <div className="pt-4 border-t border-white/5 space-y-2">
          <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">
            Your Tickets
          </span>
          <div className="space-y-1">
            {booking.tickets.map((t, index) => (
              <TicketSummaryItem key={index} tierName={t.tierName} quantity={t.quantity} />
            ))}
          </div>
        </div>
      )}

      {/* Metadata Details Grid */}
      <BookingDetailsGrid booking={booking} eventInfo={eventInfo} />

      {/* Action Toolbar */}
      <BookingCardQuickActions
        lifecycle={lifecycle}
        eventInfo={eventInfo}
        downloading={downloading}
        resending={resending}
        resendCooldown={resendCooldown}
        onDownload={onDownload}
        onResend={onResend}
      />
    </div>
  );
}
