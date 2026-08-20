'use client';

import { useQuery } from '@tanstack/react-query';

import { EventCard } from '@/components/common/EventCard';
import { publicGetEvents } from '@/lib/api/public.service';

interface RecommendedUpcomingSectionProps {
  currentEventId?: string;
}

export function RecommendedUpcomingSection({ currentEventId }: RecommendedUpcomingSectionProps) {
  const { data: recResponse } = useQuery({
    queryKey: ['public', 'events', 'recommended', currentEventId],
    queryFn: () => publicGetEvents({ state: 'active', sort: 'recommended', exclude: currentEventId, limit: 4 }),
  });

  const recommendedEvents = recResponse?.data || [];

  if (recommendedEvents.length === 0) return null;

  return (
    <div className="pt-10 border-t border-white/5 space-y-6">
      <div>
        <p className="text-accent-purple-light text-xs font-semibold uppercase tracking-wider mb-1">
          Explore More Shows
        </p>
        <h3 className="text-xl sm:text-2xl font-bold text-white">
          Other Upcoming Events You Might Like
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {recommendedEvents.map((recEvent) => (
          <EventCard
            key={recEvent._id}
            event={recEvent}
            variant="catalog"
            className="h-full"
          />
        ))}
      </div>
    </div>
  );
}
