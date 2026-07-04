import { vi } from 'vitest';
import { Types } from 'mongoose';

vi.hoisted(() => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'this_is_a_very_long_jwt_secret_with_more_than_32_characters';
  process.env.JWT_ADMIN_SECRET = 'this_is_a_very_long_jwt_admin_secret_with_more_than_32_characters';
  process.env.JWT_SESSION_SECRET = 'this_is_a_very_long_jwt_session_secret_with_more_than_32_characters';
});

import { describe, it, expect, beforeEach } from 'vitest';
import { createBooking, recoverBooking, verifyRecoveredBookingOTP, getBooking, downloadBookingPDF, resendBookingTickets } from './booking.controller';
import { PublicBookingService } from '../../services/public/booking.service';
import { BookingRecoveryService } from '../../services/public/booking-recovery.service';
import { AuthService } from '../../services/public/auth.service';
import { auditLog } from '../../utils/audit';
import { AppError } from '../../middleware/error.middleware';

vi.mock('../../services/public/booking.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/public/booking.service')>();
  return {
    PublicBookingService: {
      createBooking: vi.fn(),
      getBookingByReference: vi.fn(),
      assertBookingAccess: actual.PublicBookingService.assertBookingAccess,
    },
  };
});

vi.mock('../../services/public/booking-recovery.service', () => ({
  BookingRecoveryService: {
    recoverBookingByTransactionId: vi.fn(),
    getBookingByTransactionId: vi.fn(),
  },
}));

vi.mock('../../services/public/auth.service', () => ({
  AuthService: {
    requestMagicLink: vi.fn(),
    verifyMagicLinkOrOTP: vi.fn(),
  },
}));

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('../../utils/response', () => ({
  sendSuccess: vi.fn((res, data, message, statusCode) => {
    res.status(statusCode || 200).json({ success: true, data, message });
  }),
}));

