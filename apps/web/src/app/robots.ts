import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.madentertainments.net';

/**
 * robots.ts — Next.js App Router robots convention
 *
 * Disallows crawling of:
 * - /checkout  — ephemeral booking sessions, no SEO value
 * - /dashboard — authenticated-only user dashboard
 * - /api       — internal API proxy routes
 *
 * All other public-facing pages are allowed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/checkout/', '/dashboard/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
