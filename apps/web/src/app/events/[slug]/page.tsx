import type { Metadata, ResolvingMetadata } from 'next';

import { publicGetEventBySlug } from '@/lib/api/public.service';

import EventDetailClient from './EventDetailClient';

const SITE_URL = 'https://madentertainment.in';

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * Fetch the event once on the server. This data is reused for:
 *   1. generateMetadata  — open-graph / twitter cards
 *   2. buildJsonLd       — schema.org Event structured data
 *   3. EventDetailClient — passed as initialData to useQuery (no second fetch)
 *
 * Next.js deduplicates fetch calls with the same URL within a single render,
 * so even though we call publicGetEventBySlug in both generateMetadata and
 * EventPage, only one HTTP request is made via the React cache() layer.
 */
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const event = await publicGetEventBySlug(slug);

    if (!event) {
      return { title: 'Event Not Found | MAD Entertrainment' };
    }

    const previousImages = (await parent).openGraph?.images ?? [];
    const bannerUrl = event.bannerImage?.url;
    const description = event.description?.substring(0, 160) ?? 'Join this amazing event by MAD Entertrainment.';

    return {
      title: `${event.title} | MAD Entertrainment`,
      description,
      openGraph: {
        title: event.title,
        description,
        url: `${SITE_URL}/events/${slug}`,
        siteName: 'MAD Entertrainment',
        images: bannerUrl ? [{ url: bannerUrl, width: 1200, height: 630 }] : previousImages,
        locale: 'en_IN',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: event.title,
        description,
        images: bannerUrl ? [bannerUrl] : [],
      },
      alternates: {
        canonical: `${SITE_URL}/events/${slug}`,
      },
    };
  } catch {
    return { title: 'MAD Entertrainment' };
  }
}

/**
 * Builds a schema.org Event JSON-LD object.
 * This enables Google to show rich event cards (date, venue, price) in search results.
 *
 * Spec: https://schema.org/Event
 */
function buildEventJsonLd(
  event: Awaited<ReturnType<typeof publicGetEventBySlug>>,
  slug: string
): Record<string, unknown> {
  const minPrice =
    event.ticketTiers && event.ticketTiers.length > 0
      ? Math.min(...event.ticketTiers.map((t) => Math.max(0, t.price - (t.discount ?? 0))))
      : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    url: `${SITE_URL}/events/${slug}`,
    startDate: event.startDate,
    eventStatus: event.isSoldOut
      ? 'https://schema.org/EventSoldOut'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue ?? 'TBA',
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.venue ?? 'India',
        addressCountry: 'IN',
      },
    },
    ...(event.bannerImage?.url
      ? {
          image: [event.bannerImage.url],
        }
      : {}),
    ...(minPrice !== undefined
      ? {
          offers: {
            '@type': 'Offer',
            price: minPrice,
            priceCurrency: 'INR',
            availability: event.isSoldOut
              ? 'https://schema.org/SoldOut'
              : 'https://schema.org/InStock',
            url: `${SITE_URL}/events/${slug}`,
            validFrom: new Date().toISOString(),
          },
        }
      : {}),
    organizer: {
      '@type': 'Organization',
      name: event.organizerName ?? 'MAD Entertrainment',
      url: SITE_URL,
    },
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;

  // Server-side fetch: hydrates the client component without a second round-trip.
  // On fetch failure (e.g. during static build), initialEvent is undefined and
  // EventDetailClient falls back to its own useQuery fetch.
  let initialEvent: Awaited<ReturnType<typeof publicGetEventBySlug>> | undefined;
  try {
    initialEvent = await publicGetEventBySlug(slug);
  } catch {
    // Swallow — client will re-fetch
  }

  return (
    <>
      {/* JSON-LD structured data — enables Google rich event cards in search */}
      {initialEvent && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildEventJsonLd(initialEvent, slug)),
          }}
        />
      )}

      <EventDetailClient slug={slug} initialEvent={initialEvent} />
    </>
  );
}
