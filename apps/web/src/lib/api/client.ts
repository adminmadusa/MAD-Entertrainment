import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { STORAGE_KEYS } from '@mad/shared';
import { API_URL } from '@mad/shared/config/frontend';
import { isTokenExpired } from '@mad/utils';
const BASE_URL = API_URL;

// Custom request configuration interface to prevent unsafe 'any' casts
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// ─── Create Axios Instance ────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true,
  withXSRFToken: true, // Enables automatic X-XSRF-TOKEN header for cross-origin requests (Axios >=1.6)
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request Interceptor — Attach Token ───────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
      if (token && config.headers && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// ─── Auth-Excluded Routes ─────────────────────────────────────

const AUTH_EXCLUDED_ROUTES = ['/auth/refresh', '/auth/logout', '/auth/verify', '/auth/magic-link'];

// ─── Queue State ──────────────────────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Local isTokenExpiredOrMissing deleted, imported from @mad/utils instead

// ─── Core Refresh Executor ────────────────────────────────────

async function executeTokenRefresh(originalExpiredToken: string): Promise<string> {
  // Double-Checked Lock: Re-read the token immediately after acquiring the lock.
  // Another tab may have already rotated it while we were queued.
  const currentToken = typeof window !== 'undefined'
    ? localStorage.getItem(STORAGE_KEYS.USER_TOKEN)
    : null;

  if (
    currentToken &&
    !isTokenExpired(currentToken) &&
    currentToken !== originalExpiredToken
  ) {
    // Another tab already completed the refresh. Use the propagated token.
    apiClient.defaults.headers.common.Authorization = `Bearer ${currentToken}`;
    return currentToken;
  }

  // We are the owner — execute the refresh.
  const refreshResponse = await axios.post<{ data: { token: string } }>(
    `${BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true }
  );

  const newToken = refreshResponse.data?.data?.token;
  if (!newToken) {
    throw new Error('Refresh failed: No token returned');
  }

  if (typeof window !== 'undefined') {
    // If the token was cleared in localStorage (e.g. user logged out) while the call was in-flight,
    // we should abort writing the new token to avoid stale auth states.
    if (!localStorage.getItem(STORAGE_KEYS.USER_TOKEN)) {
      throw new Error('Session terminated during token refresh');
    }

    localStorage.setItem(STORAGE_KEYS.USER_TOKEN, newToken);
    // Notify AuthProvider on the same tab to sync React state.
    window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: { token: newToken } }));
  }

  apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
  return newToken;
}

// ─── Safari <15.4 Cooperative Fallback Lock ───────────────────
//
// navigator.locks is unavailable in Safari before 15.4.
// We use a localStorage timestamp key with a 10-second TTL as a
// cooperative advisory lock so concurrent tabs can avoid duplicate refresh calls.

const FALLBACK_LOCK_KEY = 'mad_auth_refresh_lock_ts';
const FALLBACK_LOCK_TTL_MS = 10_000;

async function executeWithFallbackLock(originalExpiredToken: string): Promise<string> {
  const now = Date.now();
  const existing = localStorage.getItem(FALLBACK_LOCK_KEY);

  if (existing) {
    const lockTs = parseInt(existing, 10);
    if (!isNaN(lockTs) && now - lockTs < FALLBACK_LOCK_TTL_MS) {
      // Another tab is refreshing. Poll localStorage for the new token.
      return new Promise<string>((resolve, reject) => {
        const start = Date.now();
        const poll = setInterval(() => {
          const t = localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
          if (t && !isTokenExpired(t) && t !== originalExpiredToken) {
            clearInterval(poll);
            apiClient.defaults.headers.common.Authorization = `Bearer ${t}`;
            resolve(t);
          } else if (Date.now() - start > FALLBACK_LOCK_TTL_MS) {
            clearInterval(poll);
            reject(new Error('Fallback lock timed out waiting for token refresh'));
          }
        }, 200);
      });
    }
  }

  // Acquire the fallback lock.
  localStorage.setItem(FALLBACK_LOCK_KEY, String(now));
  try {
    const token = await executeTokenRefresh(originalExpiredToken);
    return token;
  } finally {
    localStorage.removeItem(FALLBACK_LOCK_KEY);
  }
}

// ─── Cross-Tab Storage Event Listener ────────────────────────
//
// When another tab writes a new token or clears the session, this listener
// synchronizes the current tab's queue and Axios default headers.

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEYS.USER_TOKEN) return;

    if (event.newValue === null) {
      // Another tab logged out or session expired — propagate eviction.
      processQueue(new Error('Session expired in another tab'), null);
      isRefreshing = false;
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return;
    }

    if (event.newValue && !isTokenExpired(event.newValue)) {
      // Another tab successfully refreshed the token — adopt it and flush the queue.
      apiClient.defaults.headers.common.Authorization = `Bearer ${event.newValue}`;
      processQueue(null, event.newValue);
      isRefreshing = false;
    }
  });
}

// ─── Response Interceptor — Hybrid Web Locks + Storage Events ─

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    // ── Origin Guard: Only intercept requests to our own API ──
    const requestUrl = originalRequest.url ?? '';
    const isOwnApi = requestUrl.startsWith('/') || requestUrl.startsWith(BASE_URL);
    if (!isOwnApi) {
      return Promise.reject(error);
    }

    // ── Auth Route Guard: Never intercept auth-plumbing routes ──
    const isExcluded = AUTH_EXCLUDED_ROUTES.some((r) => requestUrl.includes(r));
    if (isExcluded) {
      // Refresh or logout itself failed — evict the session entirely.
      if (requestUrl.includes('/auth/refresh') || requestUrl.includes('/auth/logout')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER_DATA);
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
      }
      return Promise.reject(error);
    }

    // Capture the expired token before any async work.
    const originalExpiredToken =
      typeof window !== 'undefined'
        ? (localStorage.getItem(STORAGE_KEYS.USER_TOKEN) ?? '')
        : '';

    // ── Pre-Refresh Freshness Check (Candidate D / Same-Tab Race Prevention) ──
    // If the token in localStorage is already newer and valid, we do not start
    // a new refresh cycle. Simply retry the request with the new token.
    const requestToken = originalRequest.headers?.Authorization
      ? String(originalRequest.headers.Authorization).replace('Bearer ', '')
      : '';

    if (
      originalExpiredToken &&
      !isTokenExpired(originalExpiredToken) &&
      originalExpiredToken !== requestToken
    ) {
      originalRequest._retry = true;
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${originalExpiredToken}`;
      }
      return apiClient(originalRequest);
    }

    // ── Queue waiting requests while a refresh is in progress ──
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest._retry = true; // Prevent re-queuing on second failure.
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err: unknown) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const performRefresh = async (): Promise<string> => {
      const hasWebLocks = typeof navigator !== 'undefined' && typeof navigator.locks !== 'undefined';

      if (hasWebLocks) {
        // ── Web Locks path (Chrome, Edge, Firefox, Safari ≥15.4) ──
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15_000);

        try {
          let newToken = '';
          await navigator.locks.request(
            'mad_auth_refresh_lock',
            { signal: controller.signal },
            async () => {
              newToken = await executeTokenRefresh(originalExpiredToken);
            }
          );
          return newToken;
        } finally {
          clearTimeout(timeoutId);
        }
      } else {
        // ── Cooperative fallback path (Safari <15.4) ──
        return executeWithFallbackLock(originalExpiredToken);
      }
    };

    try {
      const newToken = await performRefresh();

      // If the user logged out while the refresh was in flight, reject the queue and abort
      const activeToken = typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEYS.USER_TOKEN)
        : null;
      if (!activeToken) {
        const logoutError = new AxiosError(
          'Session terminated during token refresh',
          'ERR_CANCELLED',
          originalRequest
        );
        processQueue(logoutError, null);
        return Promise.reject(logoutError);
      }

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }
      processQueue(null, newToken);
      return apiClient(originalRequest);
    } catch (refreshError: unknown) {
      processQueue(refreshError, null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ─── Helper Types ─────────────────────────────────────────────

export { extractApiError } from '@mad/utils';
export type { ApiError } from '@mad/utils';
export { isAxiosError } from 'axios';
