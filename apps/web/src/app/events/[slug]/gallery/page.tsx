import type { Metadata, ResolvingMetadata } from 'next';
import Link from 'next/link';

import { serverGetGallery } from '@/lib/api/server.service';
import { getCachedEvent } from '@/utils/cache-fetcher';
import { buildBreadcrumbJsonLd, SITE_URL } from '@/utils/seo';

import { PublicGalleryView } from './components/PublicGalleryView';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const event = await getCachedEvent(slug);
    if (!event) return { title: 'Gallery Not Found | MAD Entertainments' };

    return {
      title: `${event.title} - Gallery | MAD Entertainments`,
      description: `View the memories and highlights from ${event.title}.`,
      alternates: {
        canonical: `${SITE_URL}/events/${slug}/gallery`,
      },
    };
  } catch {
    return { title: 'Gallery | MAD Entertainments' };
  }
}

export default async function PublicGalleryPage({ params }: Props) {
  const { slug } = await params;

  let event;
  let gallery;

  try {
    event = await getCachedEvent(slug);
    gallery = await serverGetGallery(slug);
  } catch (_error) {
    // Handle API failures gracefully
  }

  if (!event) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-red-400">
        Event not found.
      </div>
    );
  }

  // Handle unpublished gallery state
  if (!gallery || !gallery.settings || !gallery.settings.published) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-bold text-white mb-4">Gallery Unavailable</h1>
        <p className="text-text-muted mb-8 max-w-md">
          The gallery for {event.title} is currently unavailable.
        </p>
        <Link
          href={`/events/${slug}`}
          className="px-6 py-3 bg-surface-elevated hover:bg-white/10 text-white rounded-full transition-colors border border-border-subtle font-medium"
        >
          Back to Event
        </Link>
      </div>
    );
  }

  const rawGallery = gallery as { items?: import('@mad/types').EventGalleryItem[]; gallery?: import('@mad/types').EventGalleryItem[] };
  const items = rawGallery.items || rawGallery.gallery || [];

  // Handle empty published gallery state
  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">📸</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Gallery</h1>
        <p className="text-text-muted mb-8 max-w-md">
          No photos have been published yet.<br/>Please check back later.
        </p>
        <Link
          href={`/events/${slug}`}
          className="px-6 py-3 bg-surface-elevated hover:bg-white/10 text-white rounded-full transition-colors border border-border-subtle font-medium"
        >
          Back to Event
        </Link>
      </div>
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbJsonLd([
              { name: 'Home', url: SITE_URL },
              { name: 'Events', url: `${SITE_URL}/events` },
              { name: event.title, url: `${SITE_URL}/events/${slug}` },
              { name: 'Gallery', url: `${SITE_URL}/events/${slug}/gallery` },
            ])
          ),
        }}
      />

      <PublicGalleryView event={event} gallery={{ ...gallery, items }} />
    </>
  );
}
