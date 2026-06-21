import rateLimit, { MemoryStore, Store } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';


import { getEnv } from '../config/env';
import { getRedis, isRedisConnected } from '../config/redis';
import { logger } from '../utils/logger';


class ResilientRedisStore implements Store {
  private redisStore?: RedisStore;
  private memoryStore: MemoryStore;

  constructor(prefix: string) {
    this.memoryStore = new MemoryStore();
    try {
      this.redisStore = new RedisStore({
        sendCommand: async (...args: string[]) => {
          if (!isRedisConnected()) {
            throw new Error('Redis not connected');
          }
          const client = getRedis();
          return client.call(args[0], ...args.slice(1)) as Promise<any>;
        },
        prefix: `mad:limiter:${prefix}:`,
      });
    } catch (err) {
      logger.error({ err }, `Failed to initialize RedisStore for limiter ${prefix}`);
    }
  }

  init(options: any) {
    if (this.redisStore && typeof this.redisStore.init === 'function') {
      const initPromise = this.redisStore.init(options);
      if (initPromise && typeof initPromise.catch === 'function') {
        initPromise.catch((err: any) => {
          logger.debug({ err }, 'Redis rate limit store initialization deferred');
        });
      }

      // Prevent unhandled promise rejections if Redis is not connected during startup
      if (this.redisStore.incrementScriptSha && typeof this.redisStore.incrementScriptSha.catch === 'function') {
        this.redisStore.incrementScriptSha.catch(() => {});
      }
      if (this.redisStore.getScriptSha && typeof this.redisStore.getScriptSha.catch === 'function') {
        this.redisStore.getScriptSha.catch(() => {});
      }
    }
    if (typeof this.memoryStore.init === 'function') {
      this.memoryStore.init(options);
    }
  }

  async increment(key: string) {
    if (isRedisConnected() && this.redisStore) {
      try {
        return await this.redisStore.increment(key);
      } catch (err) {
        logger.error({ err, key }, 'Redis rate limit store increment failed, falling back to memory');
        return await this.memoryStore.increment(key);
      }
    }
    return this.memoryStore.increment(key);
  }

  async decrement(key: string) {
    if (isRedisConnected() && this.redisStore) {
      try {
        await this.redisStore.decrement(key);
        return;
      } catch (err) {
        logger.error({ err, key }, 'Redis rate limit store decrement failed, falling back to memory');
      }
    }
    await this.memoryStore.decrement(key);
  }

  async resetKey(key: string) {
    if (isRedisConnected() && this.redisStore) {
      try {
        await this.redisStore.resetKey(key);
        return;
      } catch (err) {
        logger.error({ err, key }, 'Redis rate limit store resetKey failed, falling back to memory');
      }
    }
    await this.memoryStore.resetKey(key);
  }
}


// ─── Rate Limiter Instances ───────────────────────────────────
// Limiters are created by initRateLimiters(), which is called from createApp()
// AFTER waitForRedisReady() completes. express-rate-limit v7 throws
// ERR_ERL_CREATED_IN_REQUEST_HANDLER if rateLimit() is called inside a request
// handler (detected via stack-frame inspection). By initializing eagerly at app
// bootstrap time — not lazily on first request — we satisfy both constraints:
// (1) Redis is ready, (2) rateLimit() is not called from within a request.

type RateLimiter = ReturnType<typeof rateLimit>;

let _generalLimiter: RateLimiter | undefined;
let _authLimiter: RateLimiter | undefined;
let _paymentLimiter: RateLimiter | undefined;
let _bookingLimiter: RateLimiter | undefined;
let _webhookLimiter: RateLimiter | undefined;
let _adminLimiter: RateLimiter | undefined;
let _resendLimiter: RateLimiter | undefined;
let _recoveryLimiter: RateLimiter | undefined;
let _ticketAssignLimiter: RateLimiter | undefined;
let _ticketClaimLimiter: RateLimiter | undefined;
let _ticketRevokeLimiter: RateLimiter | undefined;

function makeLimiter(prefix: 'general' | 'auth' | 'payment' | 'booking' | 'webhook' | 'admin'): RateLimiter {
  const e = getEnv();
  const limits: Record<typeof prefix, number> = {
    general: e.RATE_LIMIT_MAX_REQUESTS,
    auth: e.RATE_LIMIT_AUTH_MAX,
    payment: e.RATE_LIMIT_PAYMENT_MAX,
    booking: 10,
    webhook: 60,
    admin: 30,
  };
  const windows: Record<typeof prefix, number> = {
    general: e.RATE_LIMIT_WINDOW_MS,
    auth: e.RATE_LIMIT_WINDOW_MS,
    payment: e.RATE_LIMIT_WINDOW_MS,
    booking: 15 * 60 * 1000, // 15 minutes
    webhook: 10 * 60 * 1000, // 10 minutes
    admin: 15 * 60 * 1000, // 15 minutes
  };
  return rateLimit({
    windowMs: windows[prefix],
    limit: limits[prefix],
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store: new ResilientRedisStore(prefix),
    handler: (req: any, res: any) => {
      if (prefix === 'auth') {
        const resetTime = req.rateLimit?.resetTime;
        const retryAfter = resetTime
          ? Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000)
          : Math.ceil(windows[prefix] / 1000);

        return res.status(429).json({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many verification requests',
          retryAfter: Math.max(0, retryAfter),
        });
      }
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
      });
    },
  });
}

