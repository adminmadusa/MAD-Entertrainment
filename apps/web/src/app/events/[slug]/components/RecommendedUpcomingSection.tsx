'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';

import { publicGetEvents } from '@/lib/api/public.service';
import { formatMoney } from '@mad/shared';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {recommendedEvents.map((recEvent) => {
          const prices = recEvent.ticketTiers?.map((t) => t.price - (t.discount || 0)) || [];
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
          return (
            <Link
              href={`/events/${recEvent.slug}`}
              key={recEvent._id}
              className="group relative glass rounded-2xl border border-border-subtle overflow-hidden hover:border-accent-purple/40 hover:shadow-glow-sm transition-all duration-300 flex flex-col h-full"
            >
              <div className="aspect-[16/10] w-full relative bg-white/5 overflow-hidden">
                {recEvent.bannerImage?.url ? (
                  <Image
                    src={recEvent.bannerImage.url}
                    alt={recEvent.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 250px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-accent-purple text-3xl">
                    🎧
                  </div>
                )}
                {recEvent.lifecycle === 'LIVE' && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-black/85 text-emerald-400 rounded-full border border-emerald-500/20 flex items-center gap-1 shadow-glow-sm">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <div className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-1">
                  {recEvent.category}
                </div>
                <h4 className="text-white font-bold text-sm line-clamp-1 mb-2 group-hover:text-accent-purple-light transition-colors">
                  {recEvent.title}
                </h4>
                <div className="mt-auto pt-2 flex items-center justify-between text-xs border-t border-white/5">
                  <span className="text-text-secondary text-[11px]">Tickets from</span>
                  <span className="text-white font-bold text-xs">
                    {formatMoney(minPrice, recEvent.currency)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
