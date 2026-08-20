'use client';

import { memo } from 'react';

import { EventCard } from '@/components/common/EventCard';
import { Reveal } from '@/components/common/PageTransition';
import type { Event } from '@mad/types';

interface CompletedEventsSectionProps {
  initialEvents: Event[];
}

export const CompletedEventsSection = memo(function CompletedEventsSection({
  initialEvents = [],
}: CompletedEventsSectionProps) {
  if (initialEvents.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 overflow-hidden bg-background/20" aria-label="Past events gallery" role="region">
      <div className="container-mad">
        <Reveal>
          <div className="mb-6 sm:mb-8">
            <p className="text-accent-pink-light text-xs sm:text-sm font-semibold uppercase tracking-wider mb-1">
              Relive the Magic
            </p>
            <h2 className="text-xl sm:text-display-sm font-black text-white">
              Past Events &amp; Moments
            </h2>
          </div>
        </Reveal>

        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {initialEvents.map((event) => (
            <EventCard
              key={event._id}
              event={event}
              variant="completed"
              density="compact"
              className="h-full"
            />
          ))}
        </div>
      </div>
    </section>
  );
});
