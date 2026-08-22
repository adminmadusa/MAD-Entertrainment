'use client';

import { ArrowRight, Camera, Sparkles } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { ImageWrapper } from '@/components/common/ImageWrapper';
import type { Event as EventData, EventGalleryItem, EventGallerySettings } from '@mad/types';

import { EventOverview } from './EventOverview';
import { RecommendedUpcomingSection } from './RecommendedUpcomingSection';

interface ExpiredEventViewProps {
  event: EventData;
  galleryData?: {
    items: EventGalleryItem[];
    settings: EventGallerySettings | null;
  };
}

export function ExpiredEventView({ event, galleryData }: ExpiredEventViewProps) {
  const displayItems = galleryData?.items && galleryData.items.length > 0 ? galleryData.items : [];
  const hasPhotos = displayItems.length > 0;
  const galleryHeading = galleryData?.settings?.heading || 'Happy Moments & Photos';
  const previewItems = displayItems.slice(0, 4);

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
            <p className="text-accent-pink-light text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Relive The Moments</span>
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {galleryHeading}
            </h2>
          </div>
          {hasPhotos && (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-accent-pink/10 border border-accent-pink/30 text-accent-pink">
                <Camera className="w-3.5 h-3.5" />
                {displayItems.length} Photos Captured
              </span>
              <Link
                href={`/events/${event.slug}/gallery`}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-accent-pink-light hover:text-white transition-colors"
              >
                <span>View Full Gallery</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
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

        {/* Photo Grid Preview */}
        {hasPhotos ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {previewItems.map((item, index) => (
                <Link
                  key={item.id || index}
                  href={`/events/${event.slug}/gallery`}
                  className="group relative aspect-square bg-white/5 rounded-2xl overflow-hidden border border-white/5 hover:border-accent-pink/40 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink block"
                  aria-label={`View photo ${index + 1} in gallery`}
                >
                  <ImageWrapper
                    src={item.thumbnail || item.url}
                    alt={item.caption || `Event photo ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    {item.caption && (
                      <span className="text-[11px] text-white line-clamp-1 text-left font-medium">
                        {item.caption}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center pt-2">
              <Link
                href={`/events/${event.slug}/gallery`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full btn-gradient text-white text-xs font-bold shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>View Full Photo Gallery ({displayItems.length} Photos)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
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

      {/* Recommended Active Events */}
      <RecommendedUpcomingSection currentEventId={event._id} />
    </div>
  );
}
