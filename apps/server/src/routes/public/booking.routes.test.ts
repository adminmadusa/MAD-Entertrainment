import { describe, expect, it, vi, beforeEach } from 'vitest';
import router from './booking.routes';
import { bookingLimiter } from '../../middleware/rate.middleware';
import { optionalAuth } from '../../middleware/auth.middleware';
import { createBooking, recoverBooking } from '../../controllers/public/booking.controller';
import { authLimiter } from '../../middleware/rate.middleware';

vi.mock('../../controllers/public/booking.controller', () => ({
  createBooking: vi.fn((req: any, res: any) => res.status(201).json({ success: true })),
  getBooking: vi.fn(),
  getMyBookings: vi.fn(),
  getSessionToken: vi.fn(),
  saveCheckoutDetails: vi.fn(),
  downloadBookingPDF: vi.fn(),
  resendBookingTickets: vi.fn(),
  recoverBooking: vi.fn((req: any, res: any) => res.status(200).json({ success: true, email: 'test@example.com' })),
}));

vi.mock('../../middleware/auth.middleware', () => ({
  requireAuth: vi.fn((req: any, res: any, next: any) => next()),
  optionalAuth: vi.fn((req: any, res: any, next: any) => {
    if (req.headers?.authorization) {
      req.user = { sub: 'user-123' };
    }
    next();
  }),
}));

vi.mock('../../middleware/rate.middleware', () => {
  const mockBookingLimiter = vi.fn((req: any, res: any, next: any) => {
    if (req.simulateBookingLimitExceeded) {
      return res.status(429).json({ success: false, message: 'Too many requests, please try again later.' });
    }
    return next();
  });
  const mockAuthLimiter = vi.fn((req: any, res: any, next: any) => {
    if (req.simulateAuthLimitExceeded) {
      return res.status(429).json({ success: false, message: 'Too many requests, please try again later.' });
    }
    return next();
  });
  return {
    bookingLimiter: mockBookingLimiter,
    generalLimiter: vi.fn((req, res, next) => next()),
    authLimiter: mockAuthLimiter,
    paymentLimiter: vi.fn((req, res, next) => next()),
    resendLimiter: vi.fn((req, res, next) => next()),
  };
});

vi.mock('../../middleware/validation.middleware', () => ({
  validateBody: vi.fn(() => vi.fn((req: any, res: any, next: any) => next())),
  validateParams: vi.fn(() => vi.fn((req: any, res: any, next: any) => next())),
}));

vi.mock('../../validations/payment.validation', () => ({
  reserveTicketsSchema: {},
  checkoutDetailsSchema: {},
  bookingReferenceParamSchema: {},
}));

vi.mock('../../validations/booking-recovery.validation', () => ({
  recoverBookingSchema: {},
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Booking Routes - Rate Limiting Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to extract the middleware chain handlers for POST /
  function getPostBookingHandlers() {
    const layer = router.stack.find(
      (item: any) => item.route?.path === '/' && item.route?.methods?.post
    );
    if (!layer) {
      throw new Error('POST /booking route not found');
    }
    return layer.route.stack.map((s: any) => s.handle);
  }

  // Helper to run the middleware/controller chain sequentially
  async function runMiddlewareChain(handlers: any[], req: any, res: any) {
    let index = 0;
    const next = async (err?: any) => {
      if (err) throw err;
      if (index < handlers.length) {
        const currentHandler = handlers[index++];
        await currentHandler(req, res, next);
      }
    };
    await next();
  }

  it('should have bookingLimiter applied on POST /booking', () => {
    const handlers = getPostBookingHandlers();
    expect(handlers).toContain(bookingLimiter);
  });

  it('should allow guest checkout when rate limit is not exceeded', async () => {
    const handlers = getPostBookingHandlers();
    const req: any = {
      headers: {},
      simulateBookingLimitExceeded: false,
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await runMiddlewareChain(handlers, req, res);

    // Verify bookingLimiter was executed
    expect(bookingLimiter).toHaveBeenCalled();
    // Verify optionalAuth was executed and user was NOT attached
    expect(req.user).toBeUndefined();
    // Verify the controller was reached and executed successfully
    expect(createBooking).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should allow authenticated checkout when rate limit is not exceeded', async () => {
    const handlers = getPostBookingHandlers();
    const req: any = {
      headers: { authorization: 'Bearer some-jwt-token' },
      simulateBookingLimitExceeded: false,
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await runMiddlewareChain(handlers, req, res);

    // Verify bookingLimiter was executed
    expect(bookingLimiter).toHaveBeenCalled();
    // Verify user context was populated
    expect(req.user).toEqual({ sub: 'user-123' });
    // Verify the controller was reached
    expect(createBooking).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should return 429 and NOT execute createBooking when rate limit is exceeded', async () => {
    const handlers = getPostBookingHandlers();
    const req: any = {
      headers: {},
      simulateBookingLimitExceeded: true,
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await runMiddlewareChain(handlers, req, res);

    // Verify bookingLimiter was executed
    expect(bookingLimiter).toHaveBeenCalled();
    // Verify 429 is returned
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Too many requests, please try again later.',
      })
    );
    // Verify that the createBooking controller was NEVER called
    expect(createBooking).not.toHaveBeenCalled();
  });
});

describe('Booking Routes - Recovery Route Stack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to extract the middleware chain handlers for POST /recover
  function getRecoverBookingHandlers() {
    const layer = router.stack.find(
      (item: any) => item.route?.path === '/recover' && item.route?.methods?.post
    );
    if (!layer) {
      throw new Error('POST /booking/recover route not found');
    }
    return layer.route.stack.map((s: any) => s.handle);
  }

  // Helper to run the middleware/controller chain sequentially
  async function runMiddlewareChain(handlers: any[], req: any, res: any) {
    let index = 0;
    const next = async (err?: any) => {
      if (err) throw err;
      if (index < handlers.length) {
        const currentHandler = handlers[index++];
        await currentHandler(req, res, next);
      }
    };
    await next();
  }

  it('should have authLimiter applied on POST /bookings/recover', () => {
    const handlers = getRecoverBookingHandlers();
    expect(handlers).toContain(authLimiter);
  });

  it('should allow recovery when rate limit is not exceeded', async () => {
    const handlers = getRecoverBookingHandlers();
    const req: any = {
      body: { transactionId: 'pay_mock_123456789' },
      simulateAuthLimitExceeded: false,
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await runMiddlewareChain(handlers, req, res);

    expect(authLimiter).toHaveBeenCalled();
    expect(recoverBooking).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return 429 and NOT execute recoverBooking when rate limit is exceeded', async () => {
    const handlers = getRecoverBookingHandlers();
    const req: any = {
      body: { transactionId: 'pay_mock_123456789' },
      simulateAuthLimitExceeded: true,
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await runMiddlewareChain(handlers, req, res);

    expect(authLimiter).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(recoverBooking).not.toHaveBeenCalled();
  });
});
