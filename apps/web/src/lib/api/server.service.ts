import { API_URL } from '@mad/shared/config/frontend';
import type { DJOperator, Event } from '@mad/types';

import 'server-only';

// Detect Next.js build compilation phase
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

export type SafeFetchOptions<T> = RequestInit & {
  timeoutMs?: number;
  revalidate?: number;
  retries?: number;
  label?: string;
} & (
  | { failFast: true; fallback?: T }
  | { failFast?: false; fallback: T }
);

/**
 * Centrally manages all server-side HTTP data fetching.
 * Handles timeouts, build-phase detection, retry backoffs, and structured logs.
 */
type UnpackedOptions<T> = RequestInit & {
  fallback?: T;
  failFast?: boolean;
  timeoutMs?: number;
  revalidate?: number;
  retries?: number;
  label?: string;
};

export async function safeServerFetch<T>(
  endpoint: string,
  options: SafeFetchOptions<T>
): Promise<T> {
  const {
    fallback,
    failFast = false,
    timeoutMs = 8000,
    revalidate = 60,
    retries = 1,
    label = 'Server Fetch',
    headers,
    ...rest
  } = options as UnpackedOptions<T>;

  if (isBuildPhase) {
    console.warn(`[Build] Skipped ${label} fetch during production compilation.`);
    return fallback as T;
  }

  const url = `${API_URL}${endpoint}`;
  const method = (rest.method ?? 'GET').toUpperCase();
  const isIdempotent = ['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method);
  let attempt = 0;

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  while (attempt <= retries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...rest,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        next: { revalidate },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Disable retry for client errors (4xx)
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`HTTP ${res.status}: Client request invalid. Skipping retry.`);
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Server returned error state.`);
      }

      const body = await res.json();
      return (body?.data ?? body) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      const isTimeout = error instanceof DOMException && error.name === 'AbortError';
      let errorMsg = String(error);
      if (isTimeout) {
        errorMsg = `Timeout after ${timeoutMs}ms`;
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      const isClientError = errorMsg.includes('Client request invalid');

      // Only retry if eligible (not client error, idempotent method, and retries remain)
      if (attempt <= retries && isIdempotent && !isClientError) {
        const backoffMs = attempt * 200;
        console.warn(`[Server Fetch] Retrying ${label} (${attempt}/${retries}) in ${backoffMs}ms due to: ${errorMsg}`);
        await delay(backoffMs);
        continue;
      }

      if (failFast) {
        console.error(`[Server Fetch Error] ${label} failed permanently on attempt ${attempt}: ${errorMsg}`);
        throw error;
      }

      console.error(`[Server Fetch Error] ${label} failed permanently after ${attempt} attempts. Fallback returned. Error: ${errorMsg}`);
      return fallback as T;
    }
  }

  return fallback as T;
}

export async function serverGetFeaturedEvents(): Promise<Event[]> {
  const payload = await safeServerFetch<{ events: Event[] }>(
    '/events?isFeatured=true&page=1&limit=6',
    {
      fallback: { events: [] },
      revalidate: 60,
      timeoutMs: 8000,
      retries: 1,
      label: 'Featured Events',
    }
  );
  
  const featuredEvents = Array.isArray(payload.events) ? [...payload.events] : [];

  // Fallback: If less than 6 featured events, fill the remaining with newest upcoming events
  if (featuredEvents.length < 6) {
    const fallbackPayload = await safeServerFetch<{ events: Event[] }>(
      `/events?page=1&limit=${6 + featuredEvents.length}`,
      {
        fallback: { events: [] },
        revalidate: 60,
        timeoutMs: 8000,
        retries: 1,
        label: 'Fallback Featured Events',
      }
    );
    const fallbackEvents = Array.isArray(fallbackPayload.events) ? fallbackPayload.events : [];
    
    const featuredIds = new Set(featuredEvents.map(e => String(e._id)));
    for (const event of fallbackEvents) {
      if (!featuredIds.has(String(event._id))) {
        featuredEvents.push(event);
        if (featuredEvents.length >= 6) break;
      }
    }
  }

  return featuredEvents;
}

export async function serverGetCompletedEvents(): Promise<Event[]> {
  const payload = await safeServerFetch<{ events: Event[] }>(
    '/events?status=completed&page=1&limit=6',
    {
      fallback: { events: [] },
      revalidate: 60,
      timeoutMs: 8000,
      retries: 1,
      label: 'Completed Events',
    }
  );
  return Array.isArray(payload.events) ? payload.events : [];
}

export async function serverGetDJs(): Promise<DJOperator[]> {
  const payload = await safeServerFetch<{
    data?: DJOperator[];
    djOperators?: DJOperator[];
    djs?: DJOperator[];
  }>(
    '/dj-operators?limit=6&includeTotal=false',
    {
      fallback: {},
      revalidate: 60,
      timeoutMs: 8000,
      retries: 1,
      label: 'DJ Operators',
    }
  );

  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (Array.isArray(payload.djOperators)) {
    return payload.djOperators;
  }
  if (Array.isArray(payload.djs)) {
    return payload.djs;
  }
  return [];
}
