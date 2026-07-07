import { publicGetEventBySlug } from '@/lib/api/public.service';

import { createCachedFetcher } from './cache-fetcher';

export const getCachedEvent = createCachedFetcher(publicGetEventBySlug);