describe('Booking Controller — createBooking Idempotency Response', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 201 and X-Booking-Idempotency: New for a newly created booking', async () => {
    const mockBooking = { _id: 'b-123', bookingId: 'MAD-2026-NEW01' };
    vi.mocked(PublicBookingService.createBooking).mockResolvedValue(mockBooking as any);

    const req: any = {
      body: { eventId: 'e-123', tickets: [] },
      session: { sessionId: 'session-123' },
    };
    const res: any = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await createBooking(req, res, next);

    expect(PublicBookingService.createBooking).toHaveBeenCalledWith(
      req.body,
      'session-123',
      undefined
    );
    expect(res.setHeader).toHaveBeenCalledWith('X-Booking-Idempotency', 'New');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should return 200 and X-Booking-Idempotency: Reused for a reused booking', async () => {
    const mockBooking = { _id: 'b-123', bookingId: 'MAD-2026-REU01', isReused: true };
    vi.mocked(PublicBookingService.createBooking).mockResolvedValue(mockBooking as any);

    const req: any = {
      body: { eventId: 'e-123', tickets: [] },
      session: { sessionId: 'session-123' },
    };
    const res: any = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await createBooking(req, res, next);

    expect(PublicBookingService.createBooking).toHaveBeenCalledWith(
      req.body,
      'session-123',
      undefined
    );
    expect(res.setHeader).toHaveBeenCalledWith('X-Booking-Idempotency', 'Reused');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('Booking Controller — recoverBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200, masked email, and otpDispatched true on success, logging attempt, dispatch, and success', async () => {
    vi.mocked(BookingRecoveryService.recoverBookingByTransactionId).mockResolvedValue({
      guestEmail: 'kalyan@gmail.com',
      maskedEmail: 'k*****n@gmail.com',
      bookingId: 'MAD-2026-ABCDE',
    });

    vi.mocked(AuthService.requestMagicLink).mockResolvedValue(undefined as any);

    const req: any = {
      body: { transactionId: 'pay_mock_123456789' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Mozilla/5.0', origin: 'http://localhost:3000' },
      socket: {},
    };

    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await recoverBooking(req, res, next);

    expect(BookingRecoveryService.recoverBookingByTransactionId).toHaveBeenCalledWith('pay_mock_123456789');
    expect(AuthService.requestMagicLink).toHaveBeenCalledWith('kalyan@gmail.com', 'http://localhost:3000');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      bookingId: 'MAD-2026-ABCDE',
      guestEmail: 'kalyan@gmail.com',
      maskedEmail: 'k*****n@gmail.com',
      otpDispatched: true,
      cooldownSeconds: 60,
    });

    // Check that TRANSACTION_RECOVERY_LOOKUP, TRANSACTION_RECOVERY_SUCCESS, and TRANSACTION_RECOVERY_OTP_DISPATCH were logged
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRANSACTION_RECOVERY_LOOKUP',
        metadata: expect.objectContaining({
          transactionId: 'pay_...6789',
        }),
      })
    );
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRANSACTION_RECOVERY_SUCCESS',
        metadata: expect.objectContaining({
          transactionId: 'pay_...6789',
          bookingId: 'MAD-2026-ABCDE',
        }),
      })
    );
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRANSACTION_RECOVERY_OTP_DISPATCH',
        metadata: expect.objectContaining({
          transactionId: 'pay_...6789',
          bookingId: 'MAD-2026-ABCDE',
          email: 'k*****n@gmail.com',
        }),
      })
    );
  });

  it('should return 200 with otpDispatched false and cooldownSeconds when OTP cooldown is active', async () => {
    vi.mocked(BookingRecoveryService.recoverBookingByTransactionId).mockResolvedValue({
      guestEmail: 'kalyan@gmail.com',
      maskedEmail: 'k*****n@gmail.com',
      bookingId: 'MAD-2026-ABCDE',
    });

    vi.mocked(AuthService.requestMagicLink).mockRejectedValue(
      AppError.tooManyRequests('Please wait before requesting another code.', 'OTP_COOLDOWN_ACTIVE', 45)
    );

    const req: any = {
      body: { transactionId: 'pay_mock_123456789' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Mozilla/5.0', origin: 'http://localhost:3000' },
      socket: {},
    };

    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await recoverBooking(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      bookingId: 'MAD-2026-ABCDE',
      guestEmail: 'kalyan@gmail.com',
      maskedEmail: 'k*****n@gmail.com',
      otpDispatched: false,
      cooldownSeconds: 45,
    });

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRANSACTION_RECOVERY_OTP_COOLDOWN',
        metadata: expect.objectContaining({
          transactionId: 'pay_...6789',
          retryAfter: 45,
        }),
      })
    );
  });

  it('should return 404 on recovery info not found, logging lookup and failure', async () => {
    vi.mocked(BookingRecoveryService.recoverBookingByTransactionId).mockRejectedValue(
      new AppError('Recovery information not found', 404)
    );

    const req: any = {
      body: { transactionId: 'pay_mock_123456789' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Mozilla/5.0' },
      socket: {},
    };

    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await recoverBooking(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Recovery information not found.',
    });

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRANSACTION_RECOVERY_NOT_FOUND',
        metadata: expect.objectContaining({
          transactionId: 'pay_...6789',
          reason: 'Recovery information not found',
        }),
      })
    );
  });

  it('should pass unexpected errors to next middleware', async () => {
    const error = new Error('Database connection failed');
    vi.mocked(BookingRecoveryService.recoverBookingByTransactionId).mockRejectedValue(error);

    const req: any = {
      body: { transactionId: 'pay_mock_123456789' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Mozilla/5.0' },
      socket: {},
    };

    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await recoverBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('Booking Controller — verifyRecoveredBookingOTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200, user profile, and set cookie on successful OTP verification', async () => {
    const mockUserId = new Types.ObjectId();
    const mockBooking = {
      bookingId: 'MAD-2026-ABCDE',
      guestEmail: 'kalyan@gmail.com',
    };

    vi.mocked(BookingRecoveryService.getBookingByTransactionId).mockResolvedValue(mockBooking as any);

    vi.mocked(AuthService.verifyMagicLinkOrOTP).mockResolvedValue({
      user: {
        _id: mockUserId,
        email: 'kalyan@gmail.com',
        name: 'Kalyan',
        firstName: 'Kalyan',
        lastName: 'Dev',
      },
      accessToken: 'access_token_mock',
      refreshToken: 'refresh_token_mock',
    } as any);

    const req: any = {
      body: { transactionId: 'pay_mock_123456789', otp: '123456' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Mozilla/5.0' },
      socket: {},
    };

    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn(),
    };
    const next = vi.fn();

    await verifyRecoveredBookingOTP(req, res, next);

    expect(BookingRecoveryService.getBookingByTransactionId).toHaveBeenCalledWith('pay_mock_123456789');
    expect(AuthService.verifyMagicLinkOrOTP).toHaveBeenCalledWith('123456', 'kalyan@gmail.com');
    expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh_token_mock', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        user: {
          id: mockUserId,
          email: 'kalyan@gmail.com',
          name: 'Kalyan',
          picture: undefined,
        },
        token: 'access_token_mock',
        onboardingRequired: false,
      },
    });

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRANSACTION_RECOVERY_VERIFY_SUCCESS',
        metadata: expect.objectContaining({
          transactionId: 'pay_...6789',
          bookingId: 'MAD-2026-ABCDE',
        }),
      })
    );
  });

  it('should return 400 or other AppError if verifyMagicLinkOrOTP fails', async () => {
    const mockBooking = {
      bookingId: 'MAD-2026-ABCDE',
      guestEmail: 'kalyan@gmail.com',
    };

    vi.mocked(BookingRecoveryService.getBookingByTransactionId).mockResolvedValue(mockBooking as any);

    vi.mocked(AuthService.verifyMagicLinkOrOTP).mockRejectedValue(
      new AppError('Invalid verification code.', 400)
    );

    const req: any = {
      body: { transactionId: 'pay_mock_123456789', otp: '111111' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Mozilla/5.0' },
      socket: {},
    };

    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn(),
    };
    const next = vi.fn();

    await verifyRecoveredBookingOTP(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRANSACTION_RECOVERY_VERIFY_FAILURE',
        metadata: expect.objectContaining({
          transactionId: 'pay_...6789',
          reason: 'Invalid verification code.',
        }),
      })
    );
  });
});

