'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { publicGetDJBySlug } from '@/lib/api/public.service';
import type { DJOperator } from '@mad/types';

import { DjHeroBanner } from './components/DjHeroBanner';
import { DjGalleryCarousel } from './components/DjGalleryCarousel';
import { DjSocialLinks } from './components/DjSocialLinks';
import { DjMobileActionBar } from './components/DjMobileActionBar';

interface DJDetailClientProps {
  slug: string;
  initialDJ?: DJOperator;
}

export default function DJDetailClient({ slug, initialDJ }: DJDetailClientProps) {
  const { data: dj, isLoading, error } = useQuery({
    queryKey: ['public-dj', slug],
    queryFn: () => publicGetDJBySlug(slug),
    initialData: initialDJ,
    staleTime: 60_000,
    initialDataUpdatedAt: initialDJ ? Date.now() : undefined,
  });

  if (isLoading) {
    return (
      <div className="pt-32 pb-20 min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-purple border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-text-muted">Loading profile...</p>
      </div>
    );
  }

  if (error || !dj) {
    return (
      <div className="pt-32 pb-20 min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-white mb-4">DJ Not Found</h1>
        <p className="text-text-muted mb-8">The DJ Operator you are looking for does not exist.</p>
        <Link href="/dj-operators" className="btn-gradient text-white px-6 py-2 rounded-xl">
          Back to DJs
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-background animate-pulse-once">
      {/* Compact Premium Hero */}
      <DjHeroBanner dj={dj} />

      {/* Details Section (Centered Single Column Layout) */}
      <section className="relative z-20 mt-8 pb-28 md:pb-20">
        <div className="container-mad">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Media Gallery Carousel */}
            {dj.galleryImages && dj.galleryImages.length > 0 && (
              <DjGalleryCarousel galleryImages={dj.galleryImages} />
            )}

            {/* Social Connect links */}
            <DjSocialLinks socialLinks={dj.socialLinks} />
          </div>
        </div>
      </section>

      {/* Sticky Mobile Bottom Navigation Menu */}
      <DjMobileActionBar djName={dj.name} />
    </div>
  );
}
