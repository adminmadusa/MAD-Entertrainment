import type { MetadataRoute } from 'next';

import { API_URL } from '@mad/shared/config/frontend';

const SITE_URL = 'https://madentertainment.in';

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
    url: `${SITE_URL}/my-booking`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.4,
  },
  {
    url: `${SITE_URL}/login`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.3,
  },
];

/** Fetch all published event slugs for dynamic sitemap entries */
async function getEventSlugs(): Promise<string[]> {
  if (!API_URL || !API_URL.startsWith('http')) {
    console.warn(
      'Sitemap: NEXT_PUBLIC_API_URL missing or invalid. Skipping dynamic sitemap entries.'
    );
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    // Fetch up to 100 events to generate slug URLs (matches backend maximum allowed limit)
    const res = await fetch(`${API_URL}/events?page=1&limit=100`, {
      next: { revalidate: 3600 }, // Sitemap is rebuilt hourly
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const body = await res.json();
    const events: { slug?: string }[] = body?.data?.events ?? [];
    return events.map((e) => e.slug).filter((s): s is string => Boolean(s));
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(
      'Sitemap: Failed to fetch dynamic event sitemap entries:',
      error
    );
    return [];
  }
}

/** Fetch all published DJ operator slugs for dynamic sitemap entries */
async function getDJSlugs(): Promise<string[]> {
  if (!API_URL || !API_URL.startsWith('http')) {
    console.warn(
      'Sitemap: NEXT_PUBLIC_API_URL missing or invalid. Skipping dynamic sitemap entries.'
    );
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    // Fetch up to 100 DJ operators to generate slug URLs (matches backend maximum allowed limit)
    const res = await fetch(`${API_URL}/dj-operators?limit=100`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const body = await res.json();
    const payload = body?.data ?? {};
    const djs: { slug?: string }[] = payload.data ?? payload.djOperators ?? payload.djs ?? [];
    return djs.map((d) => d.slug).filter((s): s is string => Boolean(s));
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(
      'Sitemap: Failed to fetch dynamic DJ sitemap entries:',
      error
    );
    return [];
  }
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