/**
 * Must be called once from createApp(), after Redis is ready.
 * Creates all rate limiter instances at app initialization time,
 * not inside request handlers.
 */
export function initRateLimiters(): void {
  _generalLimiter = makeLimiter('general');
  _authLimiter = makeLimiter('auth');
  _paymentLimiter = makeLimiter('payment');
  _bookingLimiter = makeLimiter('booking');
  _webhookLimiter = makeLimiter('webhook');
  _adminLimiter = makeLimiter('admin');

  _resendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    limit: 3, // limit each booking reference/IP combination to 3 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store: new ResilientRedisStore('resend'),
    keyGenerator: (req: any) => {
      return req.params.bookingId || req.ip || '';
    },
    handler: (req: any, res: any) => {
      res.status(429).json({
        success: false,
        message: 'Too many resend attempts. Please try again after an hour.',
      });
    },
  });

  // Dedicated booking recovery limiter
  // Isolated from the auth limiter to prevent shared-bucket abuse.
  _recoveryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5,                 // 5 requests per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store: new ResilientRedisStore('recovery'),
    handler: (_req: any, res: any) => {
      res.status(429).json({
        success: false,
        message: 'Too many recovery attempts. Please wait before trying again.',
      });
    },
  });

  _ticketAssignLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store: new ResilientRedisStore('ticket-assign'),
    keyGenerator: (req: any) => {
      return req.user?.sub || req.ip || '';
    },
    handler: (req: any, res: any) => {
      res.status(429).json({
        success: false,
        message: 'Too many assign requests. Please try again after an hour.',
      });
    },
  });

  _ticketClaimLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store: new ResilientRedisStore('ticket-claim'),
    keyGenerator: (req: any) => {
      return req.user?.sub || req.ip || '';
    },
    handler: (req: any, res: any) => {
      res.status(429).json({
        success: false,
        message: 'Too many claim requests. Please try again after an hour.',
      });
    },
  });

  _ticketRevokeLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hour window
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store: new ResilientRedisStore('ticket-revoke'),
    keyGenerator: (req: any) => {
      return req.params.ticketId || req.ip || '';
    },
    handler: (req: any, res: any) => {
      res.status(429).json({
        success: false,
        message: 'Too many revoke requests for this ticket. Please try again tomorrow.',
      });
    },
  });
}

export const generalLimiter = (req: any, res: any, next: any) => {
  if (!_generalLimiter) {
    logger.error('generalLimiter called before initRateLimiters() — rate limiting inactive');
    return next();
  }
  return _generalLimiter(req, res, next);
};

export const authLimiter = (req: any, res: any, next: any) => {
  if (!_authLimiter) {
    logger.error('authLimiter called before initRateLimiters() — rate limiting inactive');
    return next();
  }
  return _authLimiter(req, res, next);
};

export const paymentLimiter = (req: any, res: any, next: any) => {
  if (!_paymentLimiter) {
    logger.error('paymentLimiter called before initRateLimiters() — rate limiting inactive');
    return next();
  }
  return _paymentLimiter(req, res, next);
};

export const bookingLimiter = (req: any, res: any, next: any) => {
  if (!_bookingLimiter) {
    logger.error('bookingLimiter called before initRateLimiters() — rate limiting inactive');
    return next();
  }
  return _bookingLimiter(req, res, next);
};

export const webhookLimiter = (req: any, res: any, next: any) => {
  if (!_webhookLimiter) {
    logger.error('webhookLimiter called before initRateLimiters() — rate limiting inactive');
    return next();
  }
  return _webhookLimiter(req, res, next);
};

export const adminLimiter = (req: any, res: any, next: any) => {
  if (!_adminLimiter) {
    logger.error('adminLimiter called before initRateLimiters() — rate limiting inactive');
    return next();
  }
  return _adminLimiter(req, res, next);
};

export const resendLimiter = (req: any, res: any, next: any) => {
  if (!_resendLimiter) {
    logger.error('resendLimiter called before initRateLimiters() — rate limiting inactive');
    return next();
  }
  return _resendLimiter(req, res, next);
};

export const recoveryLimiter = (req: any, res: any, next: any) => {
  if (!_recoveryLimiter) {
    logger.error('recoveryLimiter called before initRateLimiters() — rate limiting inactive');
    return next();
  }
  return _recoveryLimiter(req, res, next);
};

export const ticketAssignLimiter = (req: any, res: any, next: any) => {
  if (!_ticketAssignLimiter) {
    logger.error('ticketAssignLimiter called before initRateLimiters() — rate limiting inactive');
    return next();
  }
  return _ticketAssignLimiter(req, res, next);
};

export const ticketClaimLimiter = (req: any, res: any, next: any) => {
  if (!_ticketClaimLimiter) {
    logger.error('ticketClaimLimiter called before initRateLimiters() — rate limiting inactive');
    return next();
  }
  return _ticketClaimLimiter(req, res, next);
};

export const ticketRevokeLimiter = (req: any, res: any, next: any) => {
  if (!_ticketRevokeLimiter) {
    logger.error('ticketRevokeLimiter called before initRateLimiters() — rate limiting inactive');
    return next();
  }
  return _ticketRevokeLimiter(req, res, next);
};
