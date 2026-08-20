'use client';

import type { Event as EventData } from '@mad/types';

interface EventPolicyAndVenueProps {
  event: EventData;
}

export function EventPolicyAndVenue({ event }: EventPolicyAndVenueProps) {
  return (
    <div className="space-y-5 md:space-y-6">
      {/* Good to know + Refund policy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="glass rounded-xl md:rounded-2xl border border-white/5 p-4 md:p-5 space-y-3 hover:border-white/10 transition-colors">
          <h2 className="text-sm md:text-base font-bold text-white">Good to know</h2>
          <div className="space-y-2.5 text-xs text-text-secondary">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Doors open: {event.doorsOpenTime || 'TBA'} · Show: {event.showTime}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" stroke="currentColor" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728" />
              </svg>
              <span>Age limit: {event.ageRestriction ? `${event.ageRestriction}+` : 'All ages'}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Dresscode: {event.dresscode || 'Casual / Smart casual'}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{event.additionalInfo || 'Free parking available around the venue'}</span>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl md:rounded-2xl border border-white/5 p-4 md:p-5 space-y-3 hover:border-white/10 transition-colors">
          <h2 className="text-sm md:text-base font-bold text-white">Refund policy</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            {event.refundPolicy || 'All sales are final. No refunds or exchanges are permitted unless the event is cancelled or postponed.'}
          </p>
        </div>
      </div>

      {/* Location */}
      {event.venue && (
        <div className="glass rounded-xl md:rounded-2xl border border-white/5 p-4 md:p-5 space-y-3 hover:border-white/10 transition-colors">
          <div>
            <h2 className="text-sm md:text-base font-bold text-white">Location</h2>
            <div className="text-xs md:text-sm text-text-secondary mt-1">{event.venue}</div>
          </div>

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.venue)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs md:text-sm font-semibold text-white transition-all active:scale-95"
          >
            ↗ Get directions
          </a>
        </div>
      )}
    </div>
  );
}
