import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'this_is_a_very_long_jwt_secret_with_more_than_32_characters';
  process.env.JWT_ADMIN_SECRET = 'this_is_a_very_long_jwt_admin_secret_with_more_than_32_characters';
  process.env.JWT_SESSION_SECRET = 'this_is_a_very_long_jwt_session_secret_with_more_than_32_characters';
});

import { Types } from 'mongoose';
import { PaymentStatus, BookingStatus } from '@mad/shared';

import { BookingRecoveryService } from './booking-recovery.service';
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
    expect(result).toEqual({ guestEmail, bookingId });
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
