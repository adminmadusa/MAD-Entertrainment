'use client';

import Link from 'next/link';
import React, { memo } from 'react';

import { Reveal } from '@/components/common/PageTransition';
import type { Event } from '@mad/types';
import { ArrowRight } from '@mad/ui';

import { UpcomingEventsCarousel } from './UpcomingEventsCarousel';
import { UpcomingEventsSkeleton } from './UpcomingEventsSkeleton';

interface UpcomingEventsSectionProps {
  initialEvents?: Event[];
  loading?: boolean;
}

export const UpcomingEventsSection = memo(function UpcomingEventsSection({
  initialEvents = [],
  loading = false,
}: UpcomingEventsSectionProps) {
  const events = initialEvents;

  let sectionContent: React.ReactNode;

  if (loading) {
    sectionContent = <UpcomingEventsSkeleton />;
  } else if (events.length === 0) {
    sectionContent = (
      <div className="text-center py-16 glass rounded-2xl border border-border-subtle" role="status">
        <div className="flex justify-center mb-3 text-accent-purple/60 animate-pulse" aria-hidden="true">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
            />
          </svg>
        </div>
        <h3 className="text-white font-bold text-base">No Active Events</h3>
        <p className="text-text-secondary text-xs max-w-xs mx-auto mt-1">
          Check back soon for upcoming shows, DJ nights, and entertainment experiences!
        </p>
      </div>
    );
  } else {
    sectionContent = <UpcomingEventsCarousel events={events} />;
  }

  return (
    <section
      className="pt-4 sm:pt-6 pb-8 sm:pb-12 overflow-hidden"
      aria-labelledby="upcoming-events-heading"
    >
      <div className="container-mad">
        <Reveal>
          <div className="flex items-end justify-between mb-4 sm:mb-6">
            <div>
              <p className="text-accent-purple text-xs sm:text-sm font-semibold uppercase tracking-wider mb-1">
                Don&apos;t Miss Out
              </p>
              <h2 id="upcoming-events-heading" className="text-xl sm:text-display-sm font-black text-white">
                Active Events
              </h2>
            </div>
            <Link
              href="/events"
              id="view-all-events"
              className="text-text-secondary hover:text-accent-purple-light text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 min-h-[36px] sm:min-h-[44px] px-2 py-1 rounded-lg focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:outline-none cursor-pointer"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
        </Reveal>

        {sectionContent}
      </div>
    </section>
  );
});
