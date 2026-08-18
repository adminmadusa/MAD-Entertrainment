'use client';

import Image from 'next/image';
import { useState } from 'react';

import { MediaType, MediaVisibility, type Event as EventData, type EventGalleryItem, type EventGallerySettings } from '@mad/types';
import { Camera } from '@mad/ui';

import { EventOverview } from './EventOverview';
import { Lightbox } from '../gallery/components/Lightbox';
import { RecommendedUpcomingSection } from './RecommendedUpcomingSection';

interface ExpiredEventViewProps {
  event: EventData;
  galleryData?: {
    items: EventGalleryItem[];
    settings: EventGallerySettings | null;
  };
}

export function ExpiredEventView({ event, galleryData }: ExpiredEventViewProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fallbackItems: EventGalleryItem[] = event.galleryImages?.map((img, index) => ({
    id: img.publicId,
    eventId: event._id,
    mediaType: MediaType.IMAGE,
    url: img.url,
    publicId: img.publicId,
    thumbnail: img.url,
    caption: img.alt || '',
    sortOrder: index,
    isCover: index === 0,
    visibility: MediaVisibility.PUBLIC,
    assetProvider: 'cloudinary',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })) || [];

  const displayItems = galleryData?.items && galleryData.items.length > 0
    ? galleryData.items
    : fallbackItems;

  const hasPhotos = displayItems.length > 0;
  const galleryHeading = galleryData?.settings?.heading || 'Happy Moments & Photos';

  return (
    <div className="pt-6 pb-20 max-w-5xl mx-auto space-y-12">
      {/* Event Overview / Recap Story */}
      {event.description && (
        <div className="space-y-4">
          <EventOverview
            description={event.description}
            organizerName={event.organizerName}
            hideOrganizerCard={true}
          />
        </div>
      )}

      {/* Happy Moments Photo Gallery Section */}
      <div className="pt-6 border-t border-white/5 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-accent-pink-light text-xs font-semibold uppercase tracking-wider mb-1">
              Relive The Moments
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {galleryHeading}
            </h2>
          </div>
          {hasPhotos && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-accent-pink/10 border border-accent-pink/30 text-accent-pink self-start sm:self-auto">
              <Camera className="w-3.5 h-3.5" />
              {displayItems.length} Photos Captured
            </span>
          )}
        </div>

        {/* Gallery Highlights & Message */}
        {galleryData?.settings && (galleryData.settings.thankYouMessage || (galleryData.settings.highlights && galleryData.settings.highlights.length > 0)) && (
          <div className="glass rounded-2xl border border-white/5 p-6 space-y-4">
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
            {displayItems.map((item, index) => (
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
              This event has officially ended. Photos and highlights from the event will appear here once published by the organizer.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && displayItems.length > 0 && (
        <Lightbox
          items={displayItems}
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

