import 'server-only';
import { Event, DJOperator } from '@mad/types';
import { PublicCategory } from './public.service';
import { API_URL } from '@mad/shared/config/frontend';

// Cache configuration
const CACHE_OPTIONS = {
  next: {
    revalidate: 60, // Cache for 60 seconds (ISR)
  },
};

/**
 * Fetch with timeout protection to prevent Safari streaming stalls.
 * Uses AbortController to enforce 8-second timeout on all server-side data fetches.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { next?: { revalidate?: number } } = {},
  timeoutMs: number = 8000
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function serverGetFeaturedEvents(): Promise<Event[]> {
  try {
    const url = `${API_URL}/events?page=1&limit=6`;
    const res = await fetchWithTimeout(url, CACHE_OPTIONS, 8000);
    if (!res.ok) {
      const responseText = await res.text();
      throw new Error(`HTTP error! status: ${res.status}; response: ${responseText}`);
    }

    const body = await res.json();
    const payload = body?.data || {};
    return Array.isArray(payload.events) ? payload.events : [];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[server-fetch] Featured events error:', errorMsg);
    return [];
  }
}

export async function serverGetDJs(): Promise<DJOperator[]> {
  try {
    const url = `${API_URL}/dj-operators?limit=6&includeTotal=false`;
    const res = await fetchWithTimeout(url, CACHE_OPTIONS, 8000);
    if (!res.ok) {
      const responseText = await res.text();
      throw new Error(`HTTP error! status: ${res.status}; response: ${responseText}`);
    }

    const body = await res.json();
    const payload = body?.data || {};
    
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
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[server-fetch] DJ Operators error:', errorMsg);
    return [];
  }
}

export async function serverGetCategories(): Promise<PublicCategory[]> {
  try {
    const res = await fetch(`${API_URL}/categories`, CACHE_OPTIONS);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const body = await res.json();
    return Array.isArray(body?.data) ? body.data : [];
  } catch (error) {
    console.error('[server-fetch] Failed to fetch categories:', error);
    return [];
  }
}
