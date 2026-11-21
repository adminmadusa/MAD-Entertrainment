'use client';

import Link from 'next/link';
import React from 'react';

import { ImageWrapper } from '@/components/common/ImageWrapper';
import { getOptimizedImageUrl } from '@/utils/image';
import {
  EventCategory,
  EVENT_CATEGORY_LABELS,
  type deriveBookingEligibility,
} from '@mad/shared';
import type { Event } from '@mad/types';
import { Camera, Images } from '@mad/ui';

export interface EventCardBannerProps {
  event: Event;
  destinationUrl: string;
  isCompleted: boolean;
  hasPublishedGallery: boolean;
  photoCount: number;
  priority?: boolean;
  isActive?: boolean;
  tabIndex?: number;
  imageContainerClass: string;
  categoryColorClass: string;
  cta: ReturnType<typeof deriveBookingEligibility>['bookingCTA'];
}

export function EventCardBanner({
  event,
  destinationUrl,
  isCompleted,
  hasPublishedGallery,
  photoCount,
  priority = false,
  isActive = true,
  tabIndex,
  imageContainerClass,
  categoryColorClass,
  cta,
}: EventCardBannerProps) {
  // Lifecycle / Status Badge
  let statusBadge: React.ReactNode = null;
  if (isCompleted) {
    statusBadge = (
      <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-black/75 backdrop-blur-md text-text-muted rounded-full border border-white/10 flex items-center gap-1 shrink-0">
        <Camera className="w-2.5 h-2.5 sm:w-3 sm:h-3" aria-hidden="true" />
        Ended
      </span>
    );
  } else if (event.lifecycle === 'LIVE') {
    statusBadge = (
      <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-black/85 backdrop-blur-md text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1 shrink-0 shadow-glow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Live
      </span>
    );
  } else if (event.booking?.reason === 'BOOKING_NOT_STARTED') {
    statusBadge = (
      <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-accent-purple-light rounded-full border border-accent-purple/20 shrink-0">
        Soon
      </span>
    );
  }

  return (
    <Link
      href={destinationUrl}
      id={`event-card-${event.slug}`}
      className="block relative focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
      aria-label={
        isCompleted && hasPublishedGallery
          ? `View Happy Moments gallery for ${event.title}`
          : `View details for ${event.title}`
      }
      tabIndex={tabIndex ?? (isActive ? 0 : -1)}
    >
      <div className={`${imageContainerClass} overflow-hidden relative bg-white/5 shrink-0`}>
        {event.bannerImage?.url ? (
          <ImageWrapper
            src={getOptimizedImageUrl(event.bannerImage.url, 500)}
            alt={`Event banner for ${event.title}`}
            fill
            priority={priority}
            sizes="(max-width: 640px) 128px, (max-width: 1024px) 50vw, 360px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center ${
              isCompleted ? 'text-accent-pink' : 'text-accent-purple'
            }`}
            aria-hidden="true"
          >
            {isCompleted ? (
              <Camera className="w-8 h-8 sm:w-12 sm:h-12 opacity-40" />
            ) : (
              <span className="text-2xl sm:text-4xl opacity-70">🎧</span>
            )}
          </div>
        )}

        {/* Inactive carousel slide overlay */}
        {!isActive && <div className="absolute inset-0 bg-black/40 transition-opacity" />}

        {/* Top Badges Header */}
        <div className="absolute top-1.5 inset-x-1.5 sm:top-2.5 sm:inset-x-2.5 flex items-center justify-between gap-1.5 pointer-events-none z-10">
          <span
            className={`px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider bg-black/75 backdrop-blur-md rounded-full border truncate max-w-[90px] sm:max-w-[150px] ${categoryColorClass}`}
          >
            {EVENT_CATEGORY_LABELS[event.category as EventCategory] || event.category}
          </span>
          <div className="hidden sm:block">{statusBadge}</div>
        </div>

        {/* Photo Count Badge (Completed with gallery) */}
        {isCompleted && hasPublishedGallery && (
          <span className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold bg-accent-pink/90 backdrop-blur-md text-white rounded-full flex items-center gap-1 z-10 shadow-sm">
            <Images className="w-2.5 h-2.5" aria-hidden="true" />
            {photoCount} Photos
          </span>
        )}

        {/* Closed / Sold Out Overlay Banner */}
        {!isCompleted && cta.action === 'NONE' && (
          <span className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-[10px] sm:text-xs tracking-wider uppercase">
            {cta.text}
          </span>
        )}
      </div>
    </Link>
  );
}
