'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo } from 'react';

import { formatEventDate } from '@/utils/date';
import {
  formatMoney,
  deriveBookingEligibility,
} from '@mad/shared';
import type { Event } from '@mad/types';
import { Button, CalendarIcon } from '@mad/ui';

import { EventCardBanner } from './EventCardBanner';

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

  let buttonSizingClass = 'min-h-[36px] sm:min-h-[38px] px-3.5 sm:px-4 py-1.5 text-xs';
  if (isCatalog) {
    buttonSizingClass = 'min-h-[30px] sm:min-h-[36px] px-3 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs';
  } else if (isCompact) {
    buttonSizingClass = 'min-h-[28px] sm:min-h-[30px] px-2.5 py-1 text-[10px] sm:text-[11px] rounded-lg';
  }

  const imageContainerClass = isCatalog
    ? 'w-28 xs:w-32 sm:w-full aspect-square sm:aspect-[16/9]'
    : 'w-full aspect-[16/9]';

  const rootContainerClass = isCatalog ? 'flex flex-row sm:flex-col' : 'flex flex-col';

  return (
    <div
      className={`group relative glass rounded-2xl border overflow-hidden transition-all duration-300 ${rootContainerClass} h-full ${borderClass} ${className}`}
    >
      {/* ─── Banner Image Link ─── */}
      <EventCardBanner
        event={event}
        destinationUrl={destinationUrl}
        isCompleted={isCompleted}
        hasPublishedGallery={hasPublishedGallery}
        photoCount={photoCount}
        priority={priority}
        isActive={isActive}
        tabIndex={tabIndex}
        imageContainerClass={imageContainerClass}
        categoryColorClass={categoryColorClass}
        cta={cta}
      />

      {/* ─── Card Content Details & Footer ─── */}
      <div className="flex flex-col flex-1 min-w-0 bg-black/20 justify-between">
        {/* Details Link */}
        <Link
          href={destinationUrl}
          className={`block p-3 sm:p-4 flex-1 focus:outline-none focus-visible:ring-2 rounded-lg ${
            isCompleted ? 'focus-visible:ring-accent-pink' : 'focus-visible:ring-accent-purple'
          }`}
          tabIndex={tabIndex ?? (isActive ? 0 : -1)}
        >
          <div
            className={`text-text-secondary ${
              isCompact ? 'text-[9px] sm:text-[10px] mb-0.5' : 'text-[10px] sm:text-[11px] mb-1'
            } font-semibold uppercase tracking-wider flex items-center gap-1.5`}
          >
            <CalendarIcon className={`w-3 h-3 ${dateColorClass}`} />
            <span className="truncate">{formatEventDate(event.startDate)}</span>
          </div>

          <h3
            className={`text-white font-bold line-clamp-1 mb-1 transition-colors ${titleSizeClass} ${
              isCompleted ? 'group-hover:text-accent-pink-light' : 'group-hover:text-accent-purple-light'
            }`}
          >
            {event.title}
          </h3>

          <p className={`text-text-secondary ${descriptionClass}`}>{event.description}</p>
        </Link>

        {/* ─── Card Footer Action Block ─── */}
        <div className="border-t border-border-subtle/30 bg-black/35 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 mt-auto">
          {isCompleted ? (
            <span
              className={`font-semibold text-accent-pink-light ${
                isCompact ? 'text-[10px] sm:text-[11px]' : 'text-[10px] sm:text-xs'
              }`}
            >
              {hasPublishedGallery ? 'Photo Gallery' : 'Event Ended'}
            </span>
          ) : (
            <div className="min-w-0">
              <div className="text-[9px] text-text-muted font-medium leading-none mb-1">Tickets from</div>
              <div className="text-white font-black text-xs sm:text-sm font-mono leading-none truncate">
                {formatMoney(minPrice, event.currency)}
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
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
            className={`font-bold rounded-xl transition-all flex items-center justify-center text-center shrink-0 cursor-pointer p-0 ${buttonSizingClass} ${buttonStyleClass}`}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
});
