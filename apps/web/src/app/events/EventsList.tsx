'use client';

import { EventCategory, EVENT_CATEGORY_LABELS } from '@mad/shared';
import { EventGridSkeleton, CalendarIcon, SearchIcon } from '@mad/ui';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

import { publicGetEvents } from '@/lib/api/public.service';
import { formatEventDate } from '@/utils/date';


const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'MAD Events', value: EventCategory.MAD_EVENT },
  { label: 'DJ Nights', value: EventCategory.DJ_NIGHT },
  { label: 'Concerts', value: EventCategory.CONCERT },
  { label: 'Festivals', value: EventCategory.FESTIVAL },
  { label: 'Comedy', value: EventCategory.COMEDY },
  { label: 'VIP Events', value: EventCategory.VIP_EVENT },
  { label: 'Theatre', value: EventCategory.THEATRE },
  { label: 'Cinema', value: EventCategory.CINEMA },
];


export function EventsList() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlCategory = searchParams.get('category') ?? '';
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  const categoryListRef = useRef<HTMLDivElement>(null);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = categoryListRef.current?.querySelectorAll<HTMLButtonElement>('button[role="tab"]');
    if (!buttons) return;

    const buttonsArray = Array.from(buttons);
    const currentIndex = buttonsArray.findIndex((btn) => document.activeElement === btn);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % buttonsArray.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + buttonsArray.length) % buttonsArray.length;
    }

    if (nextIndex !== null) {
      buttonsArray[nextIndex].focus();
      buttonsArray[nextIndex].click();
      e.preventDefault();
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['public-events', urlCategory, debouncedSearch, page],
    queryFn: () =>
      publicGetEvents({
        category: urlCategory || undefined,
        search: debouncedSearch.trim() || undefined,
        page,
        limit: 12,
      }),
  });

  const events = data?.data ?? [];
  const pagination = data?.pagination;

  const handleCategoryChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('category', val);
    } else {
      params.delete('category');
    }
    params.delete('page');
    setPage(1);
    router.push(`/events?${params.toString()}`);
  };

  return (
    <div className="pb-16 space-y-8">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between glass border border-border-subtle p-4 rounded-2xl">
        {/* Categories Scrollable list */}
        <div
          ref={categoryListRef}
          className="flex gap-2 overflow-x-auto w-full scrollbar-hide py-1.5 snap-x snap-mandatory scroll-smooth touch-pan-x focus-visible:outline-none rounded-xl relative"
          role="tablist"
          aria-label="Event categories"
          onKeyDown={handleTabKeyDown}
        >
          {CATEGORIES.map((cat, idx) => {
            const active = urlCategory === cat.value;
            const tabFlowIndex = active || (urlCategory === '' && idx === 0) ? 0 : -1;
            return (
              <button
                key={cat.label}
                onClick={() => handleCategoryChange(cat.value)}
                role="tab"
                aria-selected={active}
                tabIndex={tabFlowIndex}
                className={`px-4 py-2 text-xs rounded-xl font-semibold border whitespace-nowrap transition-all snap-center focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:outline-none ${
                  active
                    ? 'bg-accent-purple border-accent-purple text-white shadow-glow-sm'
                    : 'bg-white/2 border-white/5 text-text-muted hover:border-white/10 hover:text-text-secondary'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="w-full lg:w-80 relative flex-shrink-0">
          <input
            type="text"
            value={search}
            aria-label="Search events"
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Search events..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border-subtle text-base lg:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus-visible:ring-2 focus-visible:ring-accent-purple transition-colors"
          />
          <div className="absolute left-3.5 top-3.5 text-text-muted pointer-events-none" aria-hidden="true">
            <SearchIcon className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Event Grid */}
      {isLoading ? (
        <EventGridSkeleton count={8} />
      ) : events.length === 0 ? (
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
      ) : (
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
                    ₹{Math.min(...event.ticketTiers.map((t) => t.price))}
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
      )}

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
