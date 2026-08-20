import React, { useMemo } from 'react';

import { FormField } from '@mad/ui';

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/50 transition-colors';

const labelCls = 'text-xs text-text-secondary mt-1.5 block';

export interface EventScheduleCardProps {
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  bookingStartDate: string;
  setBookingStartDate: (val: string) => void;
  bookingEndDate: string;
  setBookingEndDate: (val: string) => void;
}

const formatFriendlyDate = (dateStr: string) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch (_e) {
    return '—';
  }
};

export const EventScheduleCard = React.memo(function EventScheduleCard({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  bookingStartDate,
  setBookingStartDate,
  bookingEndDate,
  setBookingEndDate,
}: EventScheduleCardProps) {
  // Real-time validation
  const errors = useMemo(() => {
    const list: string[] = [];
    if (!startDate) return list;

    const start = new Date(startDate).getTime();
    const end = endDate ? new Date(endDate).getTime() : null;
    const bookStart = bookingStartDate ? new Date(bookingStartDate).getTime() : null;
    const bookEnd = bookingEndDate ? new Date(bookingEndDate).getTime() : null;

    if (end && end <= start) {
      list.push('Event end date must be after event start date.');
    }
    if (bookStart && bookEnd && bookEnd <= bookStart) {
      list.push('Booking close date must be after booking open date.');
    }
    if (bookStart && bookStart >= start) {
      list.push('Booking open date must be before event start date.');
    }
    if (bookEnd && bookEnd > start) {
      list.push('Booking close date must be before or equal to event start date.');
    }

    return list;
  }, [startDate, endDate, bookingStartDate, bookingEndDate]);

  // Durations
  const eventDuration = useMemo(() => {
    if (!startDate || !endDate) return null;
    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (diffMs <= 0) return null;
    const hours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
    return hours >= 24 ? `${Math.round(hours / 24)} days` : `${hours} hours`;
  }, [startDate, endDate]);

  const bookingDuration = useMemo(() => {
    if (!bookingStartDate || !bookingEndDate) return null;
    const diffMs = new Date(bookingEndDate).getTime() - new Date(bookingStartDate).getTime();
    if (diffMs <= 0) return null;
    const days = Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10;
    return days >= 1 ? `${days} days` : `${Math.round(diffMs / (1000 * 60 * 60))} hours`;
  }, [bookingStartDate, bookingEndDate]);

  // Computed status preview
  const statusPreview = useMemo(() => {
    if (!startDate) return 'Draft';
    const now = Date.now();
    const start = new Date(startDate).getTime();
    const end = endDate ? new Date(endDate).getTime() : null;
    const bookStart = bookingStartDate ? new Date(bookingStartDate).getTime() : null;
    const bookEnd = bookingEndDate ? new Date(bookingEndDate).getTime() : null;

    if (end && now > end) {
      return 'Completed';
    }
    if (now >= start) {
      return 'Live';
    }
    if (bookEnd && now >= bookEnd) {
      return 'Booking Closed';
    }
    if (bookStart && now >= bookStart) {
      return 'On Sale';
    }
    return 'Upcoming';
  }, [startDate, endDate, bookingStartDate, bookingEndDate]);

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">📅 Event Schedule</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Live Preview:</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                statusPreview === 'Completed'
                  ? 'bg-neutral-800 text-neutral-400'
                  : statusPreview === 'Live'
                  ? 'bg-green-500/10 text-green-400'
                  : statusPreview === 'On Sale'
                  ? 'bg-purple-500/10 text-purple-400'
                  : 'bg-blue-500/10 text-blue-400'
              }`}
            >
              {statusPreview}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Event Starts *">
            <input
              id="event-start-date"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className={inputCls}
            />
            <span className={labelCls}>The date and time when your event begins.</span>
          </FormField>
          <FormField label="Event Ends">
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
            <span className={labelCls}>The date and time when your event finishes.</span>
          </FormField>
        </div>
      </div>

      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
        <h2 className="text-white font-semibold">🎟 Ticket Booking</h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Booking Opens">
            <input
              type="datetime-local"
              value={bookingStartDate}
              onChange={(e) => setBookingStartDate(e.target.value)}
              className={inputCls}
            />
            <span className={labelCls}>When tickets become available for booking.</span>
          </FormField>
          <FormField label="Booking Closes">
            <input
              type="datetime-local"
              value={bookingEndDate}
              onChange={(e) => setBookingEndDate(e.target.value)}
              className={inputCls}
            />
            <span className={labelCls}>When ticket booking closes.</span>
          </FormField>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-xl space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-400 flex items-center gap-1.5">
              <span>⚠️</span> {err}
            </p>
          ))}
        </div>
      )}

      {startDate && (
        <div className="p-5 border border-border-subtle rounded-xl bg-surface/50 grid grid-cols-2 gap-4 text-xs">
          <div>
            <h4 className="text-text-secondary font-medium mb-2 uppercase tracking-wider">Event Info</h4>
            <p className="text-white text-sm font-semibold">{formatFriendlyDate(startDate)}</p>
            {endDate && (
              <>
                <p className="text-text-secondary my-1">to</p>
                <p className="text-white text-sm font-semibold">{formatFriendlyDate(endDate)}</p>
              </>
            )}
            {eventDuration && <p className="text-accent-purple mt-2 font-medium">Duration: {eventDuration}</p>}
          </div>
          <div>
            <h4 className="text-text-secondary font-medium mb-2 uppercase tracking-wider">Booking Info</h4>
            {bookingStartDate ? (
              <p className="text-white text-sm font-semibold">{formatFriendlyDate(bookingStartDate)}</p>
            ) : (
              <p className="text-text-secondary italic">Opens immediately on publish</p>
            )}
            <p className="text-text-secondary my-1">to</p>
            {bookingEndDate ? (
              <p className="text-white text-sm font-semibold">{formatFriendlyDate(bookingEndDate)}</p>
            ) : (
              <p className="text-white text-sm font-semibold">{formatFriendlyDate(startDate)} (Event Start)</p>
            )}
            {bookingDuration && <p className="text-accent-purple mt-2 font-medium">Booking Window: {bookingDuration}</p>}
          </div>
        </div>
      )}
    </div>
  );
});
