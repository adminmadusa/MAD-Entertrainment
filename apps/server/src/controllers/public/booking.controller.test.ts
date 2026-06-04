import { vi } from 'vitest';

vi.hoisted(() => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'this_is_a_very_long_jwt_secret_with_more_than_32_characters';
  process.env.JWT_ADMIN_SECRET = 'this_is_a_very_long_jwt_admin_secret_with_more_than_32_characters';
  process.env.JWT_SESSION_SECRET = 'this_is_a_very_long_jwt_session_secret_with_more_than_32_characters';
});

import { describe, it, expect, beforeEach } from 'vitest';
import { createBooking } from './booking.controller';
import { PublicBookingService } from '../../services/public/booking.service';

vi.mock('../../services/public/booking.service', () => ({
  PublicBookingService: {
    createBooking: vi.fn(),
  },
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
