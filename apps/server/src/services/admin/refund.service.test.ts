import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRefund, processRefund, getRefunds } from './refund.service';
import { Refund } from '../../models/refund.schema';
import { Payment } from '../../models/payment.schema';
import { Booking } from '../../models/booking.schema';
import { cancelBooking, runInTransaction } from './booking.service';
import { BookingStatus, PaymentStatus } from '@mad/shared';
import { createNotificationSafe } from '../notification.service';
import { Notification } from '../../models/notification.schema';
import { QueueService } from '../queue.service';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'test_jwt_secret_with_32_characters_long_minimum',
    JWT_ADMIN_SECRET: 'test_jwt_secret_with_32_characters_long_minimum_admin',
    JWT_SESSION_SECRET: 'test_jwt_secret_with_32_characters_long_minimum_session',
  })),
}));

vi.mock('./booking.service', () => ({
  runInTransaction: vi.fn(async (fn) => fn('mock-session')),
  cancelBooking: vi.fn(),
  executeCancelBookingSideEffects: vi.fn(),
}));

vi.mock('../notification.service', () => ({
  createNotificationSafe: vi.fn(),
}));

vi.mock('../../models/notification.schema', () => ({
  Notification: {
    findOne: vi.fn(),
  },
}));

vi.mock('../queue.service', () => ({
  QueueService: {
    enqueue: vi.fn(),
  },
}));

// Mock Mongoose models to completely avoid database dependency and allow easy static/instance mocking
vi.mock('../../models/refund.schema', () => {
  const mockSave = vi.fn().mockImplementation(function (this: any) {
    return Promise.resolve(this);
  });
  const MockRefund = vi.fn().mockImplementation(function (this: any, data: any) {
    Object.assign(this, data);
    this.save = mockSave;
  });
  (MockRefund as any).findOne = vi.fn();
  (MockRefund as any).find = vi.fn();
  (MockRefund as any).countDocuments = vi.fn();
  return { Refund: MockRefund };
});

vi.mock('../../models/payment.schema', () => {
  const MockPayment = {
    findByIdAndUpdate: vi.fn(),
    findById: vi.fn(),
  };
  return { Payment: MockPayment };
});

vi.mock('../../models/booking.schema', () => {
  const MockBooking = {
    findById: vi.fn(),
  };
  return { Booking: MockBooking };
});

