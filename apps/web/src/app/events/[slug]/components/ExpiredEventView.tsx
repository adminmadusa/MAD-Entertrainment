'use client';

import Image from 'next/image';
import { useState } from 'react';

import type { Event as EventData, EventGalleryItem, EventGallerySettings } from '@mad/types';
import { Camera } from '@mad/ui';

import { EventOverview } from './EventOverview';
import { Lightbox } from '../gallery/components/Lightbox';
import { RecommendedUpcomingSection } from './RecommendedUpcomingSection';

interface ExpiredEventViewProps {
  event: EventData;
  showDateTime: string;
  galleryData?: {
    items: EventGalleryItem[];
    settings: EventGallerySettings | null;
  };
}

export function ExpiredEventView({ event, showDateTime, galleryData }: ExpiredEventViewProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const hasPhotos = galleryData?.items && galleryData.items.length > 0;

  return (
    <div className="pt-8 pb-20 max-w-6xl mx-auto space-y-12">
      {/* Overview & Event Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-8 space-y-6">
          <EventOverview
            description={event.description}
            organizerName={event.organizerName}
          />
        </div>

        {/* Event Info / Venue Card */}
        <div className="md:col-span-4 space-y-4">
          <div className="glass rounded-2xl border border-white/10 p-5 space-y-4 shadow-lg">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-pink" />
              Event Details
            </h2>
            <div className="space-y-3 text-xs text-text-secondary">
              <div>
                <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider mb-0.5">Date &amp; Time</span>
                <span className="text-white font-medium text-sm">{showDateTime}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider mb-0.5">Venue</span>
                <span className="text-white font-medium">{event.venue}</span>
              </div>
              {event.doorsOpenTime && (
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider mb-0.5">Doors Open</span>
                  <span className="text-white font-medium">{event.doorsOpenTime} {event.showTime ? `· Show: ${event.showTime}` : ''}</span>
                </div>
              )}
            </div>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.venue || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all active:scale-95"
            >
              ↗ Get directions
            </a>
          </div>
        </div>
      </div>

      {/* Happy Moments Photo Gallery Section */}
      <div className="pt-6 border-t border-white/5 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-accent-pink-light text-xs font-semibold uppercase tracking-wider mb-1">
              Relive the Magic
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Happy Moments &amp; Photos
            </h2>
          </div>
          {hasPhotos && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-accent-pink/10 border border-accent-pink/30 text-accent-pink self-start sm:self-auto">
              <Camera className="w-3.5 h-3.5" />
              {galleryData.items.length} Photos Captured
            </span>
          )}
        </div>

        {/* Gallery Highlights & Message */}
        {galleryData?.settings && (galleryData.settings.heading || galleryData.settings.thankYouMessage || (galleryData.settings.highlights && galleryData.settings.highlights.length > 0)) && (
          <div className="glass rounded-2xl border border-white/5 p-6 space-y-4">
            {galleryData.settings.heading && (
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {galleryData.settings.heading}
              </h3>
            )}
            {galleryData.settings.thankYouMessage && (
              <p className="text-sm text-text-secondary leading-relaxed">
                {galleryData.settings.thankYouMessage}
              </p>
            )}
            {galleryData.settings.highlights && galleryData.settings.highlights.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {galleryData.settings.highlights.map((highlight, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-accent-pink/10 border border-accent-pink/20 text-accent-pink text-xs font-medium rounded-full"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Photo Grid */}
        {hasPhotos ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {galleryData.items.map((item, index) => (
              <button
                key={item.id || index}
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="group relative aspect-square bg-white/5 rounded-2xl overflow-hidden border border-white/5 hover:border-accent-pink/40 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink cursor-pointer"
                aria-label={`View photo ${index + 1}`}
              >
                <Image
                  src={item.thumbnail || item.url}
                  alt={item.caption || `Event photo ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  {item.caption && (
                    <span className="text-[11px] text-white line-clamp-1 text-left font-medium">
                      {item.caption}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl border border-white/5 p-8 sm:p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-accent-pink">
              <Camera className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="text-lg font-bold text-white">Event Concluded</h3>
            <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto">
              This event has officially ended. Photos and highlights will appear here once published by the organizer.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && galleryData?.items && (
        <Lightbox
          items={galleryData.items}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={(newIndex) => setLightboxIndex(newIndex)}
        />
      )}

      {/* Recommended Active Events */}
      <RecommendedUpcomingSection currentEventId={event._id} />
    </div>
  );
}
