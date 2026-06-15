import { Booking, Event } from '@mad/types';
import { getBookingStatusMeta, type BookingStatusTone } from '@mad/shared';
import { formatEventDate } from '@/utils/date';

interface BookingHeaderCardProps {
  booking: Booking;
  isFetching?: boolean;
  pollCount?: number;
}

export function BookingHeaderCard({ booking, isFetching, pollCount }: BookingHeaderCardProps) {

  const getBookingStatusStyles = (tone: BookingStatusTone) => {
    const styles: Record<BookingStatusTone, string> = {
      success: 'bg-green-500/10 text-green-400 border-green-500/30',
      warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      danger: 'bg-red-500/10 text-red-400 border-red-500/30',
      neutral: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
      refund: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    };
    return styles[tone];
  };

  const statusMeta = getBookingStatusMeta(booking.status);

  // Safe cast for populated event info
  const eventInfo = booking.eventId as unknown as Partial<Event>;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border-subtle/30">
        <div>
          <span className="text-[10px] text-text-muted font-medium tracking-wider uppercase">Event Info</span>
          <h2 className="text-white font-bold text-xl mt-0.5">
            {eventInfo?.title || 'Booking Details'}
          </h2>
          {eventInfo && (
            <p className="text-text-muted text-xs mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {eventInfo.startDate && <span>📅 {formatEventDate(eventInfo.startDate)}</span>}
              {eventInfo.showTime && <span>⏰ {eventInfo.showTime}</span>}
            </p>
          )}
          {eventInfo?.venue && (
            <span className="text-sm opacity-80 mt-1 block">
              📍 {eventInfo.venue}
            </span>
          )}
        </div>
        <div className="sm:text-right self-start sm:self-center flex items-center gap-2 justify-end">
          <div>
            <span className="text-[10px] text-text-muted font-medium tracking-wider uppercase block sm:mb-1">Status</span>
            <div className={`text-xs px-3 py-1 rounded-full border font-black inline-block ${getBookingStatusStyles(statusMeta.tone)}`}>
              {statusMeta.label}
            </div>
          </div>
          {isFetching && (pollCount === undefined || pollCount < 5) && (
            <div className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mt-4"></div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border-subtle/40 text-xs text-text-secondary">
        <div>
          <span className="text-[10px] text-text-muted uppercase block">Guest Name</span>
          <span className="text-white font-semibold">{booking.guestName}</span>
        </div>
        <div>
          <span className="text-[10px] text-text-muted uppercase block">Total Tickets</span>
          <span className="text-white font-semibold">{booking.totalTickets} Ticket(s)</span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] text-text-muted uppercase block">Reference ID</span>
          <span className="text-white font-mono font-bold select-all">{booking.bookingId}</span>
        </div>
      </div>
    </>
  );
}
