'use client';

import { EventCategory, EVENT_CATEGORY_LABELS, QUERY_KEYS } from '@mad/shared';
import { EventGridSkeleton } from '@mad/ui';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from '@/components/common/page-transition';
import { publicGetEvents } from '@/lib/api/public.service';

function ArrowRight({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export function FeaturedEventsSection() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.public.events.featured(),
    queryFn: () => publicGetEvents({ page: 1, limit: 4 }),
  });

  const events = data?.data ?? [];

  const formatDate = (dateStr: Date | string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <section className="py-16" aria-label="Featured events">
      <div className="container-mad">
        <Reveal>
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-accent-purple text-sm font-semibold uppercase tracking-wider mb-2">
                Don&apos;t Miss Out
              </p>
              <h2 className="text-display-sm font-black text-white">
                Featured Events
              </h2>
            </div>
            <Link
              href="/events"
              id="view-all-events"
              className="text-text-secondary hover:text-accent-purple-light text-sm font-medium transition-colors flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
        </Reveal>

        {isLoading ? (
          <EventGridSkeleton count={4} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" />
        ) : events.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl border border-border-subtle">
            <div className="flex justify-center mb-4 text-accent-purple/60 animate-pulse" aria-hidden="true">
              <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg">No Active Events</h3>
            <p className="text-text-muted text-sm max-w-xs mx-auto mt-1">
              Check back soon for upcoming shows, DJ nights, and entertainment experiences!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {events.map((event) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={event._id}
                className="group relative glass rounded-2xl border border-border-subtle overflow-hidden hover:border-accent-purple/40 hover:shadow-glow-sm transition-all duration-300 flex flex-col h-full focus-within:ring-2 focus-within:ring-accent-purple focus-within:border-accent-purple/40"
              >
                {/* Wrap the image, date, title, and description in a link */}
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
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-accent-purple text-5xl">
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
                  <div className="p-4 flex flex-col flex-grow">
                    <div className="text-text-muted text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-accent-purple-light" />
                      {formatDate(event.startDate)}
                    </div>
                    <h3 className="text-white font-bold text-sm sm:text-base line-clamp-1 mb-2 group-hover:text-accent-purple-light transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-text-secondary text-[11px] sm:text-xs line-clamp-2 mb-4 flex-grow leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </Link>

                <div className="px-4 pb-4 pt-3 border-t border-border-subtle/40 flex items-center justify-between mt-auto bg-black/10">
                  <div>
                    <div className="text-[9px] sm:text-[10px] text-text-muted font-medium">Tickets from</div>
                    <div className="text-white font-black text-xs sm:text-sm">
                      ₹{Math.min(...event.ticketTiers.map((t) => t.price))}
                    </div>
                  </div>
                  <Link href={`/events/${event.slug}`} id={`event-card-book-${event.slug}`} tabIndex={-1}>
                    <button
                      tabIndex={-1}
                      className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-bold text-white btn-gradient rounded-xl shadow-glow-sm group-hover:scale-105 transition-transform"
                    >
                      {event.isSoldOut ? 'Details' : 'Book Now'}
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