describe('Booking Controller — Guest Ownership & Booking Enumeration Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Anonymous / Guest Requests ─────────────────────────────────

  it('should return 403 BOOKING_VERIFICATION_REQUIRED for an anonymous request on a missing booking', async () => {
    vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue(null as any);

    const req: any = {
      params: { bookingId: 'MAD-2026-MISSING' },
      header: vi.fn(),
      session: undefined,
      user: undefined,
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await getBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'BOOKING_VERIFICATION_REQUIRED',
        message: 'Email verification required',
      })
    );
  });

  it('should return 403 BOOKING_VERIFICATION_REQUIRED for an anonymous request on an existing unowned booking', async () => {
    const mockBooking = {
      _id: 'b-123',
      bookingId: 'MAD-2026-UNOWNED',
      sessionId: 'session-other',
      userId: 'user-other',
    };
    vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue({
      booking: mockBooking as any,
      tickets: [],
      ticketsReady: true,
    });

    const req: any = {
      params: { bookingId: 'MAD-2026-UNOWNED' },
      header: vi.fn(),
      session: undefined,
      user: undefined,
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await getBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'BOOKING_VERIFICATION_REQUIRED',
        message: 'Email verification required',
      })
    );
  });

  // ─── Authenticated Requests ─────────────────────────────────────

  it('should return 404 for an authenticated request on a missing booking', async () => {
    vi.mocked(PublicBookingService.getBookingByReference).mockRejectedValue(AppError.notFound('Booking not found'));

    const req: any = {
      params: { bookingId: 'MAD-2026-MISSING' },
      header: vi.fn(),
      session: undefined,
      user: { sub: 'user-123' },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await getBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Booking not found',
      })
    );
  });

  it('should return 403 Forbidden without BOOKING_VERIFICATION_REQUIRED when an authenticated user requests another user\'s booking', async () => {
    const mockBooking = {
      _id: 'b-123',
      bookingId: 'MAD-2026-UNOWNED',
      userId: 'user-other', // Owned by someone else
    };
    vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue({
      booking: mockBooking as any,
      tickets: [],
      ticketsReady: true,
    });

    const req: any = {
      params: { bookingId: 'MAD-2026-UNOWNED' },
      header: vi.fn(),
      session: undefined,
      user: { sub: 'user-123' }, // Authenticated request
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await getBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'You do not have access to this booking',
      })
    );
    // Explicitly verify BOOKING_VERIFICATION_REQUIRED is NOT set on the error
    const thrownError = next.mock.calls[0][0];
    expect(thrownError.code).toBeUndefined();
  });

  it('should return 200 and data when an authenticated owner queries their own booking', async () => {
    const mockBooking = {
      _id: 'b-123',
      bookingId: 'MAD-2026-OWNED',
      userId: 'user-123',
    };
    const mockResult = {
      booking: mockBooking as any,
      tickets: [],
      ticketsReady: true,
    };
    vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue(mockResult);

    const req: any = {
      params: { bookingId: 'MAD-2026-OWNED' },
      header: vi.fn(),
      session: undefined,
      user: { sub: 'user-123' },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await getBooking(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockResult,
      })
    );
  });

  // ─── Download Endpoint ──────────────────────────────────────────

  it('should return 403 BOOKING_VERIFICATION_REQUIRED on PDF download for anonymous missing booking', async () => {
    vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue(null as any);

    const req: any = {
      params: { bookingId: 'MAD-2026-MISSING' },
      header: vi.fn(),
      session: undefined,
      user: undefined,
    };
    const res: any = {};
    const next = vi.fn();

    await downloadBookingPDF(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'BOOKING_VERIFICATION_REQUIRED',
      })
    );
  });

  it('should return 403 BOOKING_VERIFICATION_REQUIRED on PDF download for anonymous unowned booking', async () => {
    const mockBooking = {
      _id: 'b-123',
      bookingId: 'MAD-2026-UNOWNED',
      sessionId: 'session-other',
    };
    vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue({
      booking: mockBooking as any,
      tickets: [],
      ticketsReady: true,
    });

    const req: any = {
      params: { bookingId: 'MAD-2026-UNOWNED' },
      header: vi.fn(),
      session: undefined,
      user: undefined,
    };
    const res: any = {};
    const next = vi.fn();

    await downloadBookingPDF(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'BOOKING_VERIFICATION_REQUIRED',
      })
    );
  });

  // ─── Resend Endpoint ───────────────────────────────────────────

  it('should return 403 BOOKING_VERIFICATION_REQUIRED on resend for anonymous missing booking', async () => {
    vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue(null as any);

    const req: any = {
      params: { bookingId: 'MAD-2026-MISSING' },
      header: vi.fn(),
      session: undefined,
      user: undefined,
    };
    const res: any = {};
    const next = vi.fn();

    await resendBookingTickets(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'BOOKING_VERIFICATION_REQUIRED',
      })
    );
  });

  it('should return 403 BOOKING_VERIFICATION_REQUIRED on resend for anonymous unowned booking', async () => {
    const mockBooking = {
      _id: 'b-123',
      bookingId: 'MAD-2026-UNOWNED',
      sessionId: 'session-other',
    };
    vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue({
      booking: mockBooking as any,
      tickets: [],
      ticketsReady: true,
    });

    const req: any = {
      params: { bookingId: 'MAD-2026-UNOWNED' },
      header: vi.fn(),
      session: undefined,
      user: undefined,
    };
    const res: any = {};
    const next = vi.fn();

    await resendBookingTickets(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'BOOKING_VERIFICATION_REQUIRED',
      })
    );
  });

  // ─── Authenticated User - Download & Resend Endpoints ───────────

  it('should return 403 Forbidden without BOOKING_VERIFICATION_REQUIRED on PDF download for authenticated user on unowned booking', async () => {
    const mockBooking = {
      _id: 'b-123',
      bookingId: 'MAD-2026-UNOWNED',
      userId: 'user-other',
    };
    vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue({
      booking: mockBooking as any,
      tickets: [],
      ticketsReady: true,
    });

    const req: any = {
      params: { bookingId: 'MAD-2026-UNOWNED' },
      header: vi.fn(),
      session: undefined,
      user: { sub: 'user-123' },
    };
    const res: any = {};
    const next = vi.fn();

    await downloadBookingPDF(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'You do not have access to this booking',
      })
    );
    const thrownError = next.mock.calls[0][0];
    expect(thrownError.code).toBeUndefined();
  });

  it('should return 404 on PDF download for authenticated user on missing booking', async () => {
    vi.mocked(PublicBookingService.getBookingByReference).mockRejectedValue(AppError.notFound('Booking not found'));

    const req: any = {
      params: { bookingId: 'MAD-2026-MISSING' },
      header: vi.fn(),
      session: undefined,
      user: { sub: 'user-123' },
    };
    const res: any = {};
    const next = vi.fn();

    await downloadBookingPDF(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Booking not found',
      })
    );
  });

  it('should return 403 Forbidden without BOOKING_VERIFICATION_REQUIRED on resend for authenticated user on unowned booking', async () => {
    const mockBooking = {
      _id: 'b-123',
      bookingId: 'MAD-2026-UNOWNED',
      userId: 'user-other',
    };
    vi.mocked(PublicBookingService.getBookingByReference).mockResolvedValue({
      booking: mockBooking as any,
      tickets: [],
      ticketsReady: true,
    });

    const req: any = {
      params: { bookingId: 'MAD-2026-UNOWNED' },
      header: vi.fn(),
      session: undefined,
      user: { sub: 'user-123' },
    };
    const res: any = {};
    const next = vi.fn();

    await resendBookingTickets(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'You do not have access to this booking',
      })
    );
    const thrownError = next.mock.calls[0][0];
    expect(thrownError.code).toBeUndefined();
  });

  it('should return 404 on resend for authenticated user on missing booking', async () => {
    vi.mocked(PublicBookingService.getBookingByReference).mockRejectedValue(AppError.notFound('Booking not found'));

    const req: any = {
      params: { bookingId: 'MAD-2026-MISSING' },
      header: vi.fn(),
      session: undefined,
      user: { sub: 'user-123' },
    };
    const res: any = {};
    const next = vi.fn();

    await resendBookingTickets(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Booking not found',
      })
    );
  });
});
