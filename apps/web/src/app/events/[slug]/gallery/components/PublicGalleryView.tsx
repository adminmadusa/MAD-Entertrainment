'use client';

import { ArrowLeft, Calendar, Camera, MapPin, Music } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';

import type { Event, EventGalleryItem, EventGallerySettings } from '@mad/types';

import { RecommendedUpcomingSection } from '../../components/RecommendedUpcomingSection';
import { Lightbox } from './Lightbox';
import { MobileGalleryCarousel } from './MobileGalleryCarousel';

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

  const eventSlug = event.slug || event._id || '';
  const backHref = eventSlug ? `/events/${eventSlug}` : '/events';

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
        <div className="py-5 md:py-8 space-y-4 border-b border-white/5">
          {/* Top Row: Back Action on Left, Photos Count on Right */}
          <div className="flex items-center justify-between gap-3">
            <Link
              href={backHref}
              prefetch={true}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xs font-semibold text-text-secondary hover:text-white transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
              aria-label={`Back to ${event.title}`}
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-accent-purple-light" />
              <span>Back to Event</span>
            </Link>

            {/* Total Photos Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-accent-purple/10 border border-accent-purple/25 text-accent-purple-light shadow-glow-sm">
              <Camera className="w-3.5 h-3.5" />
              <span>{items.length} Photos Captured</span>
            </span>
          </div>

          {/* Title & Metadata Block */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">
              {event.title}
            </h1>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-3.5 sm:gap-5 text-xs font-medium text-text-secondary pt-0.5">
              {eventDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-accent-purple-light shrink-0" />
                  <span>
                    {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(eventDate)}
                  </span>
                </div>
              )}
              {event.venue && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-accent-purple-light shrink-0" />
                  <span>{event.venue}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gallery Content Area */}
        <div className="py-6 md:py-10 space-y-8">
          {/* Gallery Highlights / Thank You Note */}
          {(settings.heading || settings.thankYouMessage || (settings.highlights && settings.highlights.length > 0)) && (
            <div className="glass rounded-2xl border border-white/5 p-5 md:p-8 space-y-4 max-w-4xl">
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
                <div className="flex flex-wrap gap-2 pt-1">
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

          {/* Mobile View: Compact Left-Right Swipe Carousel with Card Peek */}
          <MobileGalleryCarousel items={items} onSelectPhoto={setLightboxIndex} />

          {/* Desktop & Tablet: Compact Dense Multi-Column Grid */}
          <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
            {items.map((item, index) => (
              <button
                key={item.id || index}
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="group relative aspect-square bg-white/[0.02] rounded-xl overflow-hidden border border-white/5 hover:border-accent-purple/40 hover:shadow-glow-sm hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                aria-label={`View photo ${index + 1} of ${items.length}`}
              >
                <Image
                  src={item.thumbnail || item.url}
                  alt={item.caption || `Gallery photo ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                  loading={index < 8 ? 'eager' : 'lazy'}
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/wQAAgMBBNN+f6YAAAAASUVORK5CYII="
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2.5">
                  {item.caption && (
                    <span className="text-[10px] text-white line-clamp-1 text-left font-medium">
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
        <RecommendedUpcomingSection currentEventId={event._id} />
      </div>
    </div>
  );
}
