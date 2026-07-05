import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as jwtUtils from './jwt';

// Mock the env configuration
vi.mock('../config/env', () => ({
  getEnv: vi.fn(() => ({
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '1h',
    JWT_ADMIN_SECRET: 'test-admin-secret',
    JWT_ADMIN_EXPIRES_IN: '2h',
    JWT_SESSION_SECRET: 'test-session-secret',
  })),
}));

describe('JWT Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractBearerToken', () => {
    it('should extract token from Bearer string', () => {
      const token = jwtUtils.extractBearerToken('Bearer abc.123.xyz');
      expect(token).toBe('abc.123.xyz');
    });

    it('should return undefined if header does not start with Bearer', () => {
      expect(jwtUtils.extractBearerToken('Basic asdf')).toBeUndefined();
      expect(jwtUtils.extractBearerToken('abc.123.xyz')).toBeUndefined();
      expect(jwtUtils.extractBearerToken(undefined)).toBeUndefined();
    });
  });

  describe('User Tokens', () => {
    it('should sign and verify user token', () => {
      const payload = { sub: 'user123', email: 'test@example.com' };
      const token = jwtUtils.signUserToken(payload);
      expect(typeof token).toBe('string');

      const verified = jwtUtils.verifyUserToken(token);
      expect(verified.sub).toBe(payload.sub);
      expect(verified.email).toBe(payload.email);
    });

    it('should throw error for invalid user token', () => {
      expect(() => jwtUtils.verifyUserToken('invalid.token.here')).toThrow();
    });
  });

  describe('Admin Tokens', () => {
    it('should sign and verify admin token', () => {
      const payload = { sub: 'admin123', email: 'admin@example.com', role: 'SUPER_ADMIN' as any };
      const token = jwtUtils.signAdminToken(payload);
      expect(typeof token).toBe('string');

      const verified = jwtUtils.verifyAdminToken(token);
      expect(verified.sub).toBe(payload.sub);
      expect(verified.role).toBe(payload.role);
    });
  });

  describe('Session Tokens', () => {
    it('should sign and verify session token', () => {
      const sessionId = 'session-999';
      const token = jwtUtils.signSessionToken(sessionId);
      expect(typeof token).toBe('string');

      const verifiedId = jwtUtils.verifySessionToken(token);
      expect(verifiedId).toBe(sessionId);
    });
  });
});
