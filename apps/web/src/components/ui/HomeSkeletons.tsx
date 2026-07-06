import React from 'react';
import { Skeleton } from '@mad/ui';

/**
 * FeaturedEventsSkeleton
 * Mimics the 3D cover flow carousel layout to prevent layout shift.
 * Shows a main active card in the center and two flanked inactive cards on larger viewports.
 */
export function FeaturedEventsSkeleton() {
  return (
    <section
      className="py-16 overflow-hidden"
      aria-hidden="true"
    >
      <div className="container-mad">
        {/* Header Shimmer */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <Skeleton className="mb-2" width={112} height={16} />
            <Skeleton width={192} height={32} />
          </div>
          <Skeleton width={64} height={16} />
        </div>

        {/* Carousel Visual Skeleton */}
        <div className="relative w-full max-w-6xl mx-auto h-[450px] sm:h-[500px] mt-8 flex items-center justify-center">
          {/* Left Flank Card (Visible only on desktop/tablet) */}
          <div className="hidden md:flex flex-col w-[280px] h-[380px] bg-white/2 border border-white/5 rounded-2xl overflow-hidden opacity-30 transform -translate-x-48 scale-85 pointer-events-none">
            <Skeleton className="aspect-[4/3] w-full" rounded={false} />
            <div className="p-4 flex-grow space-y-3">
              <Skeleton width={80} height={12} />
              <Skeleton width={128} height={16} />
              <div className="space-y-1.5">
                <Skeleton className="w-full" height={8} />
                <Skeleton className="w-3/4" height={8} />
              </div>
            </div>
            <div className="p-4 border-t border-white/5 flex justify-between items-center bg-black/20">
              <Skeleton width={48} height={12} />
              <Skeleton width={64} height={28} rounded="rounded-lg" />
            </div>
          </div>

          {/* Center Main Card */}
          <div className="flex flex-col w-[260px] sm:w-[320px] h-[380px] sm:h-[450px] bg-white/3 border border-white/10 rounded-2xl overflow-hidden shadow-glow-sm z-10">
            {/* Banner Shimmer */}
            <div className="aspect-[4/3] w-full relative">
              <Skeleton className="absolute inset-0" rounded={false} />
              <Skeleton className="absolute top-3 left-3" width={64} height={20} rounded="rounded-full" />
            </div>

            {/* Details Shimmer */}
            <div className="p-4 flex-grow flex flex-col justify-between">
              <div className="space-y-3">
                {/* Date */}
                <Skeleton width={96} height={12} />
                {/* Title */}
                <Skeleton width={192} height={20} />
                {/* Description */}
                <div className="space-y-2">
                  <Skeleton className="w-full" height={12} />
                  <Skeleton className="w-5/6" height={12} />
                </div>
              </div>
            </div>

            {/* CTA Shimmer */}
            <div className="px-4 pb-4 pt-3 border-t border-white/5 flex justify-between items-center bg-black/40">
              <div className="space-y-1">
                <Skeleton width={56} height={8} />
                <Skeleton width={64} height={16} />
              </div>
              <Skeleton width={96} height={32} rounded="rounded-xl" />
            </div>
          </div>

          {/* Right Flank Card (Visible only on desktop/tablet) */}
          <div className="hidden md:flex flex-col w-[280px] h-[380px] bg-white/2 border border-white/5 rounded-2xl overflow-hidden opacity-30 transform translate-x-48 scale-85 pointer-events-none">
            <Skeleton className="aspect-[4/3] w-full" rounded={false} />
            <div className="p-4 flex-grow space-y-3">
              <Skeleton width={80} height={12} />
              <Skeleton width={128} height={16} />
              <div className="space-y-1.5">
                <Skeleton className="w-full" height={8} />
                <Skeleton className="w-3/4" height={8} />
              </div>
            </div>
            <div className="p-4 border-t border-white/5 flex justify-between items-center bg-black/20">
              <Skeleton width={48} height={12} />
              <Skeleton width={64} height={28} rounded="rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
