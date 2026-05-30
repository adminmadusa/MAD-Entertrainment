import { describe, it, expect, vi, beforeEach } from 'vitest';
import rateLimit from 'express-rate-limit';
import { initRateLimiters, authLimiter } from './rate.middleware';

// We mock express-rate-limit so we can capture the options and call handler directly
vi.mock('express-rate-limit', async () => {
  const actual = await vi.importActual<any>('express-rate-limit');
  const mockRateLimit = vi.fn().mockImplementation((options) => {
    const middleware = (req: any, res: any, next: any) => {
      if (req.simulateLimitExceeded) {
        return options.handler(req, res);
      }
      return next();
    };
    (middleware as any).options = options;
    return middleware;
  });
  return {
    default: mockRateLimit,
    MemoryStore: actual.MemoryStore,
  };
});

vi.mock('../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    APP_ENV: 'local',
    PORT: 3001,
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'test_jwt_secret_with_32_characters_long_minimum',
    JWT_ADMIN_SECRET: 'test_admin_secret_with_32_characters_long_minimum',
    JWT_SESSION_SECRET: 'test_session_secret_with_32_characters_long_minimum',
    RATE_LIMIT_MAX_REQUESTS: 100,
    RATE_LIMIT_AUTH_MAX: 5,
    RATE_LIMIT_PAYMENT_MAX: 10,
    RATE_LIMIT_WINDOW_MS: 60000,
  })),
}));

vi.mock('../config/redis', () => ({
  getRedis: vi.fn(),
  isRedisConnected: vi.fn(() => false),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('rateLimiter middleware tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initRateLimiters();
  });

  it('should call next when rate limit is not exceeded', () => {
    const req = { simulateLimitExceeded: false };
    const res = {};
    const next = vi.fn();

    authLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 429 and structured JSON for auth rate limit exceeded with custom retryAfter', () => {
    const resetTime = new Date(Date.now() + 45000); // 45 seconds from now
    const req = {
      simulateLimitExceeded: true,
      rateLimit: {
        resetTime,
      },
    };

    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    const next = vi.fn();

    authLimiter(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many verification requests',
        retryAfter: expect.any(Number),
      })
    );

    // retryAfter should be around 45 seconds
    const responsePayload = res.json.mock.calls[0][0];
    expect(responsePayload.retryAfter).toBeGreaterThanOrEqual(44);
    expect(responsePayload.retryAfter).toBeLessThanOrEqual(45);
  });

  it('should fallback to windowMs/1000 if resetTime is not provided', () => {
    const req = {
      simulateLimitExceeded: true,
      rateLimit: {},
    };

    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    const next = vi.fn();

    authLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many verification requests',
      retryAfter: 60, // 60000ms windowMs fallback
    });
  });
});
