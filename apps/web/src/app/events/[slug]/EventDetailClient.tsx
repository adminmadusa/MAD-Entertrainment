'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { publicGetEventBySlug, publicGetGallery } from '@/lib/api/public.service';
import { QUERY_KEYS, formatMoney } from '@mad/shared';
import type { Event as EventData } from '@mad/types';

import type { EventBookingFlowHandle } from './components/EventBookingFlow';
import { EventOverview } from './components/EventOverview';
import { EventStickyCTA } from './components/EventStickyCTA';
import { ExpiredEventView } from './components/ExpiredEventView';
import { EventHeroBanner } from './components/EventHeroBanner';
import { EventPolicyAndVenue } from './components/EventPolicyAndVenue';
import { getEventBookingCTA } from './components/use-event-booking-cta';

const EventBookingFlow = dynamic(
  () => import('./components/EventBookingFlow').then((mod) => mod.EventBookingFlow),
  { ssr: false },
);

interface EventDetailClientProps {
  slug: string;
  initialEvent?: EventData;
}

export default function EventDetailClient({ slug, initialEvent }: EventDetailClientProps) {
  const heroImageRef = useRef<HTMLDivElement | null>(null);
  const bookingFlowRef = useRef<EventBookingFlowHandle>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      if (heroImageRef.current) {
        const scale = 1 + Math.min(window.scrollY / 5000, 0.06);
        heroImageRef.current.style.transform = `scale(${scale})`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: event, isLoading: isLoadingEvent } = useQuery<EventData>({
    queryKey: QUERY_KEYS.public.events.detail(slug),
    queryFn: () => publicGetEventBySlug(slug),
    enabled: !!slug,
    initialData: initialEvent,
    staleTime: 60_000,
    initialDataUpdatedAt: initialEvent ? Date.now() : undefined,
  });

  const isCompleted = event?.lifecycle === 'COMPLETED';

  const { data: galleryData } = useQuery({
    queryKey: ['public', 'events', slug, 'gallery'],
    queryFn: () => publicGetGallery(slug),
    enabled: isCompleted && !!slug,
    retry: false,
    staleTime: 60_000,
  });

  const cta = getEventBookingCTA(event);

  useEffect(() => {
    if (searchParams.get('modal') === 'booking' && cta.action === 'BOOK') {
      const timer = setTimeout(() => {
        bookingFlowRef.current?.openBooking();
      }, 100);

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

  const prices = event.ticketTiers?.map((t) => t.price - (t.discount || 0)) || [];
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const currency = event.currency || 'USD';
  const priceDisplay =
    minPrice === maxPrice
      ? formatMoney(minPrice, currency)
      : `${formatMoney(minPrice, currency)} - ${formatMoney(maxPrice, currency)}`;

  const totalCapacity =
    event.totalCapacity ||
    event.ticketTiers?.reduce((acc, t) => acc + (t.totalCapacity || 0), 0) ||
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
        {/* Contained Cinematic Hero Banner */}
        <EventHeroBanner
          event={event}
          heroImageRef={heroImageRef}
          showDateTime={showDateTime}
          doorsOpenText={doorsOpenText}
          isCompleted={isCompleted}
        />

        {/* Conditional Layout Branching */}
        {isCompleted ? (
          <ExpiredEventView event={event} galleryData={galleryData} />
        ) : (
          <div className="pt-4 pb-6 lg:pb-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Main Content Column */}
            <div className="lg:col-span-7 space-y-5 md:space-y-6">
              <EventOverview
                description={event.description}
                organizerName={event.organizerName}
                hideOrganizerCard
              />

              <EventPolicyAndVenue event={event} />
            </div>

            {/* Sticky Booking CTA Column */}
            <EventStickyCTA
              priceLabel={priceDisplay}
              onGetTickets={() => {
                if (cta.action === 'BOOK') {
                  bookingFlowRef.current?.openBooking();
                }
              }}
              cta={cta}
              showDateTime={showDateTime}
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
