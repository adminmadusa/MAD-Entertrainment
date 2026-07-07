import { publicGetDJBySlug } from '@/lib/api/public.service';

import { createCachedFetcher } from './cache-fetcher';

export const getCachedDJ = createCachedFetcher(publicGetDJBySlug);
