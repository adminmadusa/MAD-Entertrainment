'use client';

import { useState } from 'react';

type EventOverviewProps = {
  description?: string | null;
  organizerName?: string | null;
  hideOrganizerCard?: boolean;
};

export function EventOverview({ description = '', organizerName, hideOrganizerCard = false }: EventOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const safeDescription = description || '';
  const isLong = safeDescription.length > 220;
  const displayText = isLong && !isExpanded
    ? `${safeDescription.substring(0, 220)}...`
    : safeDescription;

  return (
    <>
      {/* Organizer card */}
      {!hideOrganizerCard && (
        <div className="glass rounded-2xl border border-white/5 p-5 flex items-center gap-4 hover:border-white/10 transition-colors">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-lg text-accent-purple-light flex-shrink-0">
            {organizerName?.charAt(0).toUpperCase() || 'M'}
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {organizerName || 'MAD Organizer'}
            </div>
            <div className="text-xs text-text-secondary mt-0.5">Event Organizer</div>
          </div>
        </div>
      )}

      {/* Overview */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white">Overview</h2>
        <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
          <p>{displayText}</p>
          {isLong && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Show less event overview' : 'Read more about event overview'}
              className="text-accent-cyan hover:text-accent-cyan/80 font-semibold inline-flex items-center gap-1 mt-2 hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 rounded min-h-[44px] py-1"
            >
              {isExpanded ? 'Show less ↑' : 'Read more →'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

