import { Metadata, ResolvingMetadata } from 'next';

import { publicGetEventBySlug } from '@/lib/api/public.service';

import EventDetailClient from './event-detail-client';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const event = await publicGetEventBySlug(slug);

    if (!event) {
      return {
        title: 'Event Not Found | MAD Entertainment',
      };
    }

    const previousImages = (await parent).openGraph?.images || [];
    const bannerUrl = event.bannerImage?.url;

    return {
      title: `${event.title} | MAD Entertainment`,
      description: event.description?.substring(0, 160) || 'Join this amazing event by MAD Entertainment.',
      openGraph: {
        title: event.title,
        description: event.description?.substring(0, 160),
        url: `https://madentertainment.in/events/${slug}`,
        siteName: 'MAD Entertainment',
        images: bannerUrl ? [{ url: bannerUrl, width: 1200, height: 630 }] : previousImages,
        locale: 'en_IN',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: event.title,
        description: event.description?.substring(0, 160),
        images: bannerUrl ? [bannerUrl] : [],
      },
    };
  } catch {
    return {
      title: 'MAD Entertainment',
    };
  }
}

export default function EventPage() {
  return <EventDetailClient />;
}
