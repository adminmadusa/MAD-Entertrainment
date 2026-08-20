'use client';

import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, ArrowLeft, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ImageWrapper } from '@/components/common/ImageWrapper';
import Link from 'next/link';
import React, { useState } from 'react';

import { EventCard } from '@/components/common/EventCard';
import { publicGetEvents } from '@/lib/api/public.service';
import type { Event, EventGalleryItem, EventGallerySettings } from '@mad/types';

import { CardFanCarousel } from './CardFanCarousel';
import { Lightbox } from './Lightbox';

interface Props {
  event: Event;
  gallery: {
    items: EventGalleryItem[];
    settings: EventGallerySettings;
  };
}

export function PublicGalleryView({ event, gallery }: Props) {
  const rawGallery = gallery as { items?: EventGalleryItem[]; gallery?: EventGalleryItem[] };
  const items = rawGallery.items || rawGallery.gallery || [];
  const settings = gallery.settings;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const coverItem = items.find((item) => item.isCover) || items[0];
  const coverUrl = coverItem?.url || event.bannerImage?.url;

  const eventDate = event.startDate ? new Date(event.startDate) : null;

  let headerSubtitle = 'Gallery';
  if (event.status === 'completed') {
    headerSubtitle = 'Happy Moments';
  } else if (event.status === 'archived') {
    headerSubtitle = 'Event Archive';
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-subtle">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={`/events/${event.slug}`}
            className="flex items-center text-text-muted hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back to Event</span>
          </Link>
          <div className="text-sm font-semibold tracking-wider text-brand uppercase">
            {headerSubtitle}
          </div>
        </div>
      </div>

      {/* Hero Cover */}
      {coverUrl && (
        <div className="relative w-full h-[36vh] md:h-[50vh] bg-surface-elevated overflow-hidden">
          <ImageWrapper
            src={coverUrl}
            alt={`${event.title} Cover`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/wQAAgMBBNN+f6YAAAAASUVORK5CYII="
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

          {/* Event Context Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 container mx-auto">
            <h1 className="text-3xl md:text-5xl font-black text-white mb-3 drop-shadow-md">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-text-muted drop-shadow-sm font-medium text-sm">
              {eventDate && (
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(eventDate)}
                </div>
              )}
              {event.venue && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1.5" />
                  {event.venue}
                </div>
              )}
              <div className="flex items-center">
                <ImageIcon className="w-4 h-4 mr-1.5" />
                {items.length} Photos
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 sm:py-12 space-y-12">
        {/* Interactive 3D Card Fan Carousel Showcase */}
        {items.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-accent-pink/10 text-accent-pink border border-accent-pink/20">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Featured Highlights
                </h2>
              </div>
              <span className="text-xs text-text-muted hidden sm:inline-block">
                Hover to expand · Click to view full size
              </span>
            </div>

            <div className="glass rounded-3xl border border-white/10 p-2 sm:p-4 shadow-2xl relative overflow-hidden bg-white/[0.02]">
              <div className="absolute inset-0 bg-gradient-to-tr from-accent-purple/10 via-transparent to-accent-pink/10 pointer-events-none" />
              <CardFanCarousel
                items={items}
                onSelectCard={(index) => setLightboxIndex(index)}
              />
            </div>
          </div>
        )}

        {/* Gallery Settings Info */}
        {(settings.heading || settings.thankYouMessage || (settings.highlights && settings.highlights.length > 0)) && (
          <div className="max-w-3xl mx-auto text-center space-y-6 pt-4">
            {settings.heading && (
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                {settings.heading}
              </h2>
            )}
            {settings.thankYouMessage && (
              <p className="text-base text-text-muted leading-relaxed">
                {settings.thankYouMessage}
              </p>
            )}
            {settings.highlights && settings.highlights.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2.5 pt-2">
                {settings.highlights.map((highlight, idx) => (
                  <span
                    key={idx}
                    className="px-3.5 py-1.5 bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-xs font-semibold rounded-full"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Full Gallery Grid */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-bold text-white">
              All Photos ({items.length})
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setLightboxIndex(index)}
                className="group relative aspect-square bg-surface rounded-xl overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background border border-white/5 hover:border-accent-pink/40 transition-all duration-300"
                aria-label={`View full screen image ${index + 1} of ${items.length}`}
              >
                <ImageWrapper
                  src={item.thumbnail || item.url}
                  alt={item.caption || `Gallery photo ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  loading={index < 8 ? 'eager' : 'lazy'}
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/wQAAgMBBNN+f6YAAAAASUVORK5CYII="
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={(newIndex) => setLightboxIndex(newIndex)}
        />
      )}

      {/* Recommended Events Carousel */}
      <RecommendedEventsSection currentEvent={event} />
    </div>
  );
}

function RecommendedEventsSection({ currentEvent }: { currentEvent: Event }) {
  const { data: recResponse } = useQuery({
    queryKey: ['public', 'events', 'recommended', currentEvent._id],
    queryFn: () => publicGetEvents({ state: 'active', sort: 'recommended', exclude: currentEvent._id, limit: 4 }),
  });

  const recommendedEvents = recResponse?.data || [];

  if (recommendedEvents.length === 0) return null;

  return (
    <div className="container mx-auto px-4 pb-20 mt-10 pt-10 border-t border-border-subtle/40">
      <h3 className="text-2xl font-bold text-white mb-8">Other Events You Might Like</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {recommendedEvents.map((recEvent) => (
          <EventCard
            key={recEvent._id}
            event={recEvent}
            variant="catalog"
            className="h-full"
          />
        ))}
      </div>
    </div>
  );
}