describe('Admin Refund Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRefund', () => {
    it('should reject if refund amount is less than or equal to 0 (Defense in Depth)', async () => {
      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 0, reason: 'Test' })
      ).rejects.toThrow('Refund amount must be greater than zero');
    });

    it('should reject if payment record is not found', async () => {
      vi.mocked(Payment.findById).mockResolvedValue(null);

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 100, reason: 'Test' })
      ).rejects.toThrow('Payment record not found');
    });

    it('should reject if payment does not belong to booking (Cross-Linking Verification)', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-different', status: PaymentStatus.PAID, amount: 500 };
      vi.mocked(Payment.findById).mockResolvedValue(mockPayment as any);

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 100, reason: 'Test' })
      ).rejects.toThrow('Payment does not belong to booking');
    });

    it('should reject if payment status is not paid or partially refunded', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.FAILED, amount: 500 };
      vi.mocked(Payment.findById).mockResolvedValue(mockPayment as any);

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 100, reason: 'Test' })
      ).rejects.toThrow('Only successful paid or partially refunded payments can be refunded');
    });

    it('should reject if booking record is not found', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      vi.mocked(Payment.findById).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(null);

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 100, reason: 'Test' })
      ).rejects.toThrow('Booking record not found');
    });

    it('should reject if booking status is not confirmed', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      const mockBooking = { _id: 'b-123', status: BookingStatus.CANCELLED };
      vi.mocked(Payment.findById).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 100, reason: 'Test' })
      ).rejects.toThrow('Only confirmed bookings can be refunded');
    });

    it('should reject if individual refund amount exceeds original payment amount', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      const mockBooking = { _id: 'b-123', status: BookingStatus.CONFIRMED };
      vi.mocked(Payment.findById).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 600, reason: 'Test' })
      ).rejects.toThrow('Refund amount cannot exceed original payment amount');
    });

    it('should reject if cumulative refund sum exceeds payment cap', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      const mockBooking = { _id: 'b-123', status: BookingStatus.CONFIRMED };
      vi.mocked(Payment.findById).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Refund.find).mockResolvedValue([
        { amount: 300, status: 'completed' },
        { amount: 150, status: 'requested' }
      ] as any);

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 100, reason: 'Test' })
      ).rejects.toThrow('Cumulative refund amount exceeds original payment amount');
    });

    it('should successfully create refund request when all constraints pass', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      const mockBooking = { _id: 'b-123', status: BookingStatus.CONFIRMED };
      vi.mocked(Payment.findById).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Refund.find).mockResolvedValue([] as any);

      const result = await createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 200, reason: 'Tier adjustment' });
      expect(result.amount).toBe(200);
      expect(result.status).toBe('requested');
      expect(result.bookingId).toBe('b-123');
    });
  });

  describe('processRefund', () => {
    it('should successfully approve a full refund, trigger booking cancellation, and mark payment status as REFUNDED', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'refund-123',
        bookingId: 'booking-456',
        paymentId: 'payment-789',
        amount: 500,
        status: 'requested',
        save: mockRefundSave,
      };

      const mockPayment = { _id: 'payment-789', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-456', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOne).mockReturnValue({ session: vi.fn().mockResolvedValue(mockRefund) } as any);
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      const mockBookingFindChain = {
        session: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockBooking),
        then: vi.fn().mockImplementation((resolve) => resolve(mockBooking)),
      };
      vi.mocked(Booking.findById).mockReturnValue(mockBookingFindChain as any);
      vi.mocked(Refund.find).mockReturnValue({ session: vi.fn().mockResolvedValue([]) } as any);
      vi.mocked(cancelBooking).mockResolvedValue({} as any);
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);

      const result = await processRefund('refund-123', 'approve', 'Full refund approve notes', 'gateway-ref-123');

      expect(result?.status).toBe('completed');
      expect(result?.gatewayRefundId).toBe('gateway-ref-123');
      expect(mockRefundSave).toHaveBeenCalled();
      expect(cancelBooking).toHaveBeenCalledWith('booking-456', 'Full refund approve notes', 'mock-session', BookingStatus.REFUNDED);
      expect(Payment.findByIdAndUpdate).toHaveBeenCalledWith(
        'payment-789',
        { status: PaymentStatus.REFUNDED },
        { session: 'mock-session' }
      );
    });

    it('should successfully approve a partial refund, trigger booking cancellation, and mark payment status as PARTIALLY_REFUNDED', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'refund-123',
        bookingId: 'booking-456',
        paymentId: 'payment-789',
        amount: 200,
        status: 'requested',
        save: mockRefundSave,
      };

      const mockPayment = { _id: 'payment-789', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-456', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOne).mockReturnValue({ session: vi.fn().mockResolvedValue(mockRefund) } as any);
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      const mockBookingFindChain = {
        session: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockBooking),
        then: vi.fn().mockImplementation((resolve) => resolve(mockBooking)),
      };
      vi.mocked(Booking.findById).mockReturnValue(mockBookingFindChain as any);
      vi.mocked(Refund.find).mockReturnValue({ session: vi.fn().mockResolvedValue([]) } as any);
      vi.mocked(cancelBooking).mockResolvedValue({} as any);
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);

      const result = await processRefund('refund-123', 'approve', 'Partial refund notes', 'gateway-ref-123');

      expect(result?.status).toBe('completed');
      expect(mockRefundSave).toHaveBeenCalled();
      expect(cancelBooking).toHaveBeenCalledWith('booking-456', 'Partial refund notes', 'mock-session', BookingStatus.REFUNDED);
      expect(Payment.findByIdAndUpdate).toHaveBeenCalledWith(
        'payment-789',
        { status: PaymentStatus.PARTIALLY_REFUNDED },
        { session: 'mock-session' }
      );
    });

    it('should successfully reject a refund and update status without cancelling booking or refunding payment', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'refund-123',
        bookingId: 'booking-456',
        paymentId: 'payment-789',
        amount: 100,
        status: 'requested',
        save: mockRefundSave,
      };

      vi.mocked(Refund.findOne).mockReturnValue({ session: vi.fn().mockResolvedValue(mockRefund) } as any);

      const result = await processRefund('refund-123', 'reject', 'Reject notes');

      expect(result?.status).toBe('failed');
      expect(mockRefundSave).toHaveBeenCalled();
      expect(cancelBooking).not.toHaveBeenCalled();
      expect(Payment.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw an error if the requested refund is not found or already processed', async () => {
      vi.mocked(Refund.findOne).mockReturnValue({ session: vi.fn().mockResolvedValue(null) } as any);

      await expect(
        processRefund('refund-123', 'approve', 'Approve notes')
      ).rejects.toThrow('Refund request not found or has already been processed');

      expect(cancelBooking).not.toHaveBeenCalled();
      expect(Payment.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should reject processing if the payment is already fully refunded', async () => {
      const mockRefund = { _id: 'refund-123', bookingId: 'booking-456', paymentId: 'payment-789', amount: 100, status: 'requested' };
      const mockPayment = { _id: 'payment-789', amount: 500, status: PaymentStatus.REFUNDED };

      vi.mocked(Refund.findOne).mockReturnValue({ session: vi.fn().mockResolvedValue(mockRefund) } as any);
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);

      await expect(
        processRefund('refund-123', 'approve', 'Approve notes')
      ).rejects.toThrow('Payment has already been fully refunded');

      expect(cancelBooking).not.toHaveBeenCalled();
    });

    it('should reject processing if cumulative approved refunds exceed the payment amount', async () => {
      const mockRefund = { _id: 'refund-123', bookingId: 'booking-456', paymentId: 'payment-789', amount: 300, status: 'requested' };
      const mockPayment = { _id: 'payment-789', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-456', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOne).mockReturnValue({ session: vi.fn().mockResolvedValue(mockRefund) } as any);
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue({
        session: vi.fn().mockResolvedValue([{ amount: 300 }]) // 300 + 300 > 500
      } as any);

      await expect(
        processRefund('refund-123', 'approve', 'Approve notes')
      ).rejects.toThrow('Refund amount exceeds remaining captured balance');

      expect(cancelBooking).not.toHaveBeenCalled();
    });

    it('should not execute post-commit side effects if refund transaction fails', async () => {
      const mockRefund = { _id: 'refund-123', bookingId: 'booking-456', paymentId: 'payment-789', amount: 100, status: 'requested' };
      vi.mocked(Refund.findOne).mockReturnValue({ session: vi.fn().mockResolvedValue(mockRefund) } as any);

      // Mock runInTransaction to simulate a transaction failure
      vi.mocked(runInTransaction).mockRejectedValueOnce(new Error('Transaction aborted'));

      await expect(
        processRefund('refund-123', 'approve', 'Approve notes')
      ).rejects.toThrow('Transaction aborted');

      expect(createNotificationSafe).not.toHaveBeenCalled();
      expect(QueueService.enqueue).not.toHaveBeenCalled();
    });

    it('should not roll back refund approval if queue enqueue fails after commit', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'refund-123',
        bookingId: 'booking-456',
        paymentId: 'payment-789',
        amount: 500,
        status: 'requested',
        processedAt: new Date(),
        save: mockRefundSave,
      };

      const mockPayment = { _id: 'payment-789', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-456', status: BookingStatus.CONFIRMED, totalAmount: 500, guestEmail: 'guest@example.com', guestName: 'Guest', eventId: 'event-555' };

      vi.mocked(Refund.findOne).mockReturnValue({ session: vi.fn().mockResolvedValue(mockRefund) } as any);
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);

      const mockBookingFindChain = {
        session: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockBooking),
        then: vi.fn().mockImplementation((resolve) => resolve(mockBooking)),
      };
      vi.mocked(Booking.findById).mockReturnValue(mockBookingFindChain as any);

      vi.mocked(Refund.find).mockReturnValue({ session: vi.fn().mockResolvedValue([]) } as any);
      vi.mocked(cancelBooking).mockResolvedValue({ booking: mockBooking, postCommitPayload: null } as any);
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);

      vi.mocked(Notification.findOne).mockResolvedValue(null);
      vi.mocked(createNotificationSafe).mockResolvedValue({ _id: 'notification-123' });
      vi.mocked(QueueService.enqueue).mockRejectedValue(new Error('Queue failure'));

      const result = await processRefund('refund-123', 'approve', 'Approve notes');

      expect(result?.status).toBe('completed');
      expect(mockRefundSave).toHaveBeenCalled();
      expect(createNotificationSafe).toHaveBeenCalled();
      expect(QueueService.enqueue).toHaveBeenCalled();
    });

    it('should not roll back refund approval if notification creation fails after commit, and skip enqueue', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'refund-123',
        bookingId: 'booking-456',
        paymentId: 'payment-789',
        amount: 500,
        status: 'requested',
        processedAt: new Date(),
        save: mockRefundSave,
      };

      const mockPayment = { _id: 'payment-789', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-456', status: BookingStatus.CONFIRMED, totalAmount: 500, guestEmail: 'guest@example.com', guestName: 'Guest', eventId: 'event-555' };

      vi.mocked(Refund.findOne).mockReturnValue({ session: vi.fn().mockResolvedValue(mockRefund) } as any);
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);

      const mockBookingFindChain = {
        session: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockBooking),
        then: vi.fn().mockImplementation((resolve) => resolve(mockBooking)),
      };
      vi.mocked(Booking.findById).mockReturnValue(mockBookingFindChain as any);

      vi.mocked(Refund.find).mockReturnValue({ session: vi.fn().mockResolvedValue([]) } as any);
      vi.mocked(cancelBooking).mockResolvedValue({ booking: mockBooking, postCommitPayload: null } as any);
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);

      vi.mocked(Notification.findOne).mockResolvedValue(null);
      vi.mocked(createNotificationSafe).mockRejectedValue(new Error('Notification DB write failed'));

      const result = await processRefund('refund-123', 'approve', 'Approve notes');

      expect(result?.status).toBe('completed');
      expect(mockRefundSave).toHaveBeenCalled();
      expect(createNotificationSafe).toHaveBeenCalled();
      expect(QueueService.enqueue).not.toHaveBeenCalled();
    });
  });
});
