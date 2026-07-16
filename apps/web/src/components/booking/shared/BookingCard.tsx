'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

import { BookingHeaderCard } from '@/components/booking/shared/BookingHeaderCard';
import { useCountdown } from '@/hooks/use-countdown.hook';
import { formatDate, formatDateTime } from '@/utils/date';
import { BookingStatus, getBookingLifecycle, buildVenueMapLink, type BookingForLifecycle, type BaseEventForLifecycle } from '@mad/shared';
import type { Booking, Ticket, Event } from '@mad/types';

import { EventCountdown } from './EventCountdown';

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
    cardStyleClasses = `glass rounded-2xl border transition-all duration-300 overflow-hidden ${stateBorderClass} ${isPast ? 'opacity-85' : ''}`;
  } else {
    cardStyleClasses = `glass rounded-3xl border border-border-subtle p-4 sm:p-5 md:p-6 space-y-4 shadow-xl transition-all duration-300 hover:border-white/10 ${
      isTarget ? 'ring-2 ring-accent-purple/50 border-accent-purple shadow-glow-purple' : ''
    } ${isPast ? 'opacity-85' : ''}`;
  }

  // Context-aware Quick Actions
  const renderQuickActions = () => {
    if (lifecycle === 'upcoming' || lifecycle === 'live') {
      let resendContent;
      if (resending) {
        resendContent = <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
      } else if (resendCooldown > 0) {
        resendContent = <span className="font-mono">{resendCooldown}s</span>;
      } else {
        resendContent = (
          <>
            <span>📩</span>
            <span className="hidden sm:inline">Resend Tickets</span>
          </>
        );
      }

      return (
        <>
          {eventInfo?.venue && (
            <a
              href={buildVenueMapLink(eventInfo.venue)}
              target="_blank"
              rel="noopener noreferrer"
              title="Get Directions"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs min-h-[36px] transition-all font-bold"
            >
              <span>📍</span>
              <span className="hidden sm:inline">Location</span>
            </a>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            disabled={downloading}
            title="Download PDF"
            className="px-3 py-1.5 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs min-h-[36px] transition-all disabled:opacity-50 font-bold"
          >
            {downloading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>📥</span>
                <span className="hidden sm:inline">Download PDF</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onResend();
            }}
            disabled={resending || resendCooldown > 0}
            title="Resend Tickets"
            className="px-3 py-1.5 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs min-h-[36px] transition-all disabled:opacity-50 font-bold"
          >
            {resendContent}
          </button>
        </>
      );
    }

    if (lifecycle === 'past') {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          disabled={downloading}
          className="px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white min-h-[36px] flex items-center justify-center transition-all disabled:opacity-50"
        >
          {downloading ? '...' : 'Receipt'}
        </button>
      );
    }

    // Cancelled / Refunded
    return (
      <a
        href="mailto:support@mad-entertainment.com"
        onClick={(e) => e.stopPropagation()}
        className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg border min-h-[36px] flex items-center justify-center transition-all ${
          lifecycle === 'cancelled'
            ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400'
            : 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-300'
        }`}
      >
        Support
      </a>
    );
  };

  const renderContent = () => {
    return (
      <div className={collapsible ? 'px-4 pb-5 pt-2 sm:px-5 border-t border-white/5 space-y-4 animate-in fade-in duration-200' : 'space-y-4'}>
        {(() => {
          if (booking.status === BookingStatus.CONFIRMED) {
            const pollsExhausted = pollCount >= 5;

            if (!ticketsReady) {
              return (
                <div className="space-y-3 pt-3 border-t border-border-subtle/30">
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
              <div className="space-y-4 pt-3 border-t border-border-subtle/30">
                <div className="pb-2">
                  <h3 className="text-white font-bold text-sm">Entry Passes</h3>
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
          {eventInfo?.showTime && eventInfo.showTime !== 'N/A' && (
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider block">Show Time</span>
              <span className="text-white font-semibold">{eventInfo.showTime}</span>
            </div>
          )}
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
            <span className="text-white font-semibold">{booking.totalTickets} Passes</span>
          </div>
        </div>
      </div>
    );
  };

  if (collapsible) {
    const showExpanded = isExpanded && !isLapsed;

    return (
      <div id={`booking-accordion-${booking.bookingId}`} className={cardStyleClasses}>
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Main Info section — toggles expansion */}
          <button
            type="button"
            id={`booking-header-${booking.bookingId}`}
            onClick={!isLapsed ? onToggleExpand : undefined}
            aria-expanded={showExpanded}
            aria-disabled={isLapsed}
            aria-controls={`booking-content-${booking.bookingId}`}
            className={`flex items-center gap-3 flex-grow min-w-0 text-left focus-visible:outline-none min-h-[44px] ${
              isLapsed ? 'cursor-default pointer-events-none' : ''
            }`}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border border-white/10 flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border flex items-center justify-center text-lg sm:text-xl flex-shrink-0 select-none">
                {catStyles.emoji}
              </div>
            )}

            <div className="space-y-0.5 min-w-0 flex-grow">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-xs sm:text-sm leading-snug truncate">
                  {eventInfo?.title || 'Booking Details'}
                </h3>
              </div>
              <p className="text-text-muted text-[10px] sm:text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {eventInfo?.startDate && (
                  <span>{formatDate(eventInfo.startDate, { dateStyle: 'medium' })}</span>
                )}
                {eventInfo?.venue && (
                  <span className="truncate max-w-[120px] sm:max-w-none">| {eventInfo.venue}</span>
                )}
                {eventInfo && (
                  <>
                    <span className="text-white/20">|</span>
                    <EventCountdown event={eventInfo as unknown as BaseEventForLifecycle} />
                  </>
                )}
              </p>
            </div>
          </button>

          {/* Quick Actions & Pass count container */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 ml-2">
            <span className="text-text-secondary text-xs font-semibold whitespace-nowrap bg-white/5 px-2.5 py-1.5 rounded-lg">
              {booking.totalTickets} {booking.totalTickets === 1 ? 'Pass' : 'Passes'}
            </span>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              {renderQuickActions()}
            </div>

            {!isLapsed && (
              <button
                type="button"
                onClick={onToggleExpand}
                aria-label={isExpanded ? 'Collapse Details' : 'Expand Details'}
                className="text-text-secondary text-xs transition-transform duration-300 w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 min-w-[36px] min-h-[36px]"
                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
              >
                ▼
              </button>
            )}
          </div>
        </div>

        {showExpanded && (
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
      <div className="mt-5">
        {renderContent()}
      </div>
    </div>
  );
}
