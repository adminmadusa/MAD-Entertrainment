import { STORAGE_KEYS } from '@mad/shared';
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

// ─── Admin Axios Instance ──────────────────────────────────────

export const adminApiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
});

// ─── Request Interceptor — Attach Admin Token ─────────────────

adminApiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    config.headers.set('Cache-Control', 'no-cache');
    config.headers.set('Pragma', 'no-cache');
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — Handle 401 ────────────────────────

adminApiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[api-cache]', {
        url: response.config.url,
        cacheControl: response.headers['cache-control'],
        cachePolicy: response.headers['x-cache-policy'],
        cacheDebug: response.headers['x-cache-debug'],
        requestId: response.headers['x-request-id'],
      });
    }
    return response;
  },
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.ADMIN_DATA);
        const path = window.location.pathname;
        if (!path.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Helper Types ─────────────────────────────────────────────

export { extractApiError } from '@mad/utils';
export type { ApiError } from '@mad/utils';
