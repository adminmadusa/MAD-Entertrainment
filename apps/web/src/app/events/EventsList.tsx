'use client';

import { EventCategory, EVENT_CATEGORY_LABELS } from '@mad/shared';
import { EventGridSkeleton, CalendarIcon } from '@mad/ui';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { publicGetEvents } from '@/lib/api/public.service';
import { formatEventDate } from '@/utils/date';


export function EventsList() {
  const searchParams = useSearchParams();

  const urlCategory = searchParams.get('category') ?? '';
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['public-events', urlCategory, page],
    queryFn: () =>
      publicGetEvents({
        category: urlCategory || undefined,
        page,
        limit: 12,
      }),
    // PERF-018E: Keep list data fresh for 30 s so back-navigation shows
    // cached results immediately instead of re-fetching and flashing skeletons.
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const events = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="pb-16 space-y-8">

      {/* Event Grid */}
      {(() => {
        if (isLoading) {
          return <EventGridSkeleton count={8} />;
        }

        if (events.length === 0) {
          return (
            <div className="text-center py-20 glass rounded-2xl border border-border-subtle">
              <div className="flex justify-center mb-4 text-accent-purple/60 animate-pulse" aria-hidden="true">
                <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h2 className="text-white font-bold text-lg">No Events Found</h2>
              <p className="text-text-muted text-sm max-w-xs mx-auto mt-1">
                Try adjusting your search criteria or category filter to discover other active listings.
              </p>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((event) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={event._id}
                className="group relative glass rounded-2xl border border-border-subtle overflow-hidden hover:border-accent-purple/40 hover:shadow-glow-sm transition-all duration-300 flex flex-col h-full focus-within:ring-2 focus-within:ring-accent-purple focus-within:border-accent-purple/40"
              >
                <Link
                  href={`/events/${event.slug}`}
                  className="flex flex-col flex-grow focus:outline-none"
                  aria-label={`View details for ${event.title}`}
                >
                  {/* Banner Image */}
                  <div className="aspect-[4/3] w-full overflow-hidden relative bg-white/5 flex-shrink-0">
                    {event.bannerImage?.url ? (
                      <Image
                        src={event.bannerImage.url}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 300px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-accent-purple text-5xl" aria-hidden="true">
                        🎧
                      </div>
                    )}

                    {/* Category Badge */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-accent-purple-light rounded-full border border-accent-purple/20">
                      {EVENT_CATEGORY_LABELS[event.category as EventCategory] || event.category}
                    </span>

                    {event.isSoldOut && (
                      <span className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-sm tracking-wider">
                        SOLD OUT
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="text-text-muted text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-accent-purple-light" />
                      {formatEventDate(event.startDate)}
                    </div>
                    <h2 className="text-white font-bold text-base line-clamp-1 mb-2 group-hover:text-accent-purple-light transition-colors">
                      {event.title}
                    </h2>
                    <p className="text-text-secondary text-xs line-clamp-2 mb-6 flex-grow leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </Link>

                <div className="px-5 pb-5 pt-4 border-t border-border-subtle/40 flex items-center justify-between mt-auto bg-black/10">
                  <div>
                    <div className="text-[10px] text-text-muted font-medium">Tickets from</div>
                    <div className="text-white font-black text-sm">
                      ₹{event.ticketTiers?.length > 0 ? Math.min(...event.ticketTiers.map((t) => t.price)) : 0}
                    </div>
                  </div>
                  {/* Single anchor — no Link>button nesting */}
                  <Link
                    href={`/events/${event.slug}`}
                    id={`event-card-book-${event.slug}`}
                    className="px-3.5 py-2 text-xs font-bold text-white btn-gradient rounded-xl shadow-glow-sm group-hover:scale-105 transition-transform"
                    aria-label={event.isSoldOut ? `View details for ${event.title}` : `Book tickets for ${event.title}`}
                  >
                    {event.isSoldOut ? 'Details' : 'Book Now'}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        );
      })()}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-border-subtle/50 mt-10">
          <p className="text-text-muted text-xs">
            Showing page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="px-4 py-2 text-xs glass border border-border-subtle rounded-xl disabled:opacity-40 text-text-secondary hover:text-white transition-all font-medium"
            >
              ← Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
              aria-label="Next page"
              className="px-4 py-2 text-xs glass border border-border-subtle rounded-xl disabled:opacity-40 text-text-secondary hover:text-white transition-all font-medium"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
