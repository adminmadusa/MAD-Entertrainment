'use client';

import { useState, type RefObject } from 'react';
import { ImageWrapper } from '@/components/common/ImageWrapper';
import type { Event as EventData } from '@mad/types';

interface EventHeroBannerProps {
  event: EventData;
  heroImageRef: RefObject<HTMLDivElement | null>;
  showDateTime: string;
  doorsOpenText: string;
  isCompleted: boolean;
}

export function EventHeroBanner({
  event,
  heroImageRef,
  showDateTime,
  doorsOpenText,
  isCompleted,
}: EventHeroBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Cinematic Banner Card */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[2.2/1] max-h-[420px] rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-surface-elevated">
        {event.bannerImage?.url ? (
          <div ref={heroImageRef} className="absolute inset-0" style={{ transformOrigin: 'center' }}>
            <ImageWrapper
              src={event.bannerImage.url}
              alt={event.title}
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent-purple/20 via-background to-accent-pink/10 flex items-center justify-center">
            <span className="text-4xl font-extrabold text-white/20">{event.title}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Top Action Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {event.category && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/15 text-white rounded-full">
                <span>🎭</span> {event.category.replace('_', ' ')}
              </span>
            )}
            {event.lifecycle === 'LIVE' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-emerald-500/90 text-white rounded-full shadow-glow-sm backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                Live Now
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 text-text-muted rounded-full">
                Ended
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-xs font-medium text-white transition-all active:scale-95 shadow-lg cursor-pointer"
            aria-label={copied ? 'Event link copied to clipboard' : 'Share event'}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l5.128-2.564m0 5.644l-5.128-2.564M19 12a3 3 0 11-6 0 3 3 0 016 0zm-10 6a3 3 0 11-6 0 3 3 0 016 0zm0-12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Header Details Row */}
      <div className="pt-2 pb-5 border-b border-border-subtle/40 space-y-2.5">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
          {event.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary">
          <span className="flex items-center gap-1.5 text-text-primary font-medium">
            <svg className="w-4 h-4 text-accent-purple-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {showDateTime}
          </span>

          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Doors open {doorsOpenText}
          </span>

          {event.venue && (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{event.venue}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
