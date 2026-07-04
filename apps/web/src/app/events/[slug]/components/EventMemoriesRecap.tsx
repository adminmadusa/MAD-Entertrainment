'use client';

import type { EventMemoryConfig } from '@mad/types';

import { EventGallery } from './EventGallery';

type EventMemoriesRecapProps = {
  memories: EventMemoryConfig;
};

export function EventMemoriesRecap({ memories }: EventMemoriesRecapProps) {
  const { heading, thankYouMessage, highlights, gallery } = memories;

  // Sort gallery items by order before rendering
  const sortedGallery = gallery
    ? [...gallery].sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="glass rounded-3xl border border-white/5 p-6 md:p-8 space-y-6 bg-gradient-to-br from-white/3 to-transparent hover:border-white/10 transition-colors duration-300">
      {/* Header section */}
      <div className="space-y-2">
        <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
          {heading?.trim() || 'Event Memories'}
        </h2>
        {thankYouMessage?.trim() && (
          <p className="text-sm md:text-base text-text-secondary leading-relaxed whitespace-pre-line">
            {thankYouMessage}
          </p>
        )}
      </div>

      {/* Highlights / Badges */}
      {highlights && highlights.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {highlights.map((highlight, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider px-3.5 py-2 rounded-xl bg-accent-purple/10 border border-accent-purple/20 text-accent-purple"
            >
              <svg
                className="w-3.5 h-3.5 text-accent-purple"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {highlight}
            </span>
          ))}
        </div>
      )}

      {/* Gallery component reuse */}
      {sortedGallery.length > 0 && (
        <div className="pt-2">
          <EventGallery images={sortedGallery} />
        </div>
      )}
    </div>
  );
}
