import "server-only";
import { Event, DJOperator } from "@mad/types";
import { PublicCategory } from "./public.service";
import { API_URL } from "@mad/shared/config/frontend";

const FETCH_TIMEOUT_MS = 5000;

// Cache configuration
const CACHE_OPTIONS = {
  next: {
    revalidate: 60, // Cache for 60 seconds (ISR)
  },
};

function hasValidApiUrl(): boolean {
  return typeof API_URL === "string" && API_URL.trim().length > 0;
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

async function fetchWithTimeout(path: string): Promise<Response> {
  const { signal, clear } = withTimeoutSignal(FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${API_URL}${path}`, {
      ...CACHE_OPTIONS,
      signal,
    });
  } finally {
    clear();
  }
}

export async function serverGetFeaturedEvents(): Promise<Event[]> {
  if (!hasValidApiUrl()) return [];
  try {
    const res = await fetchWithTimeout("/events?page=1&limit=6");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const body = await res.json();
    const payload = body?.data || {};
    return Array.isArray(payload.events) ? payload.events : [];
  } catch (error) {
    console.error("[server-fetch] Failed to fetch featured events:", error);
    return [];
  }
}

export async function serverGetDJs(): Promise<DJOperator[]> {
  if (!hasValidApiUrl()) return [];
  try {
    const res = await fetchWithTimeout("/dj-operators?limit=6");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const body = await res.json();
    const payload = body?.data || {};

    return Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.djOperators)
        ? payload.djOperators
        : Array.isArray(payload.djs)
          ? payload.djs
          : [];
  } catch (error) {
    console.error("[server-fetch] Failed to fetch DJs:", error);
    return [];
  }
}

export async function serverGetCategories(): Promise<PublicCategory[]> {
  if (!hasValidApiUrl()) return [];
  try {
    const res = await fetchWithTimeout("/categories");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const body = await res.json();
    return Array.isArray(body?.data) ? body.data : [];
  } catch (error) {
    console.error("[server-fetch] Failed to fetch categories:", error);
    return [];
  }
}
