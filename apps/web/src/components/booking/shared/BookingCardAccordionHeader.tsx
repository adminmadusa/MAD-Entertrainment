'use client';

import { EventCountdown } from './EventCountdown';
import { formatTicketCount } from '@/utils/booking-calculations';
import { formatDate } from '@/utils/date';
import type { BaseEventForLifecycle } from '@mad/shared';
import type { Booking, Event } from '@mad/types';

interface BookingCardAccordionHeaderProps {
  booking: Booking;
  eventInfo?: Partial<Event>;
  imageUrl?: string;
  catEmoji: string;
  isLapsed: boolean;
  showExpanded: boolean;
  downloading: boolean;
  onToggleExpand?: () => void;
  onDownload: () => void;
}

export function BookingCardAccordionHeader({
  booking,
  eventInfo,
  imageUrl,
  catEmoji,
  isLapsed,
  showExpanded,
  downloading,
  onToggleExpand,
  onDownload,
}: BookingCardAccordionHeaderProps) {
  return (
    <div
      onClick={!isLapsed ? onToggleExpand : undefined}
      className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        !isLapsed ? 'cursor-pointer' : ''
      }`}
    >
      {/* Main Info section — toggles expansion */}
      <button
        type="button"
        id={`booking-header-${booking.bookingId}`}
        onClick={(e) => {
          if (!isLapsed) {
            e.stopPropagation();
            onToggleExpand?.();
          }
        }}
        aria-expanded={showExpanded}
        aria-disabled={isLapsed}
        aria-controls={`booking-content-${booking.bookingId}`}
        className={`flex items-center gap-3.5 flex-grow min-w-0 text-left focus-visible:outline-none min-h-[44px] ${
          isLapsed ? 'cursor-default pointer-events-none' : ''
        }`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            width={96}
            height={64}
            className="w-20 h-14 sm:w-24 sm:h-16 object-cover rounded-xl border border-white/10 flex-shrink-0 shadow-sm"
          />
        ) : (
          <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-white/10 flex items-center justify-center text-xl flex-shrink-0 select-none">
            {catEmoji}
          </div>
        )}

        <div className="space-y-1 min-w-0 flex-grow">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-bold text-xs sm:text-sm leading-snug line-clamp-2">
              {eventInfo?.title || `Booking #${booking.bookingId}`}
            </h3>
          </div>
          <p className="text-text-muted text-[10px] sm:text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {eventInfo?.startDate ? (
              <span>{formatDate(eventInfo.startDate, { dateStyle: 'medium' })}</span>
            ) : (
              <span>Ref: {booking.bookingId}</span>
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

      {/* Action & Ticket count container */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
        <span className="text-text-secondary text-xs font-semibold whitespace-nowrap bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
          {formatTicketCount(booking.totalTickets)}
        </span>

        {!isLapsed ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center gap-1.5 ${
              showExpanded
                ? 'bg-accent-purple text-white shadow-glow-sm'
                : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
            }`}
          >
            <span>{showExpanded ? 'Hide Pass' : 'View Pass'}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${showExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            disabled={downloading}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white min-h-[36px] flex items-center gap-1 transition-all disabled:opacity-50"
          >
            {downloading ? '...' : 'Receipt'}
          </button>
        )}
      </div>
    </div>
  );
}
