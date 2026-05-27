import type { MetadataRoute } from "next";

import { API_URL } from "@mad/shared/config/frontend";

const SITE_URL = "https://madentertainment.in";
const SITEMAP_FETCH_TIMEOUT_MS = 5000;
const SITEMAP_LIMIT = 200;

/** Static routes that are always in the sitemap */
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1.0,
  },
  {
    url: `${SITE_URL}/events`,
    lastModified: new Date(),
    changeFrequency: "hourly",
    priority: 0.9,
  },
  {
    url: `${SITE_URL}/dj-operators`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  },
  {
    url: `${SITE_URL}/my-booking`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.4,
  },
  {
    url: `${SITE_URL}/login`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.3,
  },
  {
    url: `${SITE_URL}/register`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.3,
  },
];

/** Fetch all published event slugs for dynamic sitemap entries */
async function getEventSlugs(): Promise<string[]> {
  try {
    const res = await fetchWithTimeout(
      `${API_URL}/events?page=1&limit=${SITEMAP_LIMIT}`,
      {
        next: { revalidate: 3600 }, // Sitemap is rebuilt hourly
      },
    );
    if (!res.ok) return [];
    const body = await res.json();
    const events: { slug?: string }[] = body?.data?.events ?? [];
    return events
      .map((e) => e.slug?.trim())
      .filter((s): s is string => Boolean(s));
  } catch {
    return [];
  }
}

/** Fetch all published DJ operator slugs for dynamic sitemap entries */
async function getDJSlugs(): Promise<string[]> {
  try {
    const res = await fetchWithTimeout(
      `${API_URL}/dj-operators?limit=${SITEMAP_LIMIT}`,
      {
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return [];
    const body = await res.json();
    const payload = body?.data ?? {};
    const djs: { slug?: string }[] =
      payload.data ?? payload.djOperators ?? payload.djs ?? [];
    return djs
      .map((d) => d.slug?.trim())
      .filter((s): s is string => Boolean(s));
  } catch {
    return [];
  }
}

function withTimeoutSignal(timeoutMs: number): {
  signal: AbortSignal;
  clear: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const { signal, clear } = withTimeoutSignal(SITEMAP_FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal,
    });
  } finally {
    clear();
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [eventSlugs, djSlugs] = await Promise.all([
    getEventSlugs(),
    getDJSlugs(),
  ]);

  const eventRoutes: MetadataRoute.Sitemap = eventSlugs.map((slug) => ({
    url: `${SITE_URL}/events/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  const djRoutes: MetadataRoute.Sitemap = djSlugs.map((slug) => ({
    url: `${SITE_URL}/dj-operators/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...STATIC_ROUTES, ...eventRoutes, ...djRoutes];
}
