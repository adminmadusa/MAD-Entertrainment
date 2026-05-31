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

const isRealProduction = Boolean(process.env.VERCEL) && process.env.VERCEL_ENV === 'production';

export async function serverGetFeaturedEvents(): Promise<Event[]> {
  try {
    const res = await fetch(`${API_URL}/events?page=1&limit=6`, CACHE_OPTIONS);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const body = await res.json();
    const payload = body?.data || {};
    return Array.isArray(payload.events) ? payload.events : [];
  } catch (error) {
    console.error('[server-fetch] Failed to fetch featured events:', error);
    if (isRealProduction) throw error;
    return [];
  }
}

export async function serverGetDJs(): Promise<DJOperator[]> {
  try {
    const res = await fetch(`${API_URL}/dj-operators?limit=6`, CACHE_OPTIONS);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
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
    console.error('[server-fetch] Failed to fetch DJs:', error);
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
    if (isRealProduction) throw error;
    return [];
  }
}
