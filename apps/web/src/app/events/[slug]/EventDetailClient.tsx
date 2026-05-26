'use client';

import { QUERY_KEYS } from '@mad/shared';
import { Event as EventData } from '@mad/types';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

import { publicGetEventBySlug } from '@/lib/api/public.service';
import { TicketSelectionContent } from '@/components/booking/TicketSelectionContent';

export default function EventDetailClient() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

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

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 1. Fetch Event
  const { data: event, isLoading: isLoadingEvent } = useQuery<EventData>({
    queryKey: QUERY_KEYS.public.events.detail(slug),
    queryFn: () => publicGetEventBySlug(slug),
    enabled: !!slug,
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

  return (
    <div className="pt-24 pb-32 min-h-screen bg-background text-white relative overflow-x-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="container-mad max-w-3xl space-y-8 relative z-10 px-4">
        {/* Media Header with Play video overlay */}
        <div className="aspect-[16/9] w-full rounded-3xl overflow-hidden bg-white/5 relative border border-white/10 group shadow-2xl">
          {event.bannerImage?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={event.bannerImage.url} 
              alt={event.title} 
              className="w-full h-full object-contain bg-black/40 transition-transform duration-500 ease-out" 
              style={{
                transform: `scale(${1 + Math.min(scrollY / 4000, 0.03)})`,
              }}
            />
          )}
          {/* Play Overlay */}
          <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/25 transition-colors duration-300">
            <button 
              type="button" 
              className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/40 border border-white/50 backdrop-blur-md flex items-center justify-center text-white text-2xl shadow-glow transition-all hover:scale-110 active:scale-95"
              onClick={() => alert('Playing video presentation...')}
            >
              ▶
            </button>
          </div>
        </div>

        {/* Badges and Meta Controls */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full animate-pulse">
            ⏳ SALES END SOON
          </span>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Event link copied to clipboard!');
              }}
              className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-sm text-text-secondary hover:text-white hover:border-white/30 hover:scale-105 active:scale-95 transition-all"
              title="Share Event"
            >
              🔗
            </button>
            <button 
              type="button" 
              onClick={() => setIsFavorited(!isFavorited)}
              className={`w-10 h-10 rounded-full glass border flex items-center justify-center text-sm transition-all hover:scale-105 active:scale-95 ${
                isFavorited 
                  ? 'border-accent-pink bg-accent-pink/10 text-accent-pink' 
                  : 'border-white/10 text-text-secondary hover:text-accent-pink hover:border-accent-pink/30'
              }`}
              title="Favorite Event"
            >
              ❤️
            </button>
          </div>
        </div>

        {/* Title and Date/Location */}
        <div className="space-y-4">
          <h1 className="text-display-md font-black text-white leading-tight">{event.title}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary border-b border-border-subtle/50 pb-4">
            <span className="flex items-center gap-1.5">📅 {showDateTime}</span>
            <span className="flex items-center gap-1.5">📍 {event.venue}</span>
          </div>
        </div>

        {/* Desktop-only Ticket Booking Card */}
        <div className="hidden md:flex items-center justify-between p-6 glass rounded-2xl border border-white/10 shadow-lg bg-white/3">
          <div>
            <span className="text-xs text-text-muted font-medium">Tickets from</span>
            <div className="text-xl font-black text-accent-purple-light mt-0.5">{priceDisplay}</div>
          </div>
          <button 
            type="button" 
            onClick={() => setIsBookingModalOpen(true)}
            className="px-10 py-3.5 bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm rounded-xl shadow-glow transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Get tickets
          </button>
        </div>

        {/* Organizer Card */}
        <div className="glass rounded-2xl border border-white/5 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-lg text-accent-purple-light">
              {event.organizerName?.charAt(0).toUpperCase() || 'M'}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                <span>{event.organizerName || 'MAD Organizer'}</span>
                <span className="text-[10px] text-accent-cyan px-2 py-0.5 bg-accent-cyan/10 rounded-full border border-accent-cyan/20">
                  TOP ORGANIZER
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
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-95"
          >
            Follow
          </button>
        </div>

        {/* Overview Section */}
        <div className="space-y-3">
          <h2 className="text-white font-bold text-lg">Overview</h2>
          <div className="text-text-secondary text-sm leading-relaxed space-y-2">
            <p>{descriptionPreview}</p>
            {event.description.length > 150 && (
              <button 
                type="button" 
                onClick={() => setIsOverviewOpen(true)}
                className="text-accent-cyan hover:text-accent-cyan/80 font-semibold inline-flex items-center gap-1 mt-1 hover:underline"
              >
                Read more
              </button>
            )}
          </div>
        </div>

        {/* Good to Know Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Good to know</h3>
            <div className="space-y-3 text-xs text-text-secondary">
              <div className="flex items-center gap-3">
                <span className="text-base">⏱️</span>
                <span>Doors Open: {event.doorsOpenTime || 'TBA'} · Show: {event.showTime}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base">🔞</span>
                <span>Age Limit: {event.ageRestriction ? `${event.ageRestriction}+` : 'All ages'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base">🕺</span>
                <span>Dresscode: {event.dresscode || 'Casual / Smart Casual'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base">ℹ️</span>
                <span>{event.additionalInfo || 'Free parking available around the venue'}</span>
              </div>
            </div>
          </div>

          {/* Refund policy */}
          <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Refund Policy</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {event.refundPolicy || 'All sales are final. No refunds or exchanges are permitted unless the event is cancelled or postponed.'}
            </p>
          </div>
        </div>

        {/* Location Section */}
        <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
          <h2 className="text-white font-bold text-sm uppercase tracking-wider">Location</h2>
          <div>
            <div className="text-sm font-bold text-white">{event.venue}</div>
            <div className="text-xs text-text-secondary mt-1">Atlanta, GA</div>
          </div>
          {/* Mock Map View */}
          <div className="aspect-[21/9] w-full rounded-xl bg-white/5 border border-white/10 relative overflow-hidden flex items-center justify-center text-text-muted text-xs">
            {/* Embedded maps or mock design */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
            <div className="z-10 text-center space-y-1">
              <span>🗺️ Map Thumbnail</span>
              <span className="block opacity-65 text-[10px]">Forsyth Street Southwest, Atlanta, GA</span>
            </div>
          </div>
        </div>

        {/* Mobile Spacer to prevent overlap with sticky footer */}
        <div className="h-20 md:hidden" aria-hidden="true" />
      </div>

      {/* Sticky Bottom Footer Bar (Mobile Only) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-white/10 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 shadow-2xl md:hidden">
        <div className="container-mad max-w-3xl px-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-text-muted font-medium">Tickets from</div>
            <div className="text-base font-black text-accent-purple-light">{priceDisplay}</div>
          </div>
          <Link href={`/events/${slug}/book`}>
            <button 
              type="button" 
              className="px-8 py-3 bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm rounded-xl shadow-glow transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Get tickets
            </button>
          </Link>
        </div>
      </div>

      {/* Overview Modal Drawer */}
      {isOverviewOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setIsOverviewOpen(false)} />

          <div className="w-full max-w-md bg-[#0d111d] h-full shadow-2xl relative z-10 border-l border-white/10 p-6 flex flex-col justify-between animate-slide-in">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-white font-bold text-lg">Overview</h3>
                <button 
                  type="button" 
                  onClick={() => setIsOverviewOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors"
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
      {/* Desktop Booking Modal overlay */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setIsBookingModalOpen(false)} />

          <div className="w-full max-w-4xl bg-[#0d111d] rounded-2xl border border-white/10 overflow-hidden relative flex flex-col md:flex-row h-[600px] md:h-[650px] shadow-2xl z-10">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsBookingModalOpen(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors z-20"
            >
              ✕
            </button>

            {/* Left Panel: Ticket selection */}
            <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col justify-between overflow-y-auto custom-scrollbar border-r border-white/5">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white pr-8">{event.title}</h3>
                  <p className="text-xs text-text-muted mt-1">{showDateTime} · {event.venue}</p>
                </div>
                
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
                />
              </div>

              {/* Modal Sticky Bottom Action Footer */}
              <div className="border-t border-white/10 pt-4 mt-6 flex items-center justify-between bg-[#0d111d]">
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.bannerImage.url}
                    alt={event.title}
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
    </div>
  );
}
