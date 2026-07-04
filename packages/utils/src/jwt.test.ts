import { describe, it, expect, vi, afterEach } from 'vitest';
import { decodeJwt, isTokenExpired } from './jwt';

// Helper to construct mock JWTs with base64url encoding
function createMockJwt(payload: any, hasThreeParts = true): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  // Node.js Buffer is globally available in Vitest/Node environment
  const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

  if (!hasThreeParts) {
    return `${headerBase64}.${payloadBase64}`;
  }
  return `${headerBase64}.${payloadBase64}.mocksignature`;
}

describe('JWT Utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('decodeJwt', () => {
    it('TC-001: should decode a valid token with ASCII payload', () => {
      const payload = { sub: 'user_123', name: 'John Doe', exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = createMockJwt(payload);

      const decoded = decodeJwt(token);
      expect(decoded).toEqual(payload);
    });

    it('TC-003: should return null for null, undefined, or empty token', () => {
      expect(decodeJwt(null)).toBeNull();
      expect(decodeJwt(undefined)).toBeNull();
      expect(decodeJwt('')).toBeNull();
    });

    it('TC-004: should return null for malformed token format (no dots)', () => {
      expect(decodeJwt('invalidtoken')).toBeNull();
    });

    it('TC-005: should return null for token with incorrect number of parts', () => {
      const payload = { sub: 'user_123' };
      const twoPartToken = createMockJwt(payload, false);
      expect(decodeJwt(twoPartToken)).toBeNull();
    });

    it('TC-006: should return null for invalid base64 payload', () => {
      const malformedToken = 'header.invalid_base64$.signature';
      expect(decodeJwt(malformedToken)).toBeNull();
    });

    it('TC-007: should return null for invalid JSON payload', () => {
      // Base64 of "{invalidjson"
      const badBase64 = Buffer.from('{invalidjson').toString('base64url');
      const malformedToken = `header.${badBase64}.signature`;
      expect(decodeJwt(malformedToken)).toBeNull();
    });

    it('TC-008: should decode UTF-8 special characters correctly', () => {
      const payload = { sub: 'user_123', name: 'Jürgen Müller' };
      const token = createMockJwt(payload);

      const decoded = decodeJwt(token);
      expect(decoded).toEqual(payload);
      expect(decoded?.name).toBe('Jürgen Müller');
    });

    it('TC-009: should decode emoji characters correctly', () => {
      const payload = { sub: 'user_123', name: '🚀 User' };
      const token = createMockJwt(payload);

      const decoded = decodeJwt(token);
      expect(decoded).toEqual(payload);
      expect(decoded?.name).toBe('🚀 User');
    });

    it('TC-012: should use Buffer fallback if globalThis.atob is undefined (SSR/Node safety)', () => {
      const payload = { sub: 'user_123' };
      const token = createMockJwt(payload);

      // Temporarily mock globalThis.atob as undefined
      const originalAtob = globalThis.atob;
      delete (globalThis as any).atob;


      try {
        const decoded = decodeJwt(token);
        expect(decoded).toEqual(payload);
      } finally {
        // Restore
        globalThis.atob = originalAtob;
      }
    });
  });

  describe('isTokenExpired', () => {
    it('TC-001: should return false for a token with a future expiry', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 60; // 1 minute in the future
      const token = createMockJwt({ exp: futureTime });
      expect(isTokenExpired(token)).toBe(false);
    });

    it('TC-002: should return true for a token with a past expiry', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 60; // 1 minute in the past
      const token = createMockJwt({ exp: pastTime });
      expect(isTokenExpired(token)).toBe(true);
    });

    it('TC-003: should return true for missing/null/undefined tokens', () => {
      expect(isTokenExpired(null)).toBe(true);
      expect(isTokenExpired(undefined)).toBe(true);
      expect(isTokenExpired('')).toBe(true);
    });

    it('TC-004/TC-005: should return true for malformed tokens', () => {
      expect(isTokenExpired('malformed')).toBe(true);
      expect(isTokenExpired('header.payload')).toBe(true);
    });

    it('TC-010: should return false if the exp claim is missing', () => {
      const token = createMockJwt({ sub: 'user_123' });
      expect(isTokenExpired(token)).toBe(false);
    });

    it('TC-011: should return false if the exp claim is non-numeric', () => {
      const token = createMockJwt({ exp: '2026-12-31T00:00:00Z' });
      expect(isTokenExpired(token)).toBe(false);
    });
  });
});
