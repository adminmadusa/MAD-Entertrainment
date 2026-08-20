import { Skeleton } from '@mad/ui';

const COMPLETED_EVENTS_SKELETON_COUNT = 3;

/**
 * UpcomingEventsSkeleton
 * Renders compact shimmer cards matching the 16:9 carousel.
 */
export function UpcomingEventsSkeleton() {
  return (
    <section
      className="pt-6 sm:pt-8 pb-12 sm:pb-16 overflow-hidden"
      aria-hidden="true"
    >
      <div className="container-mad">
        {/* Header Shimmer */}
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <Skeleton className="mb-2" width={112} height={14} />
            <Skeleton width={180} height={28} />
          </div>
          <Skeleton width={64} height={14} />
        </div>

        {/* Carousel Visual Skeleton */}
        <div className="relative w-full max-w-6xl mx-auto h-[270px] xs:h-[300px] sm:h-[360px] md:h-[390px] mt-3 sm:mt-6 flex items-center justify-center">
          {/* Left Flank Card (Visible only on desktop/tablet) */}
          <div className="hidden md:flex flex-col w-[260px] h-[340px] bg-white/2 border border-white/5 rounded-2xl overflow-hidden opacity-30 transform -translate-x-48 scale-85 pointer-events-none">
            <Skeleton className="aspect-[16/9] w-full" rounded={false} />
            <div className="p-3 flex-grow space-y-2">
              <Skeleton width={80} height={10} />
              <Skeleton width={128} height={14} />
              <div className="space-y-1">
                <Skeleton className="w-full" height={8} />
                <Skeleton className="w-3/4" height={8} />
              </div>
            </div>
            <div className="p-3 border-t border-white/5 flex justify-between items-center bg-black/20">
              <Skeleton width={48} height={10} />
              <Skeleton width={60} height={26} rounded="rounded-lg" />
            </div>
          </div>

          {/* Center Main Card */}
          <div className="flex flex-col w-[220px] xs:w-[250px] sm:w-[290px] md:w-[320px] h-[260px] xs:h-[290px] sm:h-[350px] md:h-[380px] bg-white/3 border border-white/10 rounded-2xl overflow-hidden shadow-glow-sm z-10">
            {/* Banner Shimmer */}
            <div className="aspect-[16/9] w-full relative">
              <Skeleton className="absolute inset-0" rounded={false} />
              <Skeleton className="absolute top-2.5 left-2.5" width={56} height={16} rounded="rounded-full" />
            </div>

            {/* Details Shimmer */}
            <div className="p-2.5 sm:p-3.5 flex-grow flex flex-col justify-between">
              <div className="space-y-1.5">
                {/* Date */}
                <Skeleton width={80} height={10} />
                {/* Title */}
                <Skeleton width={160} height={14} />
                {/* Description */}
                <div className="space-y-1">
                  <Skeleton className="w-full" height={10} />
                  <Skeleton className="w-4/5" height={10} />
                </div>
              </div>
            </div>

            {/* CTA Shimmer */}
            <div className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 border-t border-white/5 flex justify-between items-center bg-black/40">
              <div className="space-y-0.5">
                <Skeleton width={48} height={8} />
                <Skeleton width={56} height={12} />
              </div>
              <Skeleton width={72} height={28} rounded="rounded-xl" />
            </div>
          </div>

          {/* Right Flank Card (Visible only on desktop/tablet) */}
          <div className="hidden md:flex flex-col w-[260px] h-[340px] bg-white/2 border border-white/5 rounded-2xl overflow-hidden opacity-30 transform translate-x-48 scale-85 pointer-events-none">
            <Skeleton className="aspect-[16/9] w-full" rounded={false} />
            <div className="p-3 flex-grow space-y-2">
              <Skeleton width={80} height={10} />
              <Skeleton width={128} height={14} />
              <div className="space-y-1">
                <Skeleton className="w-full" height={8} />
                <Skeleton className="w-3/4" height={8} />
              </div>
            </div>
            <div className="p-3 border-t border-white/5 flex justify-between items-center bg-black/20">
              <Skeleton width={48} height={10} />
              <Skeleton width={60} height={26} rounded="rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * CompletedEventsSkeleton
 * Renders exactly 3 compact cards matching the Completed grid.
 */
export function CompletedEventsSkeleton() {
  return (
    <section
      className="py-8 sm:py-12 overflow-hidden bg-background/20"
      aria-hidden="true"
    >
      <div className="container-mad">
        {/* Header Shimmer */}
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <Skeleton className="mb-2" width={112} height={14} />
            <Skeleton width={180} height={28} />
          </div>
          <div className="flex gap-2">
            <Skeleton width={40} height={40} rounded="rounded-full" />
            <Skeleton width={40} height={40} rounded="rounded-full" />
          </div>
        </div>

        {/* Carousel Track Shimmer */}
        <div className="flex overflow-hidden gap-3 sm:gap-4 pb-4 pt-1 px-1 -mx-1">
          {Array.from({ length: COMPLETED_EVENTS_SKELETON_COUNT }).map((_, index) => (
            <div
              key={index}
              className="w-[200px] xs:w-[220px] sm:w-[240px] md:w-[260px] shrink-0 flex flex-col h-full bg-white/2 border border-white/5 rounded-2xl overflow-hidden pointer-events-none"
            >
              {/* Image Banner Shimmer */}
              <div className="aspect-[16/9] w-full relative bg-white/5 flex-shrink-0">
                <Skeleton className="absolute inset-0" rounded={false} />
                {/* Category Badge */}
                <Skeleton className="absolute top-2.5 left-2.5" width={50} height={14} rounded="rounded-full" />
                {/* Ended Indicator */}
                <Skeleton className="absolute top-2.5 right-2.5" width={44} height={14} rounded="rounded-full" />
              </div>

              {/* Card Details Shimmer */}
              <div className="p-2.5 sm:p-3 flex-grow flex flex-col justify-between bg-black/10">
                <div className="space-y-1">
                  {/* Date */}
                  <Skeleton width={70} height={9} />
                  {/* Title */}
                  <Skeleton width={130} height={12} />
                  {/* Description */}
                  <Skeleton className="w-full" height={9} />
                </div>
              </div>

              {/* Action Panel Shimmer */}
              <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 border-t border-white/5 flex justify-between items-center bg-black/40">
                <Skeleton width={60} height={9} />
                <Skeleton width={70} height={24} rounded="rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
