import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig, type AxiosRequestConfig } from 'axios';
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';

import { STORAGE_KEYS } from '@mad/shared';
import * as utils from '@mad/utils';

import { apiClient } from './client';

// Mock token expiration to return true for expired, false for new
vi.mock('@mad/utils', async () => {
  const actual = await vi.importActual<typeof utils>('@mad/utils');
  return {
    ...actual,
    isTokenExpired: vi.fn((token: string) => token === 'expired-token'),
  };
});

describe('apiClient Concurrency and Token Refresh', () => {
  let mockAdapter: Mock;
  // Use inferred types — Axios v1.x defaults.adapter is AxiosAdapterConfig | AxiosAdapterConfig[],
  // not AxiosAdapter. Explicit annotation would cause TS2322.
  let originalClientAdapter: typeof apiClient.defaults.adapter;
  let originalGlobalAdapter: typeof axios.defaults.adapter;
  let refreshCalls = 0;

  beforeEach(() => {
    refreshCalls = 0;
    originalClientAdapter = apiClient.defaults.adapter;
    originalGlobalAdapter = axios.defaults.adapter;

    // Reset default headers to ensure test isolation
    delete apiClient.defaults.headers.common.Authorization;
    delete axios.defaults.headers.common.Authorization;

    // Mock navigator.locks if not present in test environment
    const nav = navigator as unknown as {
      locks?: {
        request: (
          name: string,
          options: unknown,
          callback: () => Promise<unknown>
        ) => Promise<unknown>;
      };
    };
    if (typeof navigator !== 'undefined' && !nav.locks) {
      nav.locks = {
        request: vi.fn(async (name: string, options: unknown, callback: () => Promise<unknown>) => {
          return callback();
        }),
      };
    }

    // Set up mock adapter
    mockAdapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.url?.includes('/auth/refresh')) {
        refreshCalls++;
        return {
          data: { data: { token: 'new-token' } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      // Simulate a protected endpoint returning 401
      const authHeader = config.headers ? String(config.headers.Authorization || '') : '';
      if (authHeader === 'Bearer expired-token' || authHeader.includes('expired-token')) {
        const errorResponse = {
          data: { message: 'Unauthorized' },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
        };
        const error = new AxiosError(
          'Request failed with status code 401',
          'ERR_BAD_REQUEST',
          config,
          {},
          errorResponse
        );
        return Promise.reject(error);
      }

      return {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    });

    apiClient.defaults.adapter = mockAdapter as AxiosAdapter;
    axios.defaults.adapter = mockAdapter as AxiosAdapter;
    localStorage.clear();
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalClientAdapter;
    axios.defaults.adapter = originalGlobalAdapter;
    vi.restoreAllMocks();
  });

  it('scenario 1: single expired token -> triggers exactly one refresh', async () => {
    localStorage.setItem(STORAGE_KEYS.USER_TOKEN, 'expired-token');

    const res = await apiClient.get('/test-route');
    expect(res.data).toEqual({ success: true });
    expect(refreshCalls).toBe(1);
    expect(localStorage.getItem(STORAGE_KEYS.USER_TOKEN)).toBe('new-token');
  });

  it('scenario 2: five simultaneous requests on one tab -> exactly one refresh', async () => {
    localStorage.setItem(STORAGE_KEYS.USER_TOKEN, 'expired-token');

    // Fire 5 requests simultaneously
    const results = await Promise.all([
      apiClient.get('/route-1'),
      apiClient.get('/route-2'),
      apiClient.get('/route-3'),
      apiClient.get('/route-4'),
      apiClient.get('/route-5'),
    ]);

    for (const res of results) {
      expect(res.data).toEqual({ success: true });
    }

    // Assert that only exactly 1 refresh call was made to the backend
    expect(refreshCalls).toBe(1);
  });

  it('scenario 3: late-arriving 401 response (the race condition) -> should not trigger duplicate refresh', async () => {
    localStorage.setItem(STORAGE_KEYS.USER_TOKEN, 'expired-token');

    // Simulate Request 1 starting and finishing refresh
    const res1 = await apiClient.get('/fast-route');
    expect(res1.data).toEqual({ success: true });
    expect(refreshCalls).toBe(1);
    expect(localStorage.getItem(STORAGE_KEYS.USER_TOKEN)).toBe('new-token');

    // Now, simulate a delayed request 2 that was sent with the old token ('expired-token')
    // but receives its 401 response AFTER the refresh has already completed.
    const customConfig: AxiosRequestConfig = {
      url: '/delayed-route',
      headers: { Authorization: 'Bearer expired-token' },
    };

    const res2 = await apiClient(customConfig);
    expect(res2.data).toEqual({ success: true });
    // It should reuse the token and NOT increment refresh calls
    expect(refreshCalls).toBe(1);
  });

  it('scenario 4: refresh request failure -> evicts tokens and rejects queue', async () => {
    localStorage.setItem(STORAGE_KEYS.USER_TOKEN, 'expired-token');

    // Force refresh endpoint to fail with 401
    mockAdapter.mockImplementation(async (config: InternalAxiosRequestConfig) => {
      if (config.url?.includes('/auth/refresh')) {
        refreshCalls++;
        const errorResponse = {
          data: { message: 'Session Revoked' },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
        };
        const error = new AxiosError(
          'Request failed with status code 401',
          'ERR_BAD_REQUEST',
          config,
          {},
          errorResponse
        );
        return Promise.reject(error);
      }

      const authHeader = config.headers ? String(config.headers.Authorization || '') : '';
      if (authHeader === 'Bearer expired-token' || authHeader.includes('expired-token')) {
        const errorResponse = {
          data: { message: 'Unauthorized' },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
        };
        const error = new AxiosError(
          'Request failed with status code 401',
          'ERR_BAD_REQUEST',
          config,
          {},
          errorResponse
        );
        return Promise.reject(error);
      }

      return {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    });

    const results = await Promise.allSettled([
      apiClient.get('/route-1'),
      apiClient.get('/route-2'),
    ]);

    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');
    expect(refreshCalls).toBe(1);
    expect(localStorage.getItem(STORAGE_KEYS.USER_TOKEN)).toBeNull();
  });

  it('scenario 5: user logs out while requests are queued during a refresh', async () => {
    localStorage.setItem(STORAGE_KEYS.USER_TOKEN, 'expired-token');

    // Delay the refresh resolution to allow logging out mid-flight
    let resolveRefresh: () => void = () => {};
    const refreshPromise = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });

    mockAdapter.mockImplementation(async (config: InternalAxiosRequestConfig) => {
      if (config.url?.includes('/auth/refresh')) {
        refreshCalls++;
        
        // Simulate logout mid-flight *before* the refresh call completes
        localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        
        await refreshPromise;
        return {
          data: { data: { token: 'new-token' } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      const authHeader = config.headers ? String(config.headers.Authorization || '') : '';
      if (authHeader === 'Bearer expired-token' || authHeader.includes('expired-token')) {
        const errorResponse = {
          data: { message: 'Unauthorized' },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
        };
        const error = new AxiosError(
          'Request failed with status code 401',
          'ERR_BAD_REQUEST',
          config,
          {},
          errorResponse
        );
        return Promise.reject(error);
      }

      return {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    });

    const pendingRequest = apiClient.get('/route-1');

    // Complete the refresh
    resolveRefresh();

    await expect(pendingRequest).rejects.toThrow();
  });
});
