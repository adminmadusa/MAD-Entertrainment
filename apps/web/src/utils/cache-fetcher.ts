import { cache } from 'react';

/**
 * Request-scoped cached helper builder.
 * Wraps a service function in React's request-scoped cache.
 * This deduplicates fetches within the same Next.js render cycle
 * (e.g. between generateMetadata and Page render).
 */
export function createCachedFetcher<T, Args extends unknown[]>(
  fetcher: (...args: Args) => Promise<T>
): (...args: Args) => Promise<T> {
  return cache(fetcher);
}
