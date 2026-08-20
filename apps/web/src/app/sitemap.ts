import type { MetadataRoute } from 'next';

import { safeServerFetch } from '@/lib/api/server.service';

const SITE_URL = 'https://www.madentertainments.net';

/** Static routes that are always in the sitemap */
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1.0,
  },
  {
    url: `${SITE_URL}/events`,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.9,
  },
  {
    url: `${SITE_URL}/dj-operators`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    url: `${SITE_URL}/tickets`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  },
];

interface SitemapEventResponse {
  events?: { slug?: string }[];
}

interface SitemapDJResponse {
  data?: { slug?: string }[];
  djOperators?: { slug?: string }[];
  djs?: { slug?: string }[];
}

/** Fetch all published event slugs for dynamic sitemap entries */
async function getEventSlugs(): Promise<string[]> {
  const body = await safeServerFetch<SitemapEventResponse>(
    '/events?page=1&limit=100',
    {
      fallback: { events: [] },
      revalidate: 3600,
      timeoutMs: 5000,
      label: 'Sitemap Event Slugs',
    }
  );
  const events = body?.events ?? [];
  return events.map((e) => e.slug).filter((s): s is string => Boolean(s));
}

/** Fetch all published DJ operator slugs for dynamic sitemap entries */
async function getDJSlugs(): Promise<string[]> {
  const body = await safeServerFetch<SitemapDJResponse>(
    '/dj-operators?limit=100',
    {
      fallback: {},
      revalidate: 3600,
      timeoutMs: 5000,
      label: 'Sitemap DJ Slugs',
    }
  );
  const djs = body?.data ?? body?.djOperators ?? body?.djs ?? [];
  return djs.map((d) => d.slug).filter((s): s is string => Boolean(s));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [eventSlugs, djSlugs] = await Promise.all([getEventSlugs(), getDJSlugs()]);

  const eventRoutes: MetadataRoute.Sitemap = eventSlugs.map((slug) => ({
    url: `${SITE_URL}/events/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  const djRoutes: MetadataRoute.Sitemap = djSlugs.map((slug) => ({
    url: `${SITE_URL}/dj-operators/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...STATIC_ROUTES, ...eventRoutes, ...djRoutes];
}
