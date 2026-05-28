import { STORAGE_KEYS } from '@mad/shared';
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

import { API_URL } from '@mad/shared/config/frontend';
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
  (error: unknown) => Promise.reject(error)
);

// ─── Response Interceptor — Silent Refresh Queue & Intercept ───

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

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    // Detect 401 unauthorized errors and trigger silent token refresh
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Prevent infinite loops if refresh or logout itself fails
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/logout')
      ) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER_DATA);
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        return Promise.reject(error);
      }

      // If a refresh is already in progress, enqueue this request to resolve once refreshed
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err: unknown) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Execute token refresh, secure cookie will be sent automatically
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
          localStorage.setItem(STORAGE_KEYS.USER_TOKEN, newToken);
        }

        apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
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

    return Promise.reject(error);
  }
);

// ─── Helper Types ─────────────────────────────────────────────

export { extractApiError } from '@mad/utils';
export type { ApiError } from '@mad/utils';
