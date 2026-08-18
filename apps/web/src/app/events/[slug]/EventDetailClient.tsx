'use client';

import { useQuery } from '@tanstack/react-query';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { publicGetEventBySlug, publicGetGallery } from '@/lib/api/public.service';
import { QUERY_KEYS, formatMoney } from '@mad/shared';
import type { Event as EventData, EventBookingCTA } from '@mad/types';

import type { EventBookingFlowHandle } from './components/EventBookingFlow';
import { EventOverview } from './components/EventOverview';
import { EventStickyCTA } from './components/EventStickyCTA';
import { ExpiredEventView } from './components/ExpiredEventView';

const EventBookingFlow = dynamic(
  () => import('./components/EventBookingFlow').then((mod) => mod.EventBookingFlow),
  { ssr: false },
);

interface EventDetailClientProps {
  /** Slug extracted by the server page — avoids useParams() call */
  slug: string;
  /**
   * Event data pre-fetched server-side. Passed as `initialData` to useQuery
   * so the client renders immediately without a second network round-trip.
   * Falls back to a client-side fetch if undefined (e.g. on static build error).
   */
  initialEvent?: EventData;
}

export default function EventDetailClient({ slug, initialEvent }: EventDetailClientProps) {
  const [copied, setCopied] = useState(false);
  // PERF-018B: Use a ref instead of React state for the parallax effect.
  // Storing scrollY in state triggers a full component re-render on every
  // scroll pixel (~60 times/second), causing high INP. A ref + direct DOM
  // mutation bypasses React's render cycle entirely.
  const heroImageRef = useRef<HTMLDivElement | null>(null);
  const bookingFlowRef = useRef<EventBookingFlowHandle>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      // PERF-018B: Mutate the DOM directly — no setState, no re-render.
      if (heroImageRef.current) {
        const scale = 1 + Math.min(window.scrollY / 5000, 0.06);
        heroImageRef.current.style.transform = `scale(${scale})`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch event — seeded with server-side initialData to avoid a client waterfall.
  const { data: event, isLoading: isLoadingEvent } = useQuery<EventData>({
    queryKey: QUERY_KEYS.public.events.detail(slug),
    queryFn: () => publicGetEventBySlug(slug),
    enabled: !!slug,
    initialData: initialEvent,
    staleTime: 60_000,
    initialDataUpdatedAt: initialEvent ? Date.now() : undefined,
  });

  const isCompleted = event?.lifecycle === 'COMPLETED';

  // Fetch gallery media only when event is completed
  const { data: galleryData } = useQuery({
    queryKey: ['public', 'events', slug, 'gallery'],
    queryFn: () => publicGetGallery(slug),
    enabled: isCompleted && !!slug,
    staleTime: 60_000,
  });

  let cta: EventBookingCTA = { text: 'Book Now', disabled: false, variant: 'primary', action: 'BOOK' };

  if (event) {
    if (event.lifecycle === 'COMPLETED') {
      cta = {
        text: 'Happy Moments',
        disabled: false,
        variant: 'secondary',
        action: 'GALLERY'
      };
    } else if (event.lifecycle === 'LIVE') {
      if (event.booking?.status === 'OPEN') {
        cta = {
          text: 'Join Now',
          disabled: false,
          variant: 'primary',
          action: 'BOOK'
        };
      } else {
        cta = {
          text: 'In Progress',
          disabled: true,
          variant: 'disabled',
          action: 'NONE'
        };
      }
    } else {
      if (event.booking?.status === 'OPEN') {
        cta = {
          text: 'Book Now',
          disabled: false,
          variant: 'primary',
          action: 'BOOK'
        };
      } else {
        let text = 'Booking Closed';
        if (event.booking?.reason === 'SOLD_OUT' || event.booking?.reason === 'CAPACITY_REACHED') {
          text = 'Sold Out';
        } else if (event.booking?.reason === 'BOOKING_NOT_STARTED') {
          text = 'Coming Soon';
        }
        cta = {
          text,
          disabled: true,
          variant: 'disabled',
          action: 'NONE'
        };
      }
    }
  }

  useEffect(() => {
    if (searchParams.get('modal') === 'booking' && cta.action === 'BOOK') {
      // Defer slightly to ensure ref is mounted and layout is stable
      const timer = setTimeout(() => {
        bookingFlowRef.current?.openBooking();
      }, 100);

      // Clear the search param from URL so it doesn't re-trigger on navigation
      router.replace(`/events/${slug}`, { scroll: false });

      return () => clearTimeout(timer);
    }
  }, [searchParams, cta.action, router, slug]);

  if (isLoadingEvent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-white/40 animate-pulse text-sm">Loading event details...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-text-muted text-sm">Event not found.</div>
      </div>
    );
  }

  const showDateTime = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  // Calculate price range for active events
  const prices = event.ticketTiers?.map((t) => t.price - (t.discount || 0)) || [];
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const currency = event.currency || 'USD';
  const priceDisplay = minPrice === maxPrice
    ? formatMoney(minPrice, currency)
    : `${formatMoney(minPrice, currency)} - ${formatMoney(maxPrice, currency)}`;

  const totalCapacity =
    event.totalCapacity ||
    event.ticketTiers?.reduce((acc, t) => acc + (t.quantity || 0), 0) ||
    0;
  const soldCount =
    event.soldCount ||
    event.ticketTiers?.reduce((acc, t) => acc + (t.soldCount || 0), 0) ||
    0;
  const ticketsLeft = Math.max(0, totalCapacity - soldCount);
  const doorsOpenText = event.doorsOpenTime || event.showTime || 'TBA';

  return (
    <div className="bg-background text-white relative pb-6 md:pb-12">
      <div className="container-mad max-w-6xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 md:pt-28">

        {/* ── CONTAINED 16:9 / CINEMATIC BANNER CARD ── */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[2.2/1] max-h-[420px] rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-surface-elevated">
          {event.bannerImage?.url ? (
            <div
              ref={heroImageRef}
              className="absolute inset-0"
              style={{ transformOrigin: 'center' }}
            >
              <Image
                src={event.bannerImage.url}
                alt={event.title}
                fill
                priority
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent-purple/20 via-background to-accent-pink/10 flex items-center justify-center">
              <span className="text-4xl font-extrabold text-white/20">{event.title}</span>
            </div>
          )}

          {/* Subtle bottom gradient overlay for badges */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

          {/* Top action bar on banner image */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
            {/* Left: Badges */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {event.category && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/15 text-white rounded-full">
                  <span>🎭</span> {event.category.replace('_', ' ')}
                </span>
              )}
              {event.lifecycle === 'LIVE' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-emerald-500/90 text-white rounded-full shadow-glow-sm backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  Live Now
                </span>
              )}
              {isCompleted && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 text-text-muted rounded-full">
                  Ended
                </span>
              )}
            </div>

            {/* Right: Share Button */}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-xs font-medium text-white transition-all active:scale-95 shadow-lg"
              aria-label={copied ? 'Event link copied to clipboard' : 'Share event'}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l5.128-2.564m0 5.644l-5.128-2.564M19 12a3 3 0 11-6 0 3 3 0 016 0zm-10 6a3 3 0 11-6 0 3 3 0 016 0zm0-12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── HEADER DETAILS ROW ── */}
        <div className="pt-6 pb-5 border-b border-border-subtle/40 space-y-2.5">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {event.title}
          </h1>

          {/* Clean Inline Metadata without boxes */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5 text-text-primary font-medium">
              <svg className="w-4 h-4 text-accent-purple-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {showDateTime}
            </span>

            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Doors open {doorsOpenText}
            </span>

            {event.venue && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{event.venue}</span>
              </span>
            )}
          </div>
        </div>

        {/* ── CONDITIONAL LAYOUT BRANCHING ─────────────────────── */}
        {isCompleted ? (
          <ExpiredEventView
            event={event}
            galleryData={galleryData}
          />
        ) : (
          /* ── ACTIVE / UPCOMING EVENT BOOKING LAYOUT ── */
          <div className="pt-4 pb-6 lg:pb-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

            {/* ── MAIN COLUMN ── */}
            <div className="lg:col-span-7 space-y-5 md:space-y-6">

              <EventOverview
                description={event.description}
                organizerName={event.organizerName}
                hideOrganizerCard
              />

              {/* Good to know + Refund policy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="glass rounded-xl md:rounded-2xl border border-white/5 p-4 md:p-5 space-y-3 hover:border-white/10 transition-colors">
                  <h2 className="text-sm md:text-base font-bold text-white">Good to know</h2>
                  <div className="space-y-2.5 text-xs text-text-secondary">
                    <div className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Doors open: {event.doorsOpenTime || 'TBA'} · Show: {event.showTime}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="9" stroke="currentColor" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728" />
                      </svg>
                      <span>Age limit: {event.ageRestriction ? `${event.ageRestriction}+` : 'All ages'}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Dresscode: {event.dresscode || 'Casual / Smart casual'}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{event.additionalInfo || 'Free parking available around the venue'}</span>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-xl md:rounded-2xl border border-white/5 p-4 md:p-5 space-y-3 hover:border-white/10 transition-colors">
                  <h2 className="text-sm md:text-base font-bold text-white">Refund policy</h2>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {event.refundPolicy || 'All sales are final. No refunds or exchanges are permitted unless the event is cancelled or postponed.'}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="glass rounded-xl md:rounded-2xl border border-white/5 p-4 md:p-5 space-y-3 hover:border-white/10 transition-colors">
                <div>
                  <h2 className="text-sm md:text-base font-bold text-white">Location</h2>
                  <div className="text-xs md:text-sm text-text-secondary mt-1">{event.venue}</div>
                </div>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.venue || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs md:text-sm font-semibold text-white transition-all active:scale-95"
                >
                  ↗ Get directions
                </a>
              </div>
            </div>

            <EventStickyCTA
              priceLabel={priceDisplay}
              onGetTickets={() => {
                if (cta.action === 'BOOK') {
                  bookingFlowRef.current?.openBooking();
                }
              }}
              cta={cta}
            />

          </div>
        )}
      </div>

      {/* Booking flow modal mounted only for active events */}
      {!isCompleted && (
        <EventBookingFlow
          ref={bookingFlowRef}
          event={event}
          showDateTime={showDateTime}
          ticketsLeft={ticketsLeft}
        />
      )}

    </div>
  );
}


