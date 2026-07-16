'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

import { BookingHeaderCard } from '@/components/booking/shared/BookingHeaderCard';
import { TicketActions } from '@/components/booking/shared/TicketActions';
import { useCountdown } from '@/hooks/use-countdown.hook';
import { formatDate, formatDateTime } from '@/utils/date';
import { BookingStatus } from '@mad/shared';
import type { Booking, Ticket, Event } from '@mad/types';
import { formatTicketCount } from '@/utils/booking-calculations';
import { TicketSummaryItem } from '@/components/booking/shared/TicketSummaryItem';

const EntryPassGrid = dynamic(() => import('@/components/booking/shared/EntryPassGrid').then(mod => mod.EntryPassGrid), {
  ssr: false,
});

const getEventCategoryStyles = (category?: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('music') || cat.includes('concert') || cat.includes('club')) {
    return {
      emoji: '🎵',
      gradient: 'from-purple-900 to-indigo-950 border-purple-500/20'
    };
  }
  if (cat.includes('sport') || cat.includes('game') || cat.includes('match')) {
    return {
      emoji: '⚽',
      gradient: 'from-emerald-900 to-teal-950 border-emerald-500/20'
    };
  }
  if (cat.includes('theater') || cat.includes('comedy') || cat.includes('show') || cat.includes('play')) {
    return {
      emoji: '🎭',
      gradient: 'from-rose-900 to-red-950 border-rose-500/20'
    };
  }
  return {
    emoji: '🎟️',
    gradient: 'from-slate-800 to-slate-950 border-slate-700/20'
  };
};

function PaymentRecoveryBanner({ booking }: { booking: Booking }) {
  const countdown = useCountdown(booking.logicalExpiresAt || booking.expiresAt);
  if (countdown.isExpired) return null;

  return (
    <div className="glass rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="space-y-1 text-center sm:text-left">
        <h3 className="text-amber-400 font-bold text-base flex items-center gap-2 justify-center sm:justify-start">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Complete Your Payment
        </h3>
        <p className="text-text-secondary text-xs max-w-md">
          Your seats are temporarily reserved. Complete your payment to confirm this booking. Reservation expires in <span className="font-mono font-bold text-amber-300">{countdown.minutes}:{String(countdown.seconds).padStart(2, '0')}</span>.
        </p>
      </div>
      <div className="flex flex-col w-full sm:w-auto gap-3 shrink-0">
        <Link href={`/checkout/${booking.bookingId}`} className="px-6 py-2.5 rounded-xl btn-gradient text-white font-bold text-sm shadow-glow-sm hover:scale-[1.02] active:scale-[0.98] transition-all text-center">
          Complete Payment
        </Link>
        <a href="mailto:support@mad-entertainment.com" className="px-6 py-2.5 rounded-xl border border-white/10 text-white/80 hover:bg-white/5 font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all text-center">
          Contact Support
        </a>
      </div>
    </div>
  );
}

