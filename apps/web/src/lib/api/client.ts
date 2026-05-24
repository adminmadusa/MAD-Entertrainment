import { STORAGE_KEYS } from '@mad/shared';
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

// ─── Create Axios Instance ────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
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
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — Normalize Errors ──────────────────

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    // Token expired — clear auth and reload
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        // Only reload if not already on auth pages
        const path = window.location.pathname;
        if (!path.startsWith('/auth')) {
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
      }
    }

    return Promise.reject(error);
  }
);

// ─── Helper Types ─────────────────────────────────────────────

export { extractApiError } from '@mad/utils';
export type { ApiError } from '@mad/utils';
