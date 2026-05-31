'use client';

import { QUERY_KEYS } from '@mad/shared';
import { Event as EventData } from '@mad/types';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFocusTrap } from '@mad/ui';

import { publicGetEventBySlug } from '@/lib/api/public.service';
import { TicketSelectionContent } from '@/components/booking/TicketSelectionContent';
import { CheckoutContent } from '@/components/booking/CheckoutContent';

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
  const router = useRouter();

  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // States for Desktop Ticket Selection Modal
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [subtotal, setSubtotal] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const checkoutTriggerRef = useRef<(() => void) | null>(null);

  // States for Desktop Checkout Modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutBookingId, setCheckoutBookingId] = useState<string | null>(null);

  // Focus traps for dialogs
  const overviewRef = useFocusTrap<HTMLDivElement>({
    isActive: isOverviewOpen,
    onClose: () => setIsOverviewOpen(false),
  });

  const bookingModalRef = useFocusTrap<HTMLDivElement>({
    isActive: isBookingModalOpen,
    onClose: () => setIsBookingModalOpen(false),
  });

  const checkoutModalRef = useFocusTrap<HTMLDivElement>({
    isActive: isCheckoutModalOpen,
    onClose: () => {
      setIsPending(false);
      setIsCheckoutModalOpen(false);
      setCheckoutBookingId(null);
    },
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isBookingModalOpen || isCheckoutModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isBookingModalOpen, isCheckoutModalOpen]);

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
  });

  // Calculate price range
  const prices = event.ticketTiers?.map((t) => t.price - (t.discount || 0)) || [];
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const priceDisplay = minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice} - ₹${maxPrice}`;

  // Truncated description (150 chars limit)
  const descriptionPreview = event.description.length > 150 
    ? `${event.description.substring(0, 150)}...`
    : event.description;

  // Social proof mock data
  const SOCIAL_AVATARS = ['A', 'R', 'K', 'S', 'P'];

  const totalCapacity = event.totalCapacity || event.ticketTiers?.reduce((acc, t) => acc + (t.quantity || 0), 0) || 0;
  const soldCount = event.soldCount || event.ticketTiers?.reduce((acc, t) => acc + (t.soldCount || 0), 0) || 0;
  const ticketsLeft = Math.max(0, totalCapacity - soldCount);
  const percentSold = totalCapacity > 0 ? Math.round((soldCount / totalCapacity) * 100) : 0;

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
              🔗
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
              ❤️
            </button>
          </div>
        </div>

        {/* Badges anchored to hero bottom */}
        <div className="absolute bottom-6 left-4 md:left-8 flex items-center gap-2 z-20">
          <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full animate-pulse">
            ⏳ Sales end soon
          </span>
          {event.category && (
            <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 glass border border-white/10 text-text-secondary rounded-full">
              🎵 {event.category}
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
            <span className="flex items-center gap-1.5">📅 {showDateTime}</span>
            {event.showTime && (
              <span className="flex items-center gap-1.5">⏱️ {event.showTime}</span>
            )}
            <span className="flex items-center gap-1.5">📍 {event.venue}</span>
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
                  {event.isSoldOut || ticketsLeft <= 0 ? 'Sold Out' : `${ticketsLeft} tickets left`}
                </span>
              </span>
            </div>

            {/* Organizer card */}
            <div className="glass rounded-2xl border border-white/5 p-5 flex items-center justify-between gap-4 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-lg text-accent-purple-light flex-shrink-0">
                  {event.organizerName?.charAt(0).toUpperCase() || 'M'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                    <span>{event.organizerName || 'MAD Organizer'}</span>
                    <span className="text-[10px] text-accent-cyan px-2 py-0.5 bg-accent-cyan/10 rounded-full border border-accent-cyan/20">
                      Top organizer
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    20.5k followers · {event.category} events
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => alert('Following organizer!')}
                className="flex-shrink-0 px-5 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-95"
              >
                + Follow
              </button>
            </div>

            {/* Overview */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-white">Overview</h2>
              <div className="text-text-secondary text-sm leading-relaxed">
                <p>{descriptionPreview}</p>
                {event.description.length > 150 && (
                  <button
                    type="button"
                    onClick={() => setIsOverviewOpen(true)}
                    className="text-accent-cyan hover:text-accent-cyan/80 font-semibold inline-flex items-center gap-1 mt-2 hover:underline"
                  >
                    Read more →
                  </button>
                )}
              </div>
            </div>

            {/* Good to know + Refund policy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass rounded-2xl border border-white/5 p-5 space-y-4 hover:border-white/10 transition-colors">
                <h3 className="text-base font-bold text-white">Good to know</h3>
                <div className="space-y-3 text-xs text-text-secondary">
                  <div className="flex items-start gap-3">
                    <span className="text-base mt-0.5 flex-shrink-0">⏱️</span>
                    <span>Doors open: {event.doorsOpenTime || 'TBA'} · Show: {event.showTime}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-base mt-0.5 flex-shrink-0">🔞</span>
                    <span>Age limit: {event.ageRestriction ? `${event.ageRestriction}+` : 'All ages'}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-base mt-0.5 flex-shrink-0">🕺</span>
                    <span>Dresscode: {event.dresscode || 'Casual / Smart casual'}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-base mt-0.5 flex-shrink-0">ℹ️</span>
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
                      <span className="text-2xl block">🗺️</span>
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

          {/* ── STICKY SIDEBAR ─────────────────────────────────── */}
          <div className="hidden lg:block lg:col-span-5 self-start lg:sticky lg:top-24">
            <div className="glass rounded-2xl border border-white/10 p-6 space-y-5 shadow-2xl">

              {/* Price */}
              <div>
                <span className="text-xs text-text-muted font-medium">Tickets from</span>
                <div className="text-3xl font-black text-accent-purple-light mt-0.5 leading-none">
                  {priceDisplay}
                  <span className="text-sm font-normal text-text-muted ml-1">/ person</span>
                </div>
              </div>

              {/* Quick facts */}
              <div className="space-y-2.5 text-sm text-text-secondary border-y border-white/5 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📅</span>
                  <span>{showDateTime}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">⏱️</span>
                  <span>Doors open {event.doorsOpenTime || event.showTime || 'TBA'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📍</span>
                  <span>{event.venue}</span>
                </div>
              </div>

              {/* Capacity urgency bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Availability</span>
                  {event.isSoldOut || ticketsLeft <= 0 ? (
                    <span className="text-red-400 font-semibold">Sold Out</span>
                  ) : (
                    <span className="text-amber-400 font-semibold animate-pulse">🔥 Only {ticketsLeft} left</span>
                  )}
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-purple to-accent-pink rounded-full transition-all duration-700"
                    style={{ width: `${percentSold}%` }}
                  />
                </div>
                <div className="text-[10px] text-text-muted">{percentSold}% of tickets sold</div>
              </div>

              {/* Primary CTA */}
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(true)}
                className="w-full py-4 bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm rounded-xl shadow-glow transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                🎟 Get tickets
              </button>

              {/* Secondary CTA */}
              <button
                type="button"
                onClick={() => setIsFavorited(!isFavorited)}
                className={`w-full py-3 rounded-xl border font-semibold text-sm transition-all active:scale-95 ${
                  isFavorited
                    ? 'border-accent-pink bg-accent-pink/10 text-accent-pink'
                    : 'border-white/10 bg-white/3 hover:bg-white/8 text-white hover:border-white/20'
                }`}
              >
                {isFavorited ? '❤️ Saved to wishlist' : '♡ Add to wishlist'}
              </button>

              {/* Trust badge */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-text-muted pt-1 border-t border-white/5">
                <span>🔒</span>
                <span>Secure checkout · No hidden fees</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── MOBILE STICKY FOOTER ─────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-white/10 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 shadow-2xl lg:hidden">
        <div className="container-mad max-w-7xl px-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-text-muted font-medium">Tickets from</div>
            <div className="text-base font-black text-accent-purple-light">{priceDisplay}</div>
          </div>
          <button
            type="button"
            onClick={() => setIsBookingModalOpen(true)}
            className="px-8 py-3.5 bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm rounded-xl shadow-glow transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Get tickets
          </button>
        </div>
      </div>

      {/* Overview Modal Drawer */}
      {isOverviewOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setIsOverviewOpen(false)} />

          <div
            ref={overviewRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="overview-modal-title"
            className="w-full max-w-md bg-[#0d111d] h-full shadow-2xl relative z-10 border-l border-white/10 p-6 flex flex-col justify-between animate-slide-in focus:outline-none"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 id="overview-modal-title" className="text-white font-bold text-lg">Overview</h3>
                <button 
                  type="button" 
                  onClick={() => setIsOverviewOpen(false)}
                  aria-label="Close overview drawer"
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto max-h-[80vh] text-text-secondary text-sm leading-relaxed pr-2 custom-scrollbar">
                {event.description}
              </div>
            </div>
            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button 
                type="button" 
                onClick={() => setIsOverviewOpen(false)}
                className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Ticket Selection Modal overlay */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm md:p-4 animate-fade-in">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setIsBookingModalOpen(false)} />

          <div
            ref={bookingModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-modal-title"
            className="w-full h-full md:h-[650px] max-w-4xl bg-[#0d111d] md:rounded-2xl border border-white/10 overflow-hidden relative flex flex-col md:flex-row shadow-2xl z-10 focus:outline-none"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsBookingModalOpen(false)}
              aria-label="Close ticket selection modal"
              className="absolute right-4 top-4 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors z-20 focus:outline-none focus:ring-2 focus:ring-accent-purple"
            >
              ✕
            </button>

            {/* Left Panel: Ticket selection */}
            <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col h-full border-r border-white/5 bg-[#0d111d] overflow-hidden">
              {/* Fixed Header */}
              <div className="pb-4 border-b border-white/5 shrink-0 pr-12">
                <h3 id="booking-modal-title" className="text-base font-bold text-white leading-snug">{event.title}</h3>
                <p className="text-xs text-text-muted mt-1">{showDateTime} · {event.venue}</p>
              </div>

              {/* Scrollable ticket content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pt-4 space-y-4">
                <TicketSelectionContent
                  event={event}
                  isModal={true}
                  onClose={() => setIsBookingModalOpen(false)}
                  onQuantitiesChange={(q, s, c) => {
                    setQuantities(q);
                    setSubtotal(s);
                    setSelectedCount(c);
                  }}
                  checkoutTriggerRef={checkoutTriggerRef}
                  setIsPendingChange={setIsPending}
                  onBookingSuccess={(bookingId) => {
                    setCheckoutBookingId(bookingId);
                    setIsCheckoutModalOpen(true);
                  }}
                />
              </div>

              {/* Modal Sticky Bottom Action Footer */}
              <div className="border-t border-white/10 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] mt-4 flex items-center justify-between bg-[#0d111d] shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md animate-pulse">
                  🔥 Few tickets left
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (checkoutTriggerRef.current) checkoutTriggerRef.current();
                  }}
                  disabled={isPending}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-glow disabled:opacity-50"
                >
                  {isPending ? 'Processing...' : 'Check out'}
                </button>
              </div>
            </div>

            {/* Right Panel: Cart/Event Image summary */}
            <div className="hidden md:flex md:w-2/5 bg-[#121625] flex-col border-l border-white/5">
              {/* Event Image */}
              <div className="aspect-[16/9] w-full overflow-hidden bg-black/40 relative border-b border-white/10">
                {event.bannerImage?.url && (
                  <Image
                    src={event.bannerImage.url}
                    alt={event.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 384px"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Order Summary details */}
              <div className="flex-1 flex flex-col justify-between p-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Order Summary</h3>
                  {selectedCount === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-text-muted space-y-2">
                      <span className="text-4xl">🛒</span>
                      <span className="text-xs font-medium">Select tickets to see summary</span>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                      {Object.entries(quantities).map(([tierKey, qty]) => {
                        if (qty === 0) return null;
                        const tier = event.ticketTiers.find((t) => t.tier === tierKey);
                        if (!tier) return null;
                        const price = Math.max(0, tier.price - (tier.discount || 0));
                        return (
                          <div key={tierKey} className="flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-white">{qty}x</span>{' '}
                              <span className="text-text-secondary">{tier.name}</span>
                            </div>
                            <span className="font-semibold text-accent-purple-light">₹{price * qty}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {selectedCount > 0 && (
                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Subtotal</span>
                      <span className="font-semibold text-white">₹{subtotal}</span>
                    </div>
                    <p className="text-[9px] text-text-muted leading-relaxed">
                      Convenience fees, GST, and discounts will be calculated at checkout details stage.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Checkout Modal overlay */}
      {isCheckoutModalOpen && checkoutBookingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm md:p-4 animate-fade-in">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => {
            setIsPending(false);
            setIsCheckoutModalOpen(false);
            setCheckoutBookingId(null);
          }} />

          <div
            ref={checkoutModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-modal-title"
            className="w-full h-full md:max-h-[95vh] max-w-4xl bg-[#0d111d] md:rounded-2xl border border-white/10 overflow-y-auto shadow-2xl relative z-10 p-6 custom-scrollbar focus:outline-none"
          >
            <CheckoutContent
              bookingId={checkoutBookingId}
              isModal={true}
              onBack={() => {
                setIsPending(false);
                setIsCheckoutModalOpen(false);
                setIsBookingModalOpen(true);
              }}
              onClose={() => {
                setIsPending(false);
                setIsCheckoutModalOpen(false);
                setCheckoutBookingId(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
