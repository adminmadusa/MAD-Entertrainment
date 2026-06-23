'use client';

import { Event as EventData } from '@mad/types';
import Image from 'next/image';
import { useState } from 'react';

type EventGalleryProps = {
  images?: EventData['galleryImages'];
};

export function EventGallery({ images }: EventGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) {
    return null;
  }

  const activeImage = lightboxIndex !== null ? images[lightboxIndex] : undefined;

  return (
    <>
      <div className="space-y-4 pt-4">
        <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-4 bg-accent-purple rounded" />
          Event Gallery
        </h2>

        {/* Mobile/Tablet Swipe Carousel */}
        <div className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar py-1">
          {images.map((img, index) => (
            <div
              key={img.publicId || index}
              onClick={() => setLightboxIndex(index)}
              className="flex-shrink-0 w-[75vw] aspect-[16/10] snap-center rounded-2xl overflow-hidden relative border border-white/10 bg-white/5 cursor-pointer"
            >
              {img.url && (
                <Image
                  src={img.url}
                  alt={img.alt || `Event Image ${index + 1}`}
                  fill
                  loading="lazy"
                  sizes="75vw"
                  className="object-cover"
                />
              )}
            </div>
          ))}
        </div>

        {/* Desktop Grid Gallery */}
        <div className="hidden md:grid grid-cols-3 gap-4">
          {images.map((img, index) => (
            <div
              key={img.publicId || index}
              onClick={() => setLightboxIndex(index)}
              className="aspect-[16/10] rounded-2xl overflow-hidden relative border border-white/5 hover:border-white/20 transition-all duration-300 group bg-white/5 cursor-pointer"
            >
              {img.url && (
                <Image
                  src={img.url}
                  alt={img.alt || `Event Image ${index + 1}`}
                  fill
                  loading="lazy"
                  sizes="(max-width: 1024px) 33vw, 250px"
                  className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxIndex !== null && activeImage && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setLightboxIndex(null)}
            aria-label="Close lightbox"
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white text-lg font-bold transition-colors"
          >
            ✕
          </button>

          <div className="relative w-full max-w-4xl h-[70vh]">
            {activeImage.url && (
              <Image
                src={activeImage.url}
                alt={activeImage.alt || 'Event Gallery Detail'}
                fill
                sizes="100vw"
                className="object-contain"
              />
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-6 mt-6 items-center">
              <button
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev - 1 + images.length) % images.length : null
                  )
                }
                className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-lg font-bold transition-colors"
              >
                ←
              </button>
              <span className="text-text-muted text-sm font-semibold">
                {lightboxIndex + 1} / {images.length}
              </span>
              <button
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev + 1) % images.length : null
                  )
                }
                className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-lg font-bold transition-colors"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
