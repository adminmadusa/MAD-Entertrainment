'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, ArrowLeft, Image as ImageIcon } from 'lucide-react';
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
  const { items, settings } = gallery;
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
        <div className="relative w-full h-[40vh] md:h-[60vh] bg-surface-elevated overflow-hidden">
          <Image
            src={coverUrl}
            alt={`${event.title} Cover`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/wQAAgMBBNN+f6YAAAAASUVORK5CYII="
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          
          {/* Event Context Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 container mx-auto">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-md">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-text-muted drop-shadow-sm font-medium">
              {eventDate && (
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(eventDate)}
                </div>
              )}
              {event.venue && (
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  {event.venue}
                </div>
              )}
              <div className="flex items-center">
                <ImageIcon className="w-5 h-5 mr-2" />
                {items.length} Photos
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-12">
        {/* Gallery Settings Info */}
        {(settings.heading || settings.thankYouMessage || (settings.highlights && settings.highlights.length > 0)) && (
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-6">
            {settings.heading && (
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                {settings.heading}
              </h2>
            )}
            {settings.thankYouMessage && (
              <p className="text-lg text-text-muted leading-relaxed">
                {settings.thankYouMessage}
              </p>
            )}
            {settings.highlights && settings.highlights.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 pt-4">
                {settings.highlights.map((highlight, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-brand/10 text-brand rounded-full text-sm font-medium"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setLightboxIndex(index)}
              className="group relative aspect-square bg-surface rounded-xl overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`View full screen image ${index + 1} of ${items.length}`}
            >
              <Image
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

      {/* Lightbox Overlay */}
      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={(newIndex) => setLightboxIndex(newIndex)}
        />
      )}
    </div>
  );
}
