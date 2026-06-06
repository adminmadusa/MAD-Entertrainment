import { vi } from 'vitest';

vi.hoisted(() => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'this_is_a_very_long_jwt_secret_with_more_than_32_characters';
  process.env.JWT_ADMIN_SECRET = 'this_is_a_very_long_jwt_admin_secret_with_more_than_32_characters';
  process.env.JWT_SESSION_SECRET = 'this_is_a_very_long_jwt_session_secret_with_more_than_32_characters';
});

import { describe, it, expect, beforeEach } from 'vitest';
import { createBooking, recoverBooking } from './booking.controller';
import { PublicBookingService } from '../../services/public/booking.service';
import { BookingRecoveryService } from '../../services/public/booking-recovery.service';
import { auditLog } from '../../utils/audit';
import { AppError } from '../../middleware/error.middleware';

vi.mock('../../services/public/booking.service', () => ({
  PublicBookingService: {
    createBooking: vi.fn(),
  },
}));

vi.mock('../../services/public/booking-recovery.service', () => ({
  BookingRecoveryService: {
    recoverBookingByTransactionId: vi.fn(),
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

  it('should return 200 and guest email on success, logging attempt and success', async () => {
    vi.mocked(BookingRecoveryService.recoverBookingByTransactionId).mockResolvedValue({
      guestEmail: 'kalyan@gmail.com',
      bookingId: 'MAD-2026-ABCDE',
    });

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

    expect(BookingRecoveryService.recoverBookingByTransactionId).toHaveBeenCalledWith('pay_mock_123456789');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      email: 'kalyan@gmail.com',
    });

    // Check that TRANSACTION_RECOVERY_LOOKUP and TRANSACTION_RECOVERY_SUCCESS were logged with masked ID
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

