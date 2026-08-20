'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo } from 'react';

import { ImageWrapper } from '@/components/common/ImageWrapper';
import { formatEventDate } from '@/utils/date';
import { getOptimizedImageUrl } from '@/utils/image';
import {
  EventCategory,
  EVENT_CATEGORY_LABELS,
  formatMoney,
  deriveBookingEligibility,
} from '@mad/shared';
import type { Event } from '@mad/types';
import { CalendarIcon, Camera, Images } from '@mad/ui';

export interface EventCardProps {
  event: Event;
  variant?: 'active' | 'completed' | 'catalog';
  density?: 'compact' | 'normal';
  priority?: boolean;
  className?: string;
  isActive?: boolean;
  tabIndex?: number;
}

export const EventCard = memo(function EventCard({
  event,
  variant = 'active',
  density = 'normal',
  priority = false,
  className = '',
  isActive = true,
  tabIndex,
}: EventCardProps) {
  const router = useRouter();

  const isCompleted = variant === 'completed' || event.lifecycle === 'COMPLETED';
  const photoCount = event.gallery?.itemCount ?? 0;
  const hasPublishedGallery = event.gallery?.status === 'PUBLISHED' && photoCount > 0;

  // Determine target destination
  let destinationUrl = `/events/${event.slug}`;
  if (isCompleted && hasPublishedGallery) {
    destinationUrl = `/events/${event.slug}/gallery`;
  }

  const eligibility = deriveBookingEligibility(event);
  const cta = eligibility.bookingCTA;
  const minPrice =
    event.ticketTiers && event.ticketTiers.length > 0
      ? Math.min(...event.ticketTiers.map((t) => t.price))
      : 0;

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

  const dateColorClass = isCompleted ? 'text-accent-pink-light' : 'text-accent-purple-light';
  const categoryColorClass = isCompleted
    ? 'text-accent-pink border-accent-pink/20'
    : 'text-accent-purple-light border-accent-purple/20';

  const isCompact = density === 'compact';

  let borderClass = 'border-border-subtle cursor-pointer';
  if (isCompleted) {
    borderClass = 'border-border-subtle hover:border-accent-pink/40 hover:shadow-glow-pink-sm';
  } else if (isActive) {
    borderClass = 'border-accent-purple/40 hover:border-accent-purple/60 shadow-glow-sm';
  }

  let buttonStyleClass = 'text-white btn-gradient shadow-glow-sm hover:scale-105 active:scale-95';
  if (isCompleted) {
    buttonStyleClass =
      'text-accent-pink bg-accent-pink/10 border border-accent-pink/30 hover:bg-accent-pink/20 hover:scale-105 active:scale-95';
  } else if (cta.disabled || cta.action === 'NONE') {
    buttonStyleClass = 'bg-white/5 border border-white/5 text-text-muted cursor-not-allowed';
  }

  let buttonText = cta.text;
  if (isCompleted) {
    buttonText = hasPublishedGallery ? 'Gallery →' : 'View Event →';
  }

  const isCatalog = variant === 'catalog';

  let cardDetailsPadding = 'p-3.5 sm:p-4';
  if (isCatalog) {
    cardDetailsPadding = 'p-2.5 sm:p-4 justify-between';
  } else if (isCompact) {
    cardDetailsPadding = 'p-2.5 sm:p-3';
  }

  let titleSizeClass = 'text-sm sm:text-base';
  if (isCatalog) {
    titleSizeClass = 'text-xs xs:text-sm sm:text-base';
  } else if (isCompact) {
    titleSizeClass = 'text-xs';
  }

  let descriptionClass = 'text-xs line-clamp-2 leading-relaxed mb-2.5';
  if (isCatalog) {
    descriptionClass = 'hidden sm:block text-xs line-clamp-2 leading-relaxed mb-2.5';
  } else if (isCompact) {
    descriptionClass = 'text-[10px] line-clamp-1 mb-1';
  }

  let footerContainerClass = 'border-t border-border-subtle/30 bg-black/35 px-3.5 py-2.5 sm:px-4 sm:py-3';
  if (isCatalog) {
    footerContainerClass =
      'pt-1 sm:pt-0 sm:border-t sm:border-border-subtle/30 sm:bg-black/35 sm:px-4 sm:py-3 sm:-mx-4 sm:-mb-4';
  } else if (isCompact) {
    footerContainerClass = 'border-t border-border-subtle/30 bg-black/35 px-2.5 py-1.5 sm:px-3 sm:py-2';
  }

  let buttonSizingClass = 'min-h-[36px] sm:min-h-[40px] px-3 sm:px-3.5 py-1.5 text-xs';
  if (isCatalog) {
    buttonSizingClass = 'min-h-[30px] sm:min-h-[38px] px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-xs';
  } else if (isCompact) {
    buttonSizingClass = 'min-h-[28px] sm:min-h-[30px] px-2.5 py-1 text-[10px] sm:text-[11px] rounded-lg';
  }

  const imageContainerClass = isCatalog
    ? 'w-28 xs:w-32 sm:w-full aspect-square sm:aspect-[16/9]'
    : 'w-full aspect-[16/9]';

  const rootContainerClass = isCatalog ? 'flex flex-row sm:flex-col' : 'flex flex-col';
  const linkContainerClass = isCatalog ? 'flex-row sm:flex-col flex-1 min-w-0' : 'flex-col';

  return (
    <div
      className={`group relative glass rounded-2xl border overflow-hidden transition-all duration-300 ${rootContainerClass} h-full ${borderClass} ${className}`}
    >
      <Link
        href={destinationUrl}
        id={`event-card-${event.slug}`}
        className={`flex ${linkContainerClass} h-full focus:outline-none focus-visible:ring-2 ${
          isCompleted ? 'focus-visible:ring-accent-pink' : 'focus-visible:ring-accent-purple'
        }`}
        aria-label={
          isCompleted && hasPublishedGallery
            ? `View Happy Moments gallery for ${event.title}`
            : `View details for ${event.title}`
        }
        tabIndex={tabIndex ?? (isActive ? 0 : -1)}
      >
        {/* ─── Banner Image (Square on mobile catalog, 16:9 on desktop & carousel) ─── */}
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

          {/* Top Badges Header (Hidden or compact on mobile thumbnail) */}
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

        {/* ─── Card Content Details & Inline Mobile Footer ────────────────────────── */}
        <div className={`flex flex-col flex-1 min-w-0 bg-black/20 ${cardDetailsPadding}`}>
          <div>
            <div
              className={`text-text-secondary ${
                isCompact ? 'text-[9px] sm:text-[10px] mb-0.5' : 'text-[10px] sm:text-[11px] mb-1'
              } font-semibold uppercase tracking-wider flex items-center gap-1.5`}
            >
              <CalendarIcon className={`w-3 h-3 ${dateColorClass}`} />
              <span className="truncate">{formatEventDate(event.startDate)}</span>
            </div>

            <h3
              className={`text-white font-bold line-clamp-1 sm:line-clamp-1 mb-0.5 transition-colors ${titleSizeClass} ${
                isCompleted ? 'group-hover:text-accent-pink-light' : 'group-hover:text-accent-purple-light'
              }`}
            >
              {event.title}
            </h3>

            <p className={`text-text-secondary ${descriptionClass} flex-grow`}>{event.description}</p>
          </div>

          {/* ─── Card Footer Action Block ────────────────────── */}
          <div className={`flex items-center justify-between mt-auto w-full ${footerContainerClass}`}>
            {isCompleted ? (
              <span
                className={`font-semibold text-accent-pink-light ${
                  isCompact ? 'text-[10px] sm:text-[11px]' : 'text-[10px] sm:text-xs'
                }`}
              >
                {hasPublishedGallery ? 'Photo Gallery' : 'Event Ended'}
              </span>
            ) : (
              <div>
                <div className="text-[9px] text-text-muted font-medium leading-none mb-0.5">Tickets from</div>
                <div className="text-white font-black text-xs sm:text-sm font-mono leading-none">
                  {formatMoney(minPrice, event.currency)}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isCompleted) {
                  router.push(destinationUrl);
                  return;
                }
                if (cta.action === 'NONE' || cta.disabled) return;
                if (cta.action === 'BOOK') {
                  router.push(`/events/${event.slug}?modal=booking`);
                } else {
                  router.push(`/events/${event.slug}`);
                }
              }}
              disabled={!isCompleted && (cta.disabled || cta.action === 'NONE')}
              className={`font-bold rounded-xl transition-all flex items-center justify-center text-center cursor-pointer ${buttonSizingClass} ${buttonStyleClass}`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
});
