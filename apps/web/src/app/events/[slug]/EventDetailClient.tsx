'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { publicGetEventBySlug } from '@/lib/api/public.service';
import { QUERY_KEYS, formatMoney } from '@mad/shared';
import type { Event as EventData } from '@mad/types';

import type { EventBookingFlowHandle } from './components/EventBookingFlow';
import { EventOverview } from './components/EventOverview';
import { EventStickyCTA } from './components/EventStickyCTA';

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
    // PERF-018C: staleTime prevents React Query from treating server-fetched
    // initialData as immediately stale and firing a background refetch on mount.
    // 60 s matches the server cache window; data re-validates after that.
    staleTime: 60_000,
    initialDataUpdatedAt: initialEvent ? Date.now() : undefined,
  });

  const cta = event?.bookingCTA || { text: 'Book Now', disabled: false, variant: 'primary', action: 'BOOK' };

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

  // Calculate price range
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
    <div className="min-h-screen bg-background text-white relative overflow-x-hidden">

      {/* ── FULL-BLEED CINEMATIC HERO ─────────────────────────── */}
      <div className="relative w-full h-[38vh] min-h-[220px] md:h-[58vh] md:min-h-[400px] overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-purple/5 rounded-full blur-[180px] pointer-events-none" />

        {/* Hero image with parallax */}
        {event.bannerImage?.url ? (
          // PERF-018B: Wrapping div carries the ref so the scroll handler can
          // mutate transform directly without going through React state.
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
              sizes="100vw"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/20 to-accent-pink/10" />
        )}

        {/* Cinema fade overlay — bottom fades into background */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        {/* Side fades for wide screens */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/20" />

        {/* Category badge anchored to hero bottom */}
        {event.category && (
          <div className="absolute bottom-6 left-4 md:left-8 flex items-center gap-2 z-20">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 glass border border-white/10 text-text-secondary rounded-full">
              <svg className="w-3 h-3 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              {event.category}
            </span>
          </div>
        )}
      </div>

      {/* ── CONTENT BELOW HERO ───────────────────────────────── */}
      <div className="container-mad max-w-7xl px-4 md:px-8 relative z-10">

        {/* Title row + Share action + metadata strip */}
        <div className="py-6 space-y-3 border-b border-white/5">
          {/* Title + Share on same row */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-display-md font-black text-white leading-tight">{event.title}</h1>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 mt-1 rounded-xl glass border border-white/10 text-sm text-text-secondary hover:text-white hover:border-white/30 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              aria-label={copied ? 'Event link copied to clipboard' : 'Share event'}
            >
              {copied ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l5.128-2.564m0 5.644l-5.128-2.564M19 12a3 3 0 11-6 0 3 3 0 016 0zm-10 6a3 3 0 11-6 0 3 3 0 016 0zm0-12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              <span>{copied ? 'Copied!' : 'Share'}</span>
            </button>
          </div>

          {/* Metadata: date · doors open · venue */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {showDateTime}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Doors open {doorsOpenText}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {event.venue}
            </span>
          </div>
        </div>

        {/* ── TWO-COLUMN GRID ──────────────────────────────────── */}
        <div className="pt-5 pb-20 lg:pb-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── MAIN COLUMN ────────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-8">

            <EventOverview
              description={event.description}
              organizerName={event.organizerName}
            />

            {/* Good to know + Refund policy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass rounded-2xl border border-white/5 p-5 space-y-4 hover:border-white/10 transition-colors">
                <h2 className="text-base font-bold text-white">Good to know</h2>
                <div className="space-y-3 text-xs text-text-secondary">
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Doors open: {event.doorsOpenTime || 'TBA'} · Show: {event.showTime}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="9" stroke="currentColor" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728" />
                    </svg>
                    <span>Age limit: {event.ageRestriction ? `${event.ageRestriction}+` : 'All ages'}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Dresscode: {event.dresscode || 'Casual / Smart casual'}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{event.additionalInfo || 'Free parking available around the venue'}</span>
                  </div>
                </div>
              </div>

              <div className="glass rounded-2xl border border-white/5 p-5 space-y-4 hover:border-white/10 transition-colors">
                <h2 className="text-base font-bold text-white">Refund policy</h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {event.refundPolicy || 'All sales are final. No refunds or exchanges are permitted unless the event is cancelled or postponed.'}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="glass rounded-2xl border border-white/5 p-5 space-y-4 hover:border-white/10 transition-colors">
              <div>
                <h2 className="text-base font-bold text-white">Location</h2>
                <div className="text-sm text-text-secondary mt-1">{event.venue}</div>
              </div>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.venue || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold text-white transition-all active:scale-95"
              >
                ↗ Get directions
              </a>
            </div>

            {/* Mobile spacer above sticky footer — kept minimal */}
            <div className="h-6 lg:hidden" aria-hidden="true" />
          </div>

          <EventStickyCTA
            priceLabel={priceDisplay}
            onGetTickets={() => bookingFlowRef.current?.openBooking()}
            cta={cta}
          />

        </div>
      </div>

      <EventBookingFlow
        ref={bookingFlowRef}
        event={event}
        showDateTime={showDateTime}
        ticketsLeft={ticketsLeft}
      />

    </div>
  );
}
