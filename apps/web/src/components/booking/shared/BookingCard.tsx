'use client';

import { BookingHeaderCard } from '@/components/booking/shared/BookingHeaderCard';
import { getBookingLifecycle, type BookingForLifecycle } from '@mad/shared';
import type { Booking, Ticket, Event } from '@mad/types';

import { getEventCategoryStyles } from './booking-card.utils';
import { BookingCardAccordionHeader } from './BookingCardAccordionHeader';
import { BookingCardExpandedContent } from './BookingCardExpandedContent';

interface BookingCardProps {
  booking: Booking;
  tickets: Ticket[];
  ticketsReady: boolean;
  isPast?: boolean;
  isTarget?: boolean;

  // Accordion Props
  collapsible?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;

  // Actions Props
  downloading: boolean;
  resending: boolean;
  resendCooldown: number;
  onDownload: () => void;
  onResend: () => void;

  // Custom context e.g. for guest lookup / token passing
  pollCount?: number;
  isFetchingSingle?: boolean;
}

export function BookingCard({
  booking,
  tickets,
  ticketsReady,
  isPast = false,
  isTarget = false,
  collapsible = false,
  isExpanded = true,
  onToggleExpand,
  downloading,
  resending,
  resendCooldown,
  onDownload,
  onResend,
  pollCount = 0,
  isFetchingSingle = false,
}: BookingCardProps) {
  const eventInfo = booking.eventId as unknown as Partial<Event>;
  const imageUrl = eventInfo?.bannerImage?.url;
  const catStyles = getEventCategoryStyles(eventInfo?.category);

  // Derive booking lifecycle state
  const lifecycle = getBookingLifecycle(booking as unknown as BookingForLifecycle);
  const isLapsed = lifecycle === 'past' || lifecycle === 'cancelled' || lifecycle === 'refunded';

  let cardStyleClasses = '';
  if (collapsible) {
    let stateBorderClass = 'border-white/5 hover:border-white/10';
    if (isExpanded && !isLapsed) {
      stateBorderClass = 'border-accent-purple shadow-glow-purple/10 bg-white/[0.02]';
    } else if (isLapsed) {
      stateBorderClass = 'border-white/5';
    }
    cardStyleClasses = `glass rounded-2xl border transition-all duration-300 overflow-hidden ${stateBorderClass} ${
      isPast ? 'opacity-85' : ''
    }`;
  } else {
    cardStyleClasses = `glass rounded-3xl border border-border-subtle p-4 sm:p-5 md:p-6 space-y-4 shadow-xl transition-all duration-300 hover:border-white/10 ${
      isTarget ? 'ring-2 ring-accent-purple/50 border-accent-purple shadow-glow-purple' : ''
    } ${isPast ? 'opacity-85' : ''}`;
  }

  const contentProps = {
    booking,
    tickets,
    ticketsReady,
    eventInfo,
    lifecycle,
    collapsible,
    pollCount,
    downloading,
    resending,
    resendCooldown,
    onDownload,
    onResend,
  };

  if (collapsible) {
    const showExpanded = isExpanded && !isLapsed;

    return (
      <div id={`booking-accordion-${booking.bookingId}`} className={cardStyleClasses}>
        <BookingCardAccordionHeader
          booking={booking}
          eventInfo={eventInfo}
          imageUrl={imageUrl}
          catEmoji={catStyles.emoji}
          isLapsed={isLapsed}
          showExpanded={showExpanded}
          downloading={downloading}
          onToggleExpand={onToggleExpand}
          onDownload={onDownload}
        />

        {showExpanded && (
          <div
            id={`booking-content-${booking.bookingId}`}
            role="region"
            aria-labelledby={`booking-header-${booking.bookingId}`}
          >
            <BookingCardExpandedContent {...contentProps} />
          </div>
        )}
      </div>
    );
  }

  // Non-collapsible clean card layout (used in guest lookups on /tickets)
  return (
    <div className={cardStyleClasses}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-[10px] text-accent-purple-light font-bold uppercase tracking-wider">
          Booking Details
        </span>
        <span className="text-[10px] text-text-muted font-mono">{booking.bookingId}</span>
      </div>
      <BookingHeaderCard booking={booking} isFetching={isFetchingSingle} pollCount={pollCount} />
      <div className="mt-5">
        <BookingCardExpandedContent {...contentProps} />
      </div>
    </div>
  );
}
