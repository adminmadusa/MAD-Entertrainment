import { cache } from 'react';

import { publicGetDJBySlug } from '@/lib/api/public.service';
import type { DJOperator } from '@mad/types';

/**
 * Request-scoped cached helper to retrieve DJ operator by slug on the server.
 * This deduplicates fetches within the same Next.js render cycle
 * (e.g. between generateMetadata and Page render).
 */
export const getCachedDJ = cache(async (slug: string): Promise<DJOperator> => {
  return publicGetDJBySlug(slug);
});