function TicketStatusMessage({ status }: { status: string }) {
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

  const cardStyleClasses = collapsible
    ? `glass rounded-2xl border transition-all duration-300 overflow-hidden ${
        isExpanded
          ? 'border-accent-purple shadow-glow-purple/10 bg-white/[0.02]'
          : 'border-white/5 hover:border-white/10'
      } ${isPast ? 'opacity-75' : ''}`
    : `glass rounded-3xl border border-border-subtle p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-xl transition-all duration-300 hover:border-white/10 ${
        isTarget ? 'ring-2 ring-accent-purple/50 border-accent-purple shadow-glow-purple' : ''
      } ${isPast ? 'opacity-85' : ''}`;

  const renderContent = () => {
    return (
      <div className={collapsible ? 'px-4 pb-6 pt-2 sm:px-5 border-t border-white/5 space-y-5 animate-in fade-in duration-200' : 'space-y-4 sm:space-y-6'}>
        {(() => {
          if (booking.status === BookingStatus.CONFIRMED) {
            const pollsExhausted = pollCount >= 5;

            if (!ticketsReady) {
              return (
                <div className="space-y-3 pt-4 border-t border-border-subtle/30">
                  <h3 className="text-white font-bold text-sm">Entry Passes</h3>
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
                      <p className="text-text-muted text-xs">This usually takes a few seconds. Your entry passes will appear here automatically.</p>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div className="space-y-4 pt-4 border-t border-border-subtle/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
                  <h3 className="text-white font-bold text-sm">Entry Passes</h3>
                  <TicketActions
                    downloading={downloading}
                    resending={resending}
                    cooldown={resendCooldown}
                    onDownload={onDownload}
                    onResend={onResend}
                  />
                </div>
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
        })()}

        {booking.status === BookingStatus.CONFIRMED && booking.tickets && booking.tickets.length > 0 && (
          <div className="pt-4 border-t border-white/5 space-y-2">
            <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">Your Tickets</span>
            <div className="space-y-1">
              {booking.tickets.map((t, index) => (
                <TicketSummaryItem
                  key={index}
                  tierName={t.tierName}
                  quantity={t.quantity}
                />
              ))}
            </div>
          </div>
        )}

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5 text-xs text-text-secondary">
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider block">Guest Name</span>
            <span className="text-white font-semibold">{booking.guestName || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider block">Venue</span>
            <span className="text-white font-semibold">{eventInfo?.venue || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider block">Show Time</span>
            <span className="text-white font-semibold">{eventInfo?.showTime || 'N/A'}</span>
          </div>
          {booking.createdAt && (
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider block">Purchased On</span>
              <span className="text-white font-semibold font-sans">
                {formatDate(booking.createdAt, { dateStyle: 'medium' })} {formatDateTime(booking.createdAt, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider block">Total Tickets</span>
            <span className="text-white font-semibold">{formatTicketCount(booking.totalTickets)}</span>
          </div>
        </div>
      </div>
    );
  };

  if (collapsible) {
    return (
      <div id={`booking-accordion-${booking.bookingId}`} className={cardStyleClasses}>
        <button
          type="button"
          id={`booking-header-${booking.bookingId}`}
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          aria-controls={`booking-content-${booking.bookingId}`}
          className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 focus-ring rounded-2xl min-h-[44px]"
        >
          <div className="flex items-center gap-3 sm:gap-4 flex-grow min-w-0">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border border-white/10 flex-shrink-0"
              />
            ) : (
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${catStyles.gradient} border flex items-center justify-center text-lg sm:text-xl flex-shrink-0 select-none`}>
                {catStyles.emoji}
              </div>
            )}

            <div className="space-y-1 min-w-0 flex-grow">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-sm sm:text-base leading-snug truncate">
                  {eventInfo?.title || 'Booking Details'}
                </h3>
                {booking.status !== BookingStatus.CONFIRMED && (
                  <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                    [BookingStatus.CANCELLED, BookingStatus.REFUNDED].includes(booking.status as BookingStatus)
                      ? 'border-red-500/30 text-red-400 bg-red-500/10'
                      : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                  }`}>
                    {booking.status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-text-muted text-[11px] sm:text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {eventInfo?.startDate && (
                  <span>Event Date: {formatDate(eventInfo.startDate, { dateStyle: 'medium' })}</span>
                )}
                {eventInfo?.venue && (
                  <span className="truncate max-w-[150px] sm:max-w-none">| {eventInfo.venue}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
            <span className="text-text-secondary text-xs font-semibold whitespace-nowrap bg-white/5 px-2.5 py-1 rounded-lg">
              {formatTicketCount(booking.totalTickets)}
            </span>
            <span
              className="text-text-secondary text-xs transition-transform duration-300 w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
            >
              ▼
            </span>
          </div>
        </button>

        {isExpanded && (
          <div id={`booking-content-${booking.bookingId}`} role="region" aria-labelledby={`booking-header-${booking.bookingId}`}>
            {renderContent()}
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
      <div className="mt-6">
        {renderContent()}
      </div>
    </div>
  );
}
