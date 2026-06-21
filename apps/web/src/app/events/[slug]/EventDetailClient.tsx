'use client';

import { QUERY_KEYS } from '@mad/shared';
import { Event as EventData } from '@mad/types';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { publicGetEventBySlug } from '@/lib/api/public.service';
import { EventBookingFlow } from './components/EventBookingFlow';
import type { EventBookingFlowHandle } from './components/EventBookingFlow';
import { EventGallery } from './components/EventGallery';
import { EventOverview } from './components/EventOverview';
import { EventStickyCTA } from './components/EventStickyCTA';

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
  const [isFavorited, setIsFavorited] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const bookingFlowRef = useRef<EventBookingFlowHandle>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch event — seeded with server-side initialData to avoid a client waterfall.
  // React Query will silently revalidate in the background.
  const { data: event, isLoading: isLoadingEvent } = useQuery<EventData>({
    queryKey: QUERY_KEYS.public.events.detail(slug),
    queryFn: () => publicGetEventBySlug(slug),
    enabled: !!slug,
    initialData: initialEvent,
    // Don't treat initialData as stale immediately — give it 60 s before revalidating
    initialDataUpdatedAt: initialEvent ? Date.now() : undefined,
  });

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
  const priceDisplay = minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice} - ₹${maxPrice}`;

  // Social proof mock data
  const SOCIAL_AVATARS = ['A', 'R', 'K', 'S', 'P'];

  const totalCapacity = event.totalCapacity || event.ticketTiers?.reduce((acc, t) => acc + (t.quantity || 0), 0) || 0;
  const soldCount = event.soldCount || event.ticketTiers?.reduce((acc, t) => acc + (t.soldCount || 0), 0) || 0;
  const ticketsLeft = Math.max(0, totalCapacity - soldCount);
  const percentSold = totalCapacity > 0 ? Math.round((soldCount / totalCapacity) * 100) : 0;
  const availabilityText = `${percentSold}% of tickets sold`;
  const doorsOpenText = event.doorsOpenTime || event.showTime || 'TBA';

  let ticketsText = '';
  if (event.isSoldOut || ticketsLeft <= 0) {
    ticketsText = 'Sold Out';
  } else if (ticketsLeft <= 50) {
    ticketsText = `${ticketsLeft} tickets left`;
  } else {
    ticketsText = 'Available';
  }

  let scarcityStatus: ReactNode = null;
  if (event.isSoldOut || ticketsLeft <= 0) {
    scarcityStatus = <span className="text-red-400 font-semibold">Sold Out</span>;
  } else if (ticketsLeft <= 50) {
    scarcityStatus = (
      <span className="inline-flex items-center gap-1 text-amber-400 font-semibold animate-pulse">
        <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9.879z" />
        </svg>
        Only {ticketsLeft} left
      </span>
    );
  } else {
    scarcityStatus = <span className="text-amber-400 font-semibold">Available</span>;
  }

  return (
    <div className="min-h-screen bg-background text-white relative overflow-x-hidden">

      {/* ── FULL-BLEED CINEMATIC HERO ─────────────────────────── */}
      <div className="relative w-full h-[58vh] min-h-[400px] overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-purple/5 rounded-full blur-[180px] pointer-events-none" />

        {/* Hero image with parallax */}
        {event.bannerImage?.url ? (
          <Image
            src={event.bannerImage.url}
            alt={event.title}
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: `scale(${1 + Math.min(scrollY / 5000, 0.06)})`,
              transformOrigin: 'center',
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/20 to-accent-pink/10" />
        )}

        {/* Cinema fade overlay — bottom fades into background */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        {/* Side fades for wide screens */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/20" />

        {/* Top nav controls overlaid on hero */}
        <div className="absolute top-0 left-0 right-0 h-24 flex items-end justify-between px-4 md:px-8 pb-4 z-20">
          <Link
            href="/events"
            className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-white/10 text-sm text-text-secondary hover:text-white hover:border-white/30 transition-all active:scale-95"
          >
            ← Events
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Event link copied to clipboard!');
              }}
              className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-sm text-text-secondary hover:text-white hover:border-white/30 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-accent-purple"
              title="Share Event"
              aria-label="Share event"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l5.128-2.564m0 5.644l-5.128-2.564M19 12a3 3 0 11-6 0 3 3 0 016 0zm-10 6a3 3 0 11-6 0 3 3 0 016 0zm0-12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIsFavorited(!isFavorited)}
              className={`w-10 h-10 rounded-full glass border flex items-center justify-center text-sm transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-pink ${
                isFavorited
                  ? 'border-accent-pink bg-accent-pink/10 text-accent-pink'
                  : 'border-white/10 text-text-secondary hover:text-accent-pink hover:border-accent-pink/30'
              }`}
              title="Save Event"
              aria-label={isFavorited ? "Remove event from wishlist" : "Add event to wishlist"}
            >
              {isFavorited ? (
                <svg className="w-4 h-4 fill-current text-accent-pink" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-text-secondary hover:text-accent-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Badges anchored to hero bottom */}
        <div className="absolute bottom-6 left-4 md:left-8 flex items-center gap-2 z-20">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full animate-pulse">
            <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sales end soon
          </span>
          {event.category && (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 glass border border-white/10 text-text-secondary rounded-full">
              <svg className="w-3 h-3 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              {event.category}
            </span>
          )}
        </div>
      </div>

      {/* ── CONTENT BELOW HERO ───────────────────────────────── */}
      <div className="container-mad max-w-7xl px-4 md:px-8 relative z-10">

        {/* Title + meta strip */}
        <div className="py-6 space-y-3 border-b border-white/5">
          <h1 className="text-display-md font-black text-white leading-tight">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {showDateTime}
            </span>
            {event.showTime && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {event.showTime}
              </span>
            )}
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
        <div className="pt-8 pb-32 lg:pb-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── MAIN COLUMN ────────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-8">

            {/* Social proof row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Stacked avatar bubbles */}
              <div className="flex -space-x-2.5">
                {SOCIAL_AVATARS.map((letter, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-background bg-white/10 flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ zIndex: SOCIAL_AVATARS.length - i }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <span className="text-sm text-text-secondary">
                <span className="font-bold text-white">{soldCount} people</span> are going ·{' '}
                <span className="text-amber-400 font-semibold">
                  {ticketsText}
                </span>
              </span>
            </div>

            <EventOverview
              description={event.description}
              organizerName={event.organizerName}
              category={event.category}
            />

            <EventGallery images={event.galleryImages} />

            {/* Good to know + Refund policy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass rounded-2xl border border-white/5 p-5 space-y-4 hover:border-white/10 transition-colors">
                <h3 className="text-base font-bold text-white">Good to know</h3>
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
                <h3 className="text-base font-bold text-white">Refund policy</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {event.refundPolicy || 'All sales are final. No refunds or exchanges are permitted unless the event is cancelled or postponed.'}
                </p>
              </div>
            </div>

            {/* Location + Map */}
            <div className="glass rounded-2xl border border-white/5 p-5 space-y-4 hover:border-white/10 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white">Location</h2>
                  <div className="text-sm text-text-secondary mt-1">{event.venue}</div>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                >
                  ↗ Maps
                </a>
              </div>

              {/* Google Maps iframe */}
              <div className="aspect-[21/9] w-full rounded-xl overflow-hidden border border-white/10 bg-white/3">
                {event.venue ? (
                  <iframe
                    title={`Map for ${event.venue}`}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venue)}&output=embed`}
                    className="w-full h-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    style={{ border: 0 }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                    <div className="text-center space-y-1">
                      <svg className="w-6 h-6 mx-auto text-text-muted animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <span>Venue location coming soon</span>
                    </div>
                  </div>
                )}
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

            {/* Mobile spacer above sticky footer */}
            <div className="h-24 lg:hidden" aria-hidden="true" />
          </div>

          <EventStickyCTA
            priceLabel={priceDisplay}
            showDateTime={showDateTime}
            doorsOpenText={doorsOpenText}
            venue={event.venue}
            scarcityStatus={scarcityStatus}
            availabilityText={availabilityText}
            availabilityPercent={percentSold}
            isFavorited={isFavorited}
            onGetTickets={() => bookingFlowRef.current?.openBooking()}
            onToggleFavorite={() => setIsFavorited(!isFavorited)}
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
