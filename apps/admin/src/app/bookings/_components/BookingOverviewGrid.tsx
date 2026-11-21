'use client';

import React from 'react';
import { formatEventDate } from '@mad/utils';

export interface BookingOverviewGridProps {
  customerName?: string;
  email: string;
  phone: string;
  eventTitle?: string;
  eventStartDate?: string | Date;
  mode?: string;
}

export function BookingOverviewGrid({
  customerName,
  email,
  phone,
  eventTitle,
  eventStartDate,
  mode,
}: BookingOverviewGridProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">Customer Info</h4>
          <p className="text-white font-semibold">{customerName ?? '—'}</p>
          <p className="text-text-secondary text-xs mt-0.5">{email}</p>
          <p className="text-text-secondary text-xs">{phone}</p>
        </div>
        <div>
          <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">Event</h4>
          <p className="text-white font-semibold">{eventTitle ?? '—'}</p>
          <p className="text-text-secondary text-xs mt-0.5">
            {eventStartDate ? formatEventDate(eventStartDate) : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm border-t border-white/5 pt-3">
        <div>
          <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">Booking Mode</h4>
          <p className="text-white font-medium capitalize">{mode?.replace('_', ' ')}</p>
        </div>
      </div>
    </>
  );
}
