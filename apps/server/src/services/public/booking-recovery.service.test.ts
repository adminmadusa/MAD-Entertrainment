import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'this_is_a_very_long_jwt_secret_with_more_than_32_characters';
  process.env.JWT_ADMIN_SECRET = 'this_is_a_very_long_jwt_admin_secret_with_more_than_32_characters';
  process.env.JWT_SESSION_SECRET = 'this_is_a_very_long_jwt_session_secret_with_more_than_32_characters';
});

import { Types } from 'mongoose';
import { PaymentStatus, BookingStatus } from '@mad/shared';

import { BookingRecoveryService, maskEmail } from './booking-recovery.service';
import { Payment } from '../../models/payment.schema';
import { Booking } from '../../models/booking.schema';
import { AppError } from '../../middleware/error.middleware';

vi.mock('../../models/payment.schema', () => ({
  Payment: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
  },
}));

describe('BookingRecoveryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const transactionId = 'pay_mock_12345';
  const bookingObjectId = new Types.ObjectId();
  const guestEmail = 'test@example.com';
  const bookingId = 'MAD-2026-ABCDE';

  it('should successfully recover the email when all eligibility checks pass', async () => {
    const mockPayment = {
      _id: new Types.ObjectId(),
      bookingId: bookingObjectId,
      status: PaymentStatus.PAID,
      gatewayPaymentId: transactionId,
    };

    const mockBooking = {
      _id: bookingObjectId,
      bookingId,
      status: BookingStatus.CONFIRMED,
      guestEmail,
    };

    vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
    vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

    const result = await BookingRecoveryService.recoverBookingByTransactionId(transactionId);

    expect(Payment.findOne).toHaveBeenCalledWith({
      $or: [
        { gatewayPaymentId: transactionId },
        { gatewayOrderId: transactionId },
      ],
      status: PaymentStatus.PAID,
    });
    expect(Booking.findById).toHaveBeenCalledWith(bookingObjectId);
    // Email must be masked — not the raw address
    expect(result.guestEmail).not.toBe(guestEmail);
    expect(result.guestEmail).toMatch(/^t\*+t@example\.com$/);
    expect(result.bookingId).toBe(bookingId);
  });

  it('should throw 404 AppError if payment is not found', async () => {
    vi.mocked(Payment.findOne).mockResolvedValue(null);

    await expect(
      BookingRecoveryService.recoverBookingByTransactionId(transactionId)
    ).rejects.toThrowError(new AppError('Recovery information not found', 404));
  });

  it('should throw 404 AppError if booking is not found', async () => {
    const mockPayment = {
      _id: new Types.ObjectId(),
      bookingId: bookingObjectId,
      status: PaymentStatus.PAID,
      gatewayPaymentId: transactionId,
    };

    vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
    vi.mocked(Booking.findById).mockResolvedValue(null);

    await expect(
      BookingRecoveryService.recoverBookingByTransactionId(transactionId)
    ).rejects.toThrowError(new AppError('Recovery information not found', 404));
  });

  it('should throw 404 AppError if booking is cancelled', async () => {
    const mockPayment = {
      _id: new Types.ObjectId(),
      bookingId: bookingObjectId,
      status: PaymentStatus.PAID,
      gatewayPaymentId: transactionId,
    };

    const mockBooking = {
      _id: bookingObjectId,
      bookingId,
      status: BookingStatus.CANCELLED,
      guestEmail,
    };

    vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
    vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

    await expect(
      BookingRecoveryService.recoverBookingByTransactionId(transactionId)
    ).rejects.toThrowError(new AppError('Recovery information not found', 404));
  });

  it('should throw 404 AppError if guest email is missing', async () => {
    const mockPayment = {
      _id: new Types.ObjectId(),
      bookingId: bookingObjectId,
      status: PaymentStatus.PAID,
      gatewayPaymentId: transactionId,
    };

    const mockBooking = {
      _id: bookingObjectId,
      bookingId,
      status: BookingStatus.CONFIRMED,
      guestEmail: undefined,
    };

    vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
    vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

    await expect(
      BookingRecoveryService.recoverBookingByTransactionId(transactionId)
    ).rejects.toThrowError(new AppError('Recovery information not found', 404));
  });
});

describe('maskEmail', () => {
  it('should mask a standard email, preserving first and last local chars', () => {
    expect(maskEmail('customer@example.com')).toBe('c******r@example.com');
  });

  it('should mask a short 3-char local part', () => {
    expect(maskEmail('abc@example.com')).toBe('a*c@example.com');
  });

  it('should mask a 2-char local part', () => {
    expect(maskEmail('ab@example.com')).toBe('a*@example.com');
  });

  it('should mask a 1-char local part', () => {
    expect(maskEmail('a@example.com')).toBe('a****@example.com');
  });

  it('should return **** for an invalid email with no @ symbol', () => {
    expect(maskEmail('invalid')).toBe('****');
  });

  it('should preserve the full domain including subdomain', () => {
    expect(maskEmail('test@mail.example.co.in')).toBe('t**t@mail.example.co.in');
  });
});
