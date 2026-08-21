'use client';

import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, ArrowLeft, Camera, Music } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';

import { publicGetEvents } from '@/lib/api/public.service';
import { formatMoney } from '@mad/shared';
import type { Event, EventGalleryItem, EventGallerySettings } from '@mad/types';

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
  const isCompleted = event.status === 'completed' || event.lifecycle === 'COMPLETED';

  return (
    <div className="min-h-screen bg-background text-white relative">
      {/* ── FULL-BLEED CINEMATIC HERO (Matched with Event Detail Page) ── */}
      <div className="relative w-full h-[30vh] min-h-[200px] md:h-[44vh] md:min-h-[320px] overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-purple/5 rounded-full blur-[180px] pointer-events-none" />

        {coverUrl ? (
          <div className="absolute inset-0">
            <Image
              src={coverUrl}
              alt={event.title}
              fill
              priority
              sizes="100vw"
              className="absolute inset-0 w-full h-full object-cover"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/wQAAgMBBNN+f6YAAAAASUVORK5CYII="
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/20 to-accent-pink/10" />
        )}

        {/* Top Scrim Gradient for Navbar Legibility across full width */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent h-40 pointer-events-none z-10" />

        {/* Cinema fade overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/20" />

        {/* Category & Lifecycle badges anchored to hero bottom */}
        <div className="absolute bottom-6 left-4 md:left-8 flex items-center gap-2 z-20">
          {event.category && (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 glass border border-white/10 text-text-secondary rounded-full">
              <Music className="w-3 h-3 text-text-secondary" />
              {event.category}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 bg-white/5 border border-white/10 text-text-muted rounded-full">
            {isCompleted ? 'Happy Moments' : 'Gallery'}
          </span>
        </div>
      </div>

      {/* ── CONTENT BELOW HERO (Matched Container Structure) ── */}
      <div className="container-mad max-w-7xl px-4 md:px-8 relative z-10">
        {/* Title row + Back Action + Metadata Strip */}
        <div className="py-6 space-y-4 border-b border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <Link
                href={`/events/${event.slug}`}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-text-secondary hover:text-white transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to Event</span>
              </Link>
              <h1 className="text-display-sm sm:text-display-md font-black text-white leading-tight">
                {event.title}
              </h1>
            </div>

            {/* Total Photos Badge */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-accent-purple/10 border border-accent-purple/30 text-accent-purple-light shadow-glow-sm">
                <Camera className="w-3.5 h-3.5" />
                {items.length} Photos Captured
              </span>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-text-secondary pt-1">
            {eventDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-accent-purple-light" />
                <span>
                  {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(eventDate)}
                </span>
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-accent-purple-light" />
                <span>{event.venue}</span>
              </div>
            )}
          </div>
        </div>

        {/* Gallery Content Area */}
        <div className="py-8 md:py-12 space-y-10">
          {/* Gallery Highlights / Thank You Note */}
          {(settings.heading || settings.thankYouMessage || (settings.highlights && settings.highlights.length > 0)) && (
            <div className="glass rounded-2xl border border-white/5 p-6 md:p-8 space-y-4 max-w-4xl">
              {settings.heading && (
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {settings.heading}
                </h2>
              )}
              {settings.thankYouMessage && (
                <p className="text-sm text-text-secondary leading-relaxed">
                  {settings.thankYouMessage}
                </p>
              )}
              {settings.highlights && settings.highlights.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {settings.highlights.map((highlight, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-1 bg-accent-purple/10 border border-accent-purple/20 text-accent-purple-light rounded-full text-xs font-medium"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Photo Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {items.map((item, index) => (
              <button
                key={item.id || index}
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="group relative aspect-square bg-white/[0.02] rounded-2xl overflow-hidden border border-white/5 hover:border-accent-purple/40 hover:shadow-glow-sm hover:scale-[1.02] transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                aria-label={`View photo ${index + 1} of ${items.length}`}
              >
                <Image
                  src={item.thumbnail || item.url}
                  alt={item.caption || `Gallery photo ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  loading={index < 8 ? 'eager' : 'lazy'}
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/wQAAgMBBNN+f6YAAAAASUVORK5CYII="
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  {item.caption && (
                    <span className="text-[11px] text-white line-clamp-1 text-left font-medium">
                      {item.caption}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Lightbox Modal */}
        {lightboxIndex !== null && (
          <Lightbox
            items={items}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onChange={(newIndex) => setLightboxIndex(newIndex)}
          />
        )}

        {/* Recommended Events Section */}
        <RecommendedEventsSection currentEvent={event} />
      </div>
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
    <div className="pb-16 mt-8 pt-8 border-t border-white/5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-accent-purple-light text-xs font-semibold uppercase tracking-wider mb-1">
            Discover More
          </p>
          <h3 className="text-xl sm:text-2xl font-bold text-white">Other Events You Might Like</h3>
        </div>
        <Link
          href="/events"
          className="text-xs font-semibold text-accent-purple hover:text-accent-purple-light hover:underline"
        >
          View All Events →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {recommendedEvents.map((recEvent) => {
          const minPrice = recEvent.ticketTiers?.length > 0 ? Math.min(...recEvent.ticketTiers.map((t) => t.price)) : 0;
          return (
            <Link
              href={`/events/${recEvent.slug}`}
              key={recEvent._id}
              className="group relative glass rounded-2xl border border-white/5 overflow-hidden hover:border-accent-purple/40 hover:shadow-glow-sm transition-all duration-300 flex flex-col h-full"
            >
              <div className="aspect-[16/10] w-full relative bg-white/5 overflow-hidden">
                {recEvent.bannerImage?.url ? (
                  <Image
                    src={recEvent.bannerImage.url}
                    alt={recEvent.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 250px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-accent-purple text-3xl">
                    🎧
                  </div>
                )}
                {recEvent.lifecycle === 'LIVE' && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-black/85 text-emerald-400 rounded-full border border-emerald-500/20 flex items-center gap-1 shadow-glow-sm">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <div className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-1">
                  {recEvent.category}
                </div>
                <h4 className="text-white font-bold text-sm line-clamp-1 mb-2 group-hover:text-accent-purple-light transition-colors">
                  {recEvent.title}
                </h4>
                <div className="mt-auto pt-2 flex items-center justify-between text-xs border-t border-white/5">
                  <span className="text-text-secondary">Tickets from</span>
                  <span className="text-white font-bold">
                    {formatMoney(minPrice, recEvent.currency)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
