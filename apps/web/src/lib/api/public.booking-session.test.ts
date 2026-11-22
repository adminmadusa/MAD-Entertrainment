import type { AxiosResponse } from 'axios';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { STORAGE_VERSION } from '@mad/shared';
import * as utils from '@mad/utils';

import { apiClient } from './client';
import {
  ensureGuestBookingSession,
  getStoredGuestBookingSession,
  clearGuestBookingSession,
  type GuestBookingSession,
} from './public.service';

const sessionIdKey = `mad_checkout_session_${STORAGE_VERSION}`;
const sessionTokenKey = `mad_checkout_session_token_${STORAGE_VERSION}`;

vi.mock('@mad/utils', async () => {
  const actual = await vi.importActual<typeof utils>('@mad/utils');
  return {
    ...actual,
    isTokenExpired: vi.fn((token: string) => token === 'expired-guest-token'),
  };
});

describe('Guest Booking Session Reliability', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('TC-GUEST-001: returns null when no guest session is stored', () => {
    expect(getStoredGuestBookingSession()).toBeNull();
  });

  it('TC-GUEST-002: returns stored guest session when token is valid and unexpired', () => {
    sessionStorage.setItem(sessionIdKey, 'session-123');
    sessionStorage.setItem(sessionTokenKey, 'valid-token');

    const stored = getStoredGuestBookingSession();
    expect(stored).toEqual({
      sessionId: 'session-123',
      token: 'valid-token',
    });
  });

  it('TC-GUEST-003: clears and returns null when stored token is expired', () => {
    sessionStorage.setItem(sessionIdKey, 'session-old');
    sessionStorage.setItem(sessionTokenKey, 'expired-guest-token');

    const stored = getStoredGuestBookingSession();
    expect(stored).toBeNull();
    expect(sessionStorage.getItem(sessionIdKey)).toBeNull();
    expect(sessionStorage.getItem(sessionTokenKey)).toBeNull();
  });

  it('TC-GUEST-004: deduplicates concurrent in-flight session initialization requests', async () => {
    let callCount = 0;
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/bookings/session') {
        callCount++;
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          data: {
            data: {
              sessionId: 'deduped-session-id',
              token: 'deduped-token',
            },
          },
        } as unknown as AxiosResponse<{ data: GuestBookingSession }>;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    // Fire 3 concurrent calls
    const [res1, res2, res3] = await Promise.all([
      ensureGuestBookingSession(),
      ensureGuestBookingSession(),
      ensureGuestBookingSession(),
    ]);

    expect(callCount).toBe(1);
    expect(res1.sessionId).toBe('deduped-session-id');
    expect(res2.sessionId).toBe('deduped-session-id');
    expect(res3.sessionId).toBe('deduped-session-id');
    expect(res1.token).toBe('deduped-token');
  });

  it('TC-GUEST-005: resets in-flight promise on failure so retry can trigger fresh request', async () => {
    let callCount = 0;
    vi.spyOn(apiClient, 'get').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Network failure');
      }
      return {
        data: {
          data: {
            sessionId: 'recovered-session',
            token: 'recovered-token',
          },
        },
      } as unknown as AxiosResponse<{ data: GuestBookingSession }>;
    });

    // First attempt fails
    await expect(ensureGuestBookingSession()).rejects.toThrow('Network failure');

    // Second attempt should execute fresh call and succeed
    const recovered = await ensureGuestBookingSession();
    expect(callCount).toBe(2);
    expect(recovered.sessionId).toBe('recovered-session');
  });

  it('TC-GUEST-006: clearGuestBookingSession removes keys from both sessionStorage and localStorage', () => {
    sessionStorage.setItem(sessionIdKey, 's1');
    sessionStorage.setItem(sessionTokenKey, 't1');
    localStorage.setItem(sessionIdKey, 's2');
    localStorage.setItem(sessionTokenKey, 't2');

    clearGuestBookingSession();

    expect(sessionStorage.getItem(sessionIdKey)).toBeNull();
    expect(sessionStorage.getItem(sessionTokenKey)).toBeNull();
    expect(localStorage.getItem(sessionIdKey)).toBeNull();
    expect(localStorage.getItem(sessionTokenKey)).toBeNull();
  });
});
