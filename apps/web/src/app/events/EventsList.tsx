'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { publicGetEvents } from '@/lib/api/public.service';
import { formatEventDate } from '@/utils/date';
import { getOptimizedImageUrl } from '@/utils/image';
import { EventCategory, EVENT_CATEGORY_LABELS, formatMoney } from '@mad/shared';
import { CalendarIcon, EventGridSkeleton } from '@mad/ui';


export function EventsList() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['public-events', page],
    queryFn: () =>
      publicGetEvents({
        page,
        limit: 12,
      }),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const events = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="pb-16 space-y-8">

      {/* Event Grid */}
      {(() => {
        if (isLoading) {
          return (
            <EventGridSkeleton
              count={8}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            />
          );
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
                Active listings will appear here. Please check back later.
              </p>
            </div>
          );
        }

        return (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
            {events.map((event) => {
              let cardAriaLabel = `View details for ${event.title}`;

              // Derive UI mapping from semantic states
              let badgeElement = null;
              let ctaText = 'Details';
              let ctaDisabled = false;
              let ctaAction = 'VIEW';
              let overlayText = null;

              if (event.lifecycle === 'COMPLETED') {
                badgeElement = (
                  <span className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-black/85 backdrop-blur-md text-text-muted rounded-full border border-white/10">
                    Ended
                  </span>
                );
                ctaText = 'Happy Moments';
                ctaDisabled = false;
                ctaAction = 'GALLERY';
              } else if (event.lifecycle === 'LIVE') {
                badgeElement = (
                  <span className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-black/85 backdrop-blur-md text-emerald-400 rounded-full border border-emerald-500/20 flex items-center gap-1.5 shadow-glow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Now
                  </span>
                );
                if (event.booking?.status === 'OPEN') {
                  ctaText = 'Join Now';
                  ctaDisabled = false;
                  ctaAction = 'BOOK';
                } else {
                  ctaText = 'In Progress';
                  ctaDisabled = true;
                  ctaAction = 'NONE';
                  overlayText = 'IN PROGRESS';
                }
              } else {
                // UPCOMING
                if (event.booking?.status === 'OPEN') {
                  ctaText = 'Book Now';
                  ctaDisabled = false;
                  ctaAction = 'BOOK';
                } else {
                  ctaDisabled = true;
                  ctaAction = 'NONE';
                  if (event.booking?.reason === 'SOLD_OUT' || event.booking?.reason === 'CAPACITY_REACHED') {
                    ctaText = 'Sold Out';
                    overlayText = 'SOLD OUT';
                  } else if (event.booking?.reason === 'BOOKING_NOT_STARTED') {
                    ctaText = 'Coming Soon';
                    overlayText = 'COMING SOON';
                    badgeElement = (
                      <span className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-accent-purple-light rounded-full border border-accent-purple/20">
                        Soon
                      </span>
                    );
                  } else {
                    ctaText = 'Booking Closed';
                    overlayText = 'BOOKING CLOSED';
                  }
                }
              }

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={event._id}
                  className="group relative glass rounded-2xl border border-border-subtle overflow-hidden hover:border-accent-purple/40 hover:shadow-glow-sm transition-all duration-300 flex flex-col h-full focus-within:ring-2 focus-within:ring-accent-purple focus-within:border-accent-purple/40"
                >
                  <Link
                    href={`/events/${event.slug}`}
                    id={`event-card-${event.slug}`}
                    className="flex flex-col flex-grow focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                    aria-label={cardAriaLabel}
                  >
                    {/* Banner Image */}
                    <div className="aspect-[4/3] w-full overflow-hidden relative bg-white/5 flex-shrink-0">
                      {event.bannerImage?.url ? (
                        <Image
                          src={getOptimizedImageUrl(event.bannerImage.url, 400)}
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

                      {/* Runtime Lifecycle Badge */}
                      {badgeElement}

                      {overlayText && (
                        <span className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-sm tracking-wider">
                          {overlayText}
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

                  {/* Card Footer Action Block */}
                  <div className="px-5 pb-5 pt-4 border-t border-border-subtle/40 flex items-center justify-between mt-auto bg-black/10 w-full">
                    <div>
                      <div className="text-[10px] text-text-muted font-medium">Tickets from</div>
                      <div className="text-white font-black text-sm">
                        {formatMoney(event.ticketTiers?.length > 0 ? Math.min(...event.ticketTiers.map((t) => t.price)) : 0, event.currency)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (ctaDisabled && ctaAction !== 'GALLERY') return;
                        if (ctaAction === 'BOOK') {
                          router.push(`/events/${event.slug}?modal=booking`);
                        } else if (ctaAction === 'GALLERY') {
                          router.push(`/events/${event.slug}/gallery`);
                        } else {
                          router.push(`/events/${event.slug}`);
                        }
                      }}
                      disabled={ctaDisabled && ctaAction !== 'GALLERY'}
                      className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-transform text-center ${
                        ctaDisabled && ctaAction !== 'GALLERY'
                          ? 'bg-white/5 border border-white/5 text-text-muted cursor-not-allowed'
                          : 'text-white btn-gradient shadow-glow-sm hover:scale-105'
                      }`}
                    >
                      {ctaText}
                    </button>
                  </div>
                </motion.div>
              );
            })}
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
              disabled={page === 1 || isFetching}
              aria-label="Previous page"
              className="px-4 py-2 text-xs glass border border-border-subtle rounded-xl disabled:opacity-40 text-text-secondary hover:text-white transition-all font-medium disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages || isFetching}
              aria-label="Next page"
              className="px-4 py-2 text-xs glass border border-border-subtle rounded-xl disabled:opacity-40 text-text-secondary hover:text-white transition-all font-medium disabled:cursor-not-allowed"
            >
              {isFetching ? 'Loading...' : 'Next →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
