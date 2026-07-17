'use client';

import { formatDate, formatDateTime } from '@/utils/date';
import type { Booking, Event } from '@mad/types';

interface BookingDetailsGridProps {
  booking: Booking;
  eventInfo: Partial<Event> | null;
}

export function BookingDetailsGrid({ booking, eventInfo }: BookingDetailsGridProps) {
  return (
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
  );
}
