import { cache } from 'react';
import { publicGetEventBySlug } from '@/lib/api/public.service';
import { Event } from '@mad/types';

/**
 * Request-scoped cached helper to retrieve event by slug on the server.
 * This deduplicates duplicate fetches within the same Next.js render cycle
 * (e.g. between generateMetadata, JSON-LD schema generation, and Page render).
 */
export const getCachedEvent = cache(async (slug: string): Promise<Event> => {
  // eslint-disable-next-line no-console
  console.log(`[EVENT_FETCH] getCachedEvent cache evaluation for slug: ${slug}`);
  return publicGetEventBySlug(slug);
});
