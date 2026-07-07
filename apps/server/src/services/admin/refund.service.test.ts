import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, PaymentStatus } from '@mad/shared';

import { createRazorpayRefund } from '../../lib/razorpay/refund.client';
import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { Notification } from '../../models/notification.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { Ticket } from '../../models/ticket.schema';
import { auditLog } from '../../utils/audit';
import { runInTransaction } from '../../utils/transaction';
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';
import { cancelBooking } from './booking.service';
import { createRefund, processRefund, getRefunds } from './refund.service';

vi.mock('../../lib/razorpay/refund.client', () => ({
  createRazorpayRefund: vi.fn(),
}));

const mockStripeRefundsCreate = vi.fn();
vi.mock('../../config/stripe', () => ({
  getStripe: () => ({
    refunds: {
      create: mockStripeRefundsCreate,
    },
  }),
}));

const mockRazorpayPaymentsRefund = vi.fn();
vi.mock('../../config/razorpay', () => ({
  getRazorpay: () => ({
    payments: {
      refund: mockRazorpayPaymentsRefund,
    },
  }),
}));

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'test_jwt_secret_with_32_characters_long_minimum',
    JWT_ADMIN_SECRET: 'test_jwt_secret_with_32_characters_long_minimum_admin',
    JWT_SESSION_SECRET: 'test_jwt_secret_with_32_characters_long_minimum_session',
    RAZORPAY_KEY_ID: 'test_key_id',
    RAZORPAY_KEY_SECRET: 'test_key_secret',
  })),
}));

vi.mock('./booking.service', () => ({
  cancelBooking: vi.fn(),
  executeCancelBookingSideEffects: vi.fn(),
}));

vi.mock('../../utils/transaction', () => ({
  runInTransaction: vi.fn(async (fn) => fn('mock-session')),
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

const createMockQuery = (val: any) => {
  const query = Promise.resolve(val);
  (query as any).session = vi.fn().mockReturnValue(query);
  (query as any).populate = vi.fn().mockReturnValue(query);
  (query as any).sort = vi.fn().mockReturnValue(query);
  (query as any).limit = vi.fn().mockReturnValue(query);
  (query as any).skip = vi.fn().mockReturnValue(query);
  return query as any;
};

// Mock Mongoose models to completely avoid database dependency and allow easy static/instance mocking
vi.mock('../../models/refund.schema', () => {
  const MockRefund = vi.fn().mockImplementation(function (this: any, data: any) {
    Object.assign(this, data);
  });
  MockRefund.prototype.save = vi.fn().mockImplementation(function (this: any) {
    return Promise.resolve(this);
  });

  const localCreateMockQuery = (val: any) => {
    const query = Promise.resolve(val);
    (query as any).session = () => query;
    (query as any).populate = () => query;
    (query as any).sort = () => query;
    (query as any).limit = () => query;
    (query as any).skip = () => query;
    return query;
  };

  (MockRefund as any).findOne = vi.fn().mockImplementation(() => localCreateMockQuery(null));
  (MockRefund as any).findOneAndUpdate = vi.fn().mockImplementation(() => localCreateMockQuery(null));
  (MockRefund as any).find = vi.fn().mockImplementation(() => localCreateMockQuery([]));
  (MockRefund as any).countDocuments = vi.fn().mockImplementation(() => localCreateMockQuery(0));
  (MockRefund as any).updateOne = vi.fn().mockImplementation(() => localCreateMockQuery({ modifiedCount: 1 }));
  return { Refund: MockRefund };
});

vi.mock('../../models/payment.schema', () => {
  const localCreateMockQuery = (val: any) => {
    const query = Promise.resolve(val);
    (query as any).session = () => query;
    (query as any).populate = () => query;
    (query as any).sort = () => query;
    (query as any).limit = () => query;
    (query as any).skip = () => query;
    return query;
  };
  const MockPayment = {
    findByIdAndUpdate: vi.fn().mockImplementation(() => localCreateMockQuery(null)),
    findById: vi.fn().mockImplementation(() => localCreateMockQuery(null)),
    findOneAndUpdate: vi.fn().mockImplementation(function (filter: any) {
      return MockPayment.findById(filter?._id || filter);
    }),
  };
  return { Payment: MockPayment };
});

vi.mock('../../models/booking.schema', () => {
  const localCreateMockQuery = (val: any) => {
    const query = Promise.resolve(val);
    (query as any).session = () => query;
    (query as any).populate = () => query;
    (query as any).sort = () => query;
    (query as any).limit = () => query;
    (query as any).skip = () => query;
    return query;
  };
  const MockBooking = {
    findById: vi.fn().mockImplementation(() => localCreateMockQuery(null)),
  };
  return { Booking: MockBooking };
});

vi.mock('../../models/ticket.schema', () => {
  const localCreateMockQuery = (val: any) => {
    const query = Promise.resolve(val);
    (query as any).session = () => query;
    return query;
  };
  const MockTicket = {
    find: vi.fn().mockImplementation(() => localCreateMockQuery([])),
  };
  return { Ticket: MockTicket };
});

describe('Admin Refund Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeRefundsCreate.mockReset();
    mockRazorpayPaymentsRefund.mockReset();
  });

  describe('createRefund', () => {
    it('should reject if refund amount is less than or equal to 0 (Defense in Depth)', async () => {
      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 0, reason: 'Test' })
      ).rejects.toThrow('Refund amount must be greater than zero');
    });

    it('should reject if payment record is not found', async () => {
      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(null));

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 100, reason: 'Test' })
      ).rejects.toThrow('Payment record not found');
    });

    it('should reject if payment does not belong to booking (Cross-Linking Verification)', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-different', status: PaymentStatus.PAID, amount: 500 };
      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(mockPayment));

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 100, reason: 'Test' })
      ).rejects.toThrow('Payment does not belong to booking');
    });

    it('should reject if payment status is not paid or partially refunded', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.FAILED, amount: 500 };
      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(mockPayment));

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 100, reason: 'Test' })
      ).rejects.toThrow('Only successful paid or partially refunded payments can be refunded');
    });

    it('should reject if booking record is not found', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(null));

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 100, reason: 'Test' })
      ).rejects.toThrow('Booking record not found');
    });

    it('should reject if booking status is not confirmed', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      const mockBooking = { _id: 'b-123', status: BookingStatus.CANCELLED };
      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 100, reason: 'Test' })
      ).rejects.toThrow('Only confirmed bookings can be refunded');
    });

    it('should reject if individual refund amount exceeds original payment amount', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      const mockBooking = { _id: 'b-123', status: BookingStatus.CONFIRMED };
      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 600, reason: 'Test' })
      ).rejects.toThrow('Refund amount cannot exceed original payment amount');
    });

    it('should reject if cumulative refund sum exceeds payment cap', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      const mockBooking = { _id: 'b-123', status: BookingStatus.CONFIRMED };
      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));
      vi.mocked(Refund.find).mockImplementation(() => createMockQuery([
        { amount: 300, status: 'completed' },
        { amount: 150, status: 'requested' }
      ]));

      await expect(
        createRefund({ bookingId: 'b-123', paymentId: 'p-123', amount: 100, reason: 'Test' })
      ).rejects.toThrow('Cumulative refund amount exceeds original payment amount');
    });

    it('should successfully create refund request when all constraints pass', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      const mockBooking = { _id: 'b-123', status: BookingStatus.CONFIRMED };
      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));
      vi.mocked(Refund.find).mockImplementation(() => createMockQuery([]));

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

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      const mockBookingFindChain = {
        session: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockBooking),
        then: vi.fn().mockImplementation((resolve) => resolve(mockBooking)),
      };
      vi.mocked(Booking.findById).mockReturnValue(mockBookingFindChain as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(cancelBooking).mockResolvedValue({} as any);
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);

      const result = await processRefund('refund-123', 'approve', 'Full refund approve notes', 'gateway-ref-123');

      expect(result?.status).toBe('completed');
      expect(result?.gatewayRefundId).toBe('gateway-ref-123');
      expect(mockRefundSave).toHaveBeenCalled();
      expect(cancelBooking).toHaveBeenCalledWith('booking-456', 'Full refund approve notes', 'mock-session', BookingStatus.REFUNDED, undefined);
      expect(Payment.findByIdAndUpdate).toHaveBeenCalledWith(
        'payment-789',
        { status: PaymentStatus.REFUNDED },
        { session: 'mock-session' }
      );
    });

    it('should successfully approve a partial refund, keep booking active, and mark payment status as PARTIALLY_REFUNDED', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'refund-123',
        bookingId: 'booking-456',
        paymentId: 'payment-789',
        amount: 200,
        status: 'requested',
        cancelTickets: false,
        save: mockRefundSave,
      };

      const mockPayment = { _id: 'payment-789', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-456', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      const mockBookingFindChain = {
        session: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockBooking),
        then: vi.fn().mockImplementation((resolve) => resolve(mockBooking)),
      };
      vi.mocked(Booking.findById).mockReturnValue(mockBookingFindChain as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(cancelBooking).mockResolvedValue({} as any);
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);

      const result = await processRefund('refund-123', 'approve', 'Partial refund notes', 'gateway-ref-123');

      expect(result?.status).toBe('completed');
      expect(mockRefundSave).toHaveBeenCalled();
      expect(cancelBooking).not.toHaveBeenCalled();
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

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));

      const result = await processRefund('refund-123', 'reject', 'Reject notes');

      expect(result?.status).toBe('failed');
      expect(mockRefundSave).toHaveBeenCalled();
      expect(cancelBooking).not.toHaveBeenCalled();
      expect(Payment.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw an error if the requested refund is not found or already processed', async () => {
      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(null));

      await expect(
        processRefund('refund-123', 'approve', 'Approve notes')
      ).rejects.toThrow('Refund request not found or has already been processed');

      expect(cancelBooking).not.toHaveBeenCalled();
      expect(Payment.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should reject processing if the payment is already fully refunded', async () => {
      const mockRefund = { _id: 'refund-123', bookingId: 'booking-456', paymentId: 'payment-789', amount: 100, status: 'requested' };
      const mockPayment = { _id: 'payment-789', amount: 500, status: PaymentStatus.REFUNDED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
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

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([{ amount: 300 }]));

      await expect(
        processRefund('refund-123', 'approve', 'Approve notes')
      ).rejects.toThrow('Refund amount exceeds remaining captured balance');

      expect(cancelBooking).not.toHaveBeenCalled();
    });

    it('should not execute post-commit side effects if refund transaction fails', async () => {
      const mockRefund = { _id: 'refund-123', bookingId: 'booking-456', paymentId: 'payment-789', amount: 100, status: 'requested' };
      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));

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

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);

      const mockBookingFindChain = {
        session: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockBooking),
        then: vi.fn().mockImplementation((resolve) => resolve(mockBooking)),
      };
      vi.mocked(Booking.findById).mockReturnValue(mockBookingFindChain as any);

      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
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

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);

      const mockBookingFindChain = {
        session: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockBooking),
        then: vi.fn().mockImplementation((resolve) => resolve(mockBooking)),
      };
      vi.mocked(Booking.findById).mockReturnValue(mockBookingFindChain as any);

      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
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

  describe('Refund Idempotency and Transaction Protection', () => {
    it('should return existing refund if idempotencyKey already matches an active refund (requested/completed)', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      const mockBooking = { _id: 'b-123', status: BookingStatus.CONFIRMED };
      const mockRefund = { _id: 'refund-123', idempotencyKey: 'key-123', status: 'requested', amount: 200 };

      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));
      // First findOne check in createRefund will find mockRefund
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(mockRefund));

      const result = await createRefund({
        bookingId: 'b-123',
        paymentId: 'p-123',
        amount: 200,
        idempotencyKey: 'key-123',
      });

      expect(result).toEqual(mockRefund);
      expect(Refund.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: 'key-123' })
      );
    });

    it('should handle database unique index duplicate key error (E11000) by returning the existing refund', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      const mockBooking = { _id: 'b-123', status: BookingStatus.CONFIRMED };
      const mockRefund = { _id: 'refund-123', idempotencyKey: 'key-123', status: 'requested', amount: 200 };

      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));
      vi.mocked(Refund.find).mockImplementation(() => createMockQuery([]));

      // First findOne returns null (race condition)
      vi.mocked(Refund.findOne)
        .mockImplementationOnce(() => createMockQuery(null)) // check inside transaction
        .mockImplementationOnce(() => createMockQuery(mockRefund)); // check inside catch block

      // Mock save to throw E11000 duplicate key error
      const mockSave = vi.fn().mockRejectedValue({
        code: 11000,
        message: 'E11000 duplicate key error collection: test.refunds index: idx_refund_idempotency_key_unique',
      });
      const MockRefundClass = Refund as any;
      const originalMockSave = MockRefundClass.prototype.save;
      MockRefundClass.prototype.save = mockSave;

      try {
        const result = await createRefund({
          bookingId: 'b-123',
          paymentId: 'p-123',
          amount: 200,
          idempotencyKey: 'key-123',
        });

        expect(result).toEqual(mockRefund);
      } finally {
        MockRefundClass.prototype.save = originalMockSave;
      }
    });
  });

  describe('Refund Integrity Guards Additional Tests', () => {
    it('should successfully approve a partial refund with cancelTickets = true, trigger booking cancellation, and mark payment status as PARTIALLY_REFUNDED', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'refund-123',
        bookingId: 'booking-456',
        paymentId: 'payment-789',
        amount: 200,
        status: 'requested',
        cancelTickets: true,
        save: mockRefundSave,
      };

      const mockPayment = { _id: 'payment-789', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-456', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      const mockBookingFindChain = {
        session: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue(mockBooking),
        then: vi.fn().mockImplementation((resolve) => resolve(mockBooking)),
      };
      vi.mocked(Booking.findById).mockReturnValue(mockBookingFindChain as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(cancelBooking).mockResolvedValue({} as any);
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);

      const result = await processRefund('refund-123', 'approve', 'Partial refund notes', 'gateway-ref-123');

      expect(result?.status).toBe('completed');
      expect(mockRefundSave).toHaveBeenCalled();
      expect(cancelBooking).toHaveBeenCalledWith('booking-456', 'Partial refund notes', 'mock-session', BookingStatus.CANCELLED, undefined);
      expect(Payment.findByIdAndUpdate).toHaveBeenCalledWith(
        'payment-789',
        { status: PaymentStatus.PARTIALLY_REFUNDED },
        { session: 'mock-session' }
      );
    });

    it('should allow multiple identical amount partial refunds with different idempotency keys', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      const mockBooking = { _id: 'b-123', status: BookingStatus.CONFIRMED };

      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null));
      vi.mocked(Refund.find).mockImplementation(() => createMockQuery([]));

      const res1 = await createRefund({
        bookingId: 'b-123',
        paymentId: 'p-123',
        amount: 100,
        idempotencyKey: 'key-1',
      });
      expect(res1.amount).toBe(100);

      const res2 = await createRefund({
        bookingId: 'b-123',
        paymentId: 'p-123',
        amount: 100,
        idempotencyKey: 'key-2',
      });
      expect(res2.amount).toBe(100);
    });

    it('should enforce atomic lease in processRefund to avoid concurrent approval race', async () => {
      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(null));

      await expect(
        processRefund('refund-123', 'approve', 'Approve notes')
      ).rejects.toThrow('Refund request not found or has already been processed');

      expect(cancelBooking).not.toHaveBeenCalled();
    });

    it('should successfully create auto-recovery refund with correct origin and reason', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', status: PaymentStatus.PAID, amount: 500 };
      const mockBooking = { _id: 'b-123', status: BookingStatus.CONFIRMED };

      vi.mocked(Payment.findById).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null));
      vi.mocked(Refund.find).mockImplementation(() => createMockQuery([]));

      const result = await createRefund({
        bookingId: 'b-123',
        paymentId: 'p-123',
        amount: 500,
        idempotencyKey: 'auto-refund-p-123',
        origin: 'auto_recovery',
        recoveryReason: 'AMOUNT_MISMATCH',
      });

      expect(result.origin).toBe('auto_recovery');
      expect(result.recoveryReason).toBe('AMOUNT_MISMATCH');
    });

    it('should execute automated Stripe refund on approve and handle gateway success', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'ref-stripe',
        bookingId: 'booking-456',
        paymentId: 'payment-stripe',
        amount: 200,
        status: 'requested',
        save: mockRefundSave,
      };

      const mockPayment = {
        _id: 'payment-stripe',
        amount: 500,
        status: PaymentStatus.PAID,
        gateway: 'stripe',
        gatewayOrderId: 'pi_stripe_123',
      };
      const mockBooking = { _id: 'booking-456', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);

      mockStripeRefundsCreate.mockResolvedValue({ id: 're_stripe_999' });

      const result = await processRefund('ref-stripe', 'approve', 'Approve stripe refund');

      expect(mockStripeRefundsCreate).toHaveBeenCalledWith(
        {
          payment_intent: 'pi_stripe_123',
          amount: 20000,
        },
        {
          idempotencyKey: 'ref-stripe',
        }
      );
      expect(result?.status).toBe('completed');
      expect(result?.gatewayRefundId).toBe('re_stripe_999');
      expect(mockRefundSave).toHaveBeenCalled();
    });

    it('should throw error and revert status if Stripe refund API call fails', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'ref-stripe-fail',
        bookingId: 'booking-456',
        paymentId: 'payment-stripe-fail',
        amount: 200,
        status: 'requested',
        save: mockRefundSave,
      };

      const mockPayment = {
        _id: 'payment-stripe-fail',
        amount: 500,
        status: PaymentStatus.PAID,
        gateway: 'stripe',
        gatewayOrderId: 'pi_stripe_fail',
      };
      const mockBooking = { _id: 'booking-456', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));

      mockStripeRefundsCreate.mockRejectedValue(new Error('Stripe API error'));

      await expect(
        processRefund('ref-stripe-fail', 'approve', 'Approve stripe refund')
      ).rejects.toThrow('Stripe refund failed: Stripe API error');

      expect(Refund.updateOne).toHaveBeenCalledWith(
        { _id: 'ref-stripe-fail', status: 'processing' },
        { $set: { status: 'requested' } }
      );
    });

    it('should execute automated Razorpay refund on approve and handle gateway success', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'ref-rzp',
        bookingId: 'booking-456',
        paymentId: 'payment-rzp',
        amount: 300,
        status: 'requested',
        save: mockRefundSave,
      };

      const mockPayment = {
        _id: 'payment-rzp',
        amount: 500,
        status: PaymentStatus.PAID,
        gateway: 'razorpay',
        gatewayPaymentId: 'pay_rzp_123',
      };
      const mockBooking = { _id: 'booking-456', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);

      vi.mocked(createRazorpayRefund).mockResolvedValue({
        id: 'rfnd_rzp_999',
      });

      const result = await processRefund('ref-rzp', 'approve', 'Approve razorpay refund');

      expect(createRazorpayRefund).toHaveBeenCalledWith({
        paymentId: 'pay_rzp_123',
        amountPaise: 30000,
        idempotencyKey: 'ref-rzp',
      });
      expect(result?.status).toBe('completed');
      expect(result?.gatewayRefundId).toBe('rfnd_rzp_999');
      expect(mockRefundSave).toHaveBeenCalled();
    });

    it('should throw error and revert status if Razorpay direct axios refund call fails', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'ref-rzp-fail',
        bookingId: 'booking-456',
        paymentId: 'payment-rzp-fail',
        amount: 300,
        status: 'requested',
        save: mockRefundSave,
      };

      const mockPayment = {
        _id: 'payment-rzp-fail',
        amount: 500,
        status: PaymentStatus.PAID,
        gateway: 'razorpay',
        gatewayPaymentId: 'pay_rzp_fail',
      };
      const mockBooking = { _id: 'booking-456', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));

      vi.mocked(createRazorpayRefund).mockRejectedValue(
        AppError.badRequest('Razorpay refund failed: Insufficient balance')
      );

      await expect(
        processRefund('ref-rzp-fail', 'approve', 'Approve razorpay refund')
      ).rejects.toThrow('Razorpay refund failed: Insufficient balance');

      expect(Refund.updateOne).toHaveBeenCalledWith(
        { _id: 'ref-rzp-fail', status: 'processing' },
        { $set: { status: 'requested' } }
      );
    });

    it('should validate manual override parameters and emit an audit log on success', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'ref-override',
        bookingId: 'booking-456',
        paymentId: 'payment-override',
        amount: 200,
        status: 'requested',
        save: mockRefundSave,
      };

      const mockPayment = {
        _id: 'payment-override',
        amount: 500,
        status: PaymentStatus.PAID,
        gateway: 'stripe',
        gatewayOrderId: 'pi_stripe_123',
      };
      const mockBooking = { _id: 'booking-456', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);

      // 1. Missing override reason
      await expect(
        processRefund('ref-override', 'approve', 'Approve notes', 'gate_123', true, '')
      ).rejects.toThrow('Manual override requires an override reason');

      // 2. Missing gateway refund ID
      await expect(
        processRefund('ref-override', 'approve', 'Approve notes', '', true, 'Customer resolved via phone')
      ).rejects.toThrow('Manual override requires a gateway refund ID');

      // 3. Successful manual override path
      const result = await processRefund('ref-override', 'approve', 'Approve notes', 'gate_123', true, 'Customer resolved via phone');

      expect(mockStripeRefundsCreate).not.toHaveBeenCalled();
      expect(result?.status).toBe('completed');
      expect(result?.gatewayRefundId).toBe('gate_123');
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'REFUND_MANUAL_OVERRIDE',
        metadata: expect.objectContaining({
          overrideReason: 'Customer resolved via phone',
          gatewayRefundId: 'gate_123',
        })
      }));
    });

    it('should allow auto-recovery refunds on FAILED payments and FAILED/EXPIRED bookings', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'ref-auto-rec',
        bookingId: 'booking-failed',
        paymentId: 'payment-failed',
        amount: 500,
        status: 'requested',
        origin: 'auto_recovery',
        recoveryReason: 'AMOUNT_MISMATCH',
        save: mockRefundSave,
      };

      const mockPayment = {
        _id: 'payment-failed',
        amount: 500,
        status: PaymentStatus.FAILED,
        gateway: 'stripe',
        gatewayOrderId: 'pi_failed_123',
      };
      const mockBooking = { _id: 'booking-failed', status: BookingStatus.FAILED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);

      mockStripeRefundsCreate.mockResolvedValue({ id: 're_stripe_auto' });

      const result = await processRefund('ref-auto-rec', 'approve', 'Approve auto recovery refund');

      expect(result?.status).toBe('completed');
      expect(result?.gatewayRefundId).toBe('re_stripe_auto');
      expect(mockRefundSave).toHaveBeenCalled();
    });

    it('should prevent different refunds from overdrawing a payment concurrently (Test 1)', async () => {
      const mockRefundA = {
        _id: 'ref-A',
        bookingId: 'booking-123',
        paymentId: 'payment-123',
        amount: 60,
        status: 'requested',
        save: vi.fn(),
      };
      const mockRefundB = {
        _id: 'ref-B',
        bookingId: 'booking-123',
        paymentId: 'payment-123',
        amount: 60,
        status: 'requested',
        save: vi.fn(),
      };

      const mockPayment = { _id: 'payment-123', amount: 100, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-123', status: BookingStatus.CONFIRMED };

      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);

      vi.mocked(Refund.findOneAndUpdate)
        .mockReturnValueOnce(createMockQuery(mockRefundA))
        .mockReturnValueOnce(createMockQuery(mockRefundB));

      vi.mocked(Refund.find).mockReturnValueOnce(createMockQuery([]));

      const resA = await processRefund('ref-A', 'approve', 'Approve A');
      expect(resA?.status).toBe('completed');

      vi.mocked(Refund.find).mockReturnValueOnce(createMockQuery([resA]));

      await expect(
        processRefund('ref-B', 'approve', 'Approve B')
      ).rejects.toThrow('Refund amount exceeds remaining captured balance');
    });

    it('should ensure same refund cannot be approved twice (Test 2)', async () => {
      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(null));

      await expect(
        processRefund('refund-123', 'approve', 'Approve again')
      ).rejects.toThrow('Refund request not found or has already been processed');
    });

    it('should revert status from processing to requested conditionally on gateway failure (Test 3)', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'ref-fail',
        bookingId: 'booking-123',
        paymentId: 'payment-123',
        amount: 50,
        status: 'requested',
        save: mockRefundSave,
      };

      const mockPayment = { _id: 'payment-123', amount: 100, status: PaymentStatus.PAID, gateway: 'stripe', gatewayOrderId: 'pi_123' };
      const mockBooking = { _id: 'booking-123', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));

      mockStripeRefundsCreate.mockRejectedValue(new Error('Gateway down'));

      await expect(
        processRefund('ref-fail', 'approve', 'Approve')
      ).rejects.toThrow('Stripe refund failed: Gateway down');

      expect(Refund.updateOne).toHaveBeenCalledWith(
        { _id: 'ref-fail', status: 'processing' },
        { $set: { status: 'requested' } }
      );
    });

    it('should validate partial refund limits (Test 4)', async () => {
      const mockRefund = {
        _id: 'ref-partial',
        bookingId: 'booking-123',
        paymentId: 'payment-123',
        amount: 60,
        status: 'requested',
        save: vi.fn(),
      };

      const mockPayment = { _id: 'payment-123', amount: 100, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-123', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);

      vi.mocked(Refund.find).mockReturnValue(createMockQuery([{ amount: 50, status: 'completed' }]));

      await expect(
        processRefund('ref-partial', 'approve', 'Approve')
      ).rejects.toThrow('Refund amount exceeds remaining captured balance');
    });

    it('should enforce cumulative reservation capacity and reject exceeding partial refunds (Test 5)', async () => {
      const mockPayment = { _id: 'payment-123', amount: 100, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-123', status: BookingStatus.CONFIRMED };

      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);

      const mockRefundA = { _id: 'ref-A', bookingId: 'booking-123', paymentId: 'payment-123', amount: 40, status: 'requested', save: vi.fn() };
      const mockRefundB = { _id: 'ref-B', bookingId: 'booking-123', paymentId: 'payment-123', amount: 40, status: 'requested', save: vi.fn() };
      const mockRefundC = { _id: 'ref-C', bookingId: 'booking-123', paymentId: 'payment-123', amount: 40, status: 'requested', save: vi.fn() };

      vi.mocked(Refund.findOneAndUpdate)
        .mockReturnValueOnce(createMockQuery(mockRefundA))
        .mockReturnValueOnce(createMockQuery(mockRefundB))
        .mockReturnValueOnce(createMockQuery(mockRefundC));

      vi.mocked(Refund.find).mockReturnValueOnce(createMockQuery([]));
      const resA = await processRefund('ref-A', 'approve', 'Approve A');
      expect(resA?.status).toBe('completed');

      vi.mocked(Refund.find).mockReturnValueOnce(createMockQuery([resA]));
      const resB = await processRefund('ref-B', 'approve', 'Approve B');
      expect(resB?.status).toBe('completed');

      vi.mocked(Refund.find).mockReturnValueOnce(createMockQuery([resA, resB]));
      await expect(
        processRefund('ref-C', 'approve', 'Approve C')
      ).rejects.toThrow('Refund amount exceeds remaining captured balance');
    });

    it('RFND-B-F01 - refreshes booking status inside Phase 3 transaction to prevent stale status crash', async () => {
      const mockRefund = {
        _id: 'ref-stale-test',
        bookingId: 'booking-123',
        paymentId: 'payment-123',
        amount: 100,
        status: 'requested',
        save: vi.fn(),
      };

      const mockPayment = { _id: 'payment-123', amount: 100, status: PaymentStatus.PAID, gateway: 'stripe', gatewayOrderId: 'pi_123' };
      // In-memory/Phase 1 booking is CONFIRMED
      const mockBookingPhase1 = { _id: 'booking-123', status: BookingStatus.CONFIRMED };
      // Database has booking already REFUNDED (from webhook reconciliation)
      const mockBookingInDB = { _id: 'booking-123', status: BookingStatus.REFUNDED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);

      // First findById resolves in Phase 1 (CONFIRMED)
      // Second findById resolves inside transaction (REFUNDED)
      vi.mocked(Booking.findById)
        .mockReturnValueOnce({ session: vi.fn().mockResolvedValue(mockBookingPhase1) } as any) // Phase 1
        .mockReturnValueOnce({ session: vi.fn().mockResolvedValue(mockBookingInDB) } as any); // Phase 3

      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      mockStripeRefundsCreate.mockResolvedValue({ id: 're_123' });

      // Run approval
      const result = await processRefund('ref-stale-test', 'approve', 'Approve stale');

      // Assertions
      expect(result?.status).toBe('completed');
      // booking.service.cancelBooking should NOT have been called because status was already REFUNDED in DB
      expect(cancelBooking).not.toHaveBeenCalled();
    });

    it('persists gatewayRefundId immediately after successful gateway response to minimize crash window', async () => {
      const mockRefund = {
        _id: 'ref-write-through',
        bookingId: 'booking-123',
        paymentId: 'payment-123',
        amount: 50,
        status: 'requested',
        save: vi.fn(),
      };

      const mockPayment = { _id: 'payment-123', amount: 100, status: PaymentStatus.PAID, gateway: 'stripe', gatewayOrderId: 'pi_123' };
      const mockBooking = { _id: 'booking-123', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      mockStripeRefundsCreate.mockResolvedValue({ id: 're_123' });

      // Run approval
      await processRefund('ref-write-through', 'approve', 'Approve write-through');

      // Assertions
      expect(Refund.updateOne).toHaveBeenCalledWith(
        { _id: 'ref-write-through' },
        { $set: { gatewayRefundId: 're_123' } }
      );
    });

    it('RFND-B-F03 - does not trigger email notification if reconciledAt is set on the Refund record', async () => {
      const mockRefund = {
        _id: 'ref-email-test',
        bookingId: 'booking-123',
        paymentId: 'payment-123',
        amount: 100,
        status: 'requested',
        save: vi.fn(),
      };

      const mockPayment = { _id: 'payment-123', amount: 100, status: PaymentStatus.PAID, gateway: 'stripe', gatewayOrderId: 'pi_123' };
      const mockBooking = { _id: 'booking-123', status: BookingStatus.CONFIRMED, guestEmail: 'customer@example.com' };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      mockStripeRefundsCreate.mockResolvedValue({ id: 're_123' });

      // Inside transaction, the Refund is updated and returned as completed, BUT let's simulate reconciledAt has been set
      // We spy on the returned 'updated' object from runInTransaction. To do this, let's mock Refund save to return the updated record with reconciledAt.
      vi.mocked(runInTransaction).mockImplementation(async (callback: any) => {
        const res = await callback('mock-session');
        if (res && res.updated) {
          res.updated.reconciledAt = new Date(); // simulate webhook completed it
        }
        return res;
      });

      // Run approval
      await processRefund('ref-email-test', 'approve', 'Approve email check');

      // Email notifications should NOT have been enqueued
      expect(QueueService.enqueue).not.toHaveBeenCalled();
      expect(createNotificationSafe).not.toHaveBeenCalled();
    });
  });

  describe('PRICING-003 Scan Protection', () => {
    const scannedTicket = { _id: 'ticket-001', ticketId: 'TKT-001', scannedAt: new Date() };

    const mockScannedQuery = () => {
      const q = Promise.resolve([scannedTicket]);
      (q as any).session = () => q;
      return q as any;
    };

    it('should block refund if any ticket is scanned and manualOverride is false', async () => {
      const mockRefund = {
        _id: 'refund-scan-001', bookingId: 'booking-scan-001', paymentId: 'payment-scan-001',
        amount: 300, status: 'requested', origin: 'manual', save: vi.fn(),
      };
      const mockPayment = { _id: 'payment-scan-001', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-scan-001', status: BookingStatus.CONFIRMED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Ticket.find).mockReturnValueOnce(mockScannedQuery());

      await expect(
        processRefund('refund-scan-001', 'approve', 'Admin notes', 'gate-ref-123')
      ).rejects.toThrow('Refund blocked: Booking contains checked-in tickets');
    });

    it('should block refund with 403 if actor is not super_admin and manualOverride is true', async () => {
      const mockRefund = {
        _id: 'refund-scan-002', bookingId: 'booking-scan-002', paymentId: 'payment-scan-002',
        amount: 300, status: 'requested', origin: 'manual', save: vi.fn(),
      };
      const mockPayment = { _id: 'payment-scan-002', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-scan-002', status: BookingStatus.CONFIRMED };
      const adminActor = { id: 'admin-user-001', role: 'admin' };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Ticket.find).mockReturnValueOnce(mockScannedQuery());

      await expect(
        processRefund('refund-scan-002', 'approve', 'Admin notes', 'gate-ref-456', true, 'Override reason here', adminActor)
      ).rejects.toThrow('Only super_admin can override refunds for bookings with checked-in tickets');
    });

    it('should allow refund when actor is super_admin and manualOverride is true, and log real actor id', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'refund-scan-003', bookingId: 'booking-scan-003', paymentId: 'payment-scan-003',
        amount: 300, status: 'requested', origin: 'manual', save: mockRefundSave,
      };
      const mockPayment = { _id: 'payment-scan-003', amount: 500, status: PaymentStatus.PAID };
      const mockBooking = { _id: 'booking-scan-003', status: BookingStatus.CONFIRMED };
      const superAdminActor = { id: 'super-admin-001', role: 'super_admin' };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);
      vi.mocked(Ticket.find).mockReturnValueOnce(mockScannedQuery());

      const result = await processRefund(
        'refund-scan-003', 'approve', 'Admin notes', 'gate-ref-789', true, 'Override reason here', superAdminActor
      );

      expect(result?.status).toBe('completed');
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'REFUND_MANUAL_OVERRIDE',
        actor: expect.objectContaining({ id: 'super-admin-001' }),
      }));
    });

    it('should allow auto_recovery refund even if booking has scanned tickets (scan check is exempt)', async () => {
      const mockRefundSave = vi.fn();
      const mockRefund = {
        _id: 'refund-auto-scan', bookingId: 'booking-auto-scan', paymentId: 'payment-auto-scan',
        amount: 500, status: 'requested', origin: 'auto_recovery', recoveryReason: 'AMOUNT_MISMATCH',
        save: mockRefundSave,
      };
      const mockPayment = {
        _id: 'payment-auto-scan', amount: 500, status: PaymentStatus.FAILED,
        gateway: 'stripe', gatewayOrderId: 'pi_auto_scan',
      };
      const mockBooking = { _id: 'booking-auto-scan', status: BookingStatus.FAILED };

      vi.mocked(Refund.findOneAndUpdate).mockReturnValue(createMockQuery(mockRefund));
      vi.mocked(Payment.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockPayment) } as any);
      vi.mocked(Booking.findById).mockReturnValue({ session: vi.fn().mockResolvedValue(mockBooking) } as any);
      vi.mocked(Refund.find).mockReturnValue(createMockQuery([]));
      vi.mocked(Payment.findByIdAndUpdate).mockResolvedValue({} as any);
      // Even with scanned tickets, auto_recovery must NOT be blocked
      vi.mocked(Ticket.find).mockReturnValue(mockScannedQuery());

      mockStripeRefundsCreate.mockResolvedValue({ id: 're_auto_scan' });

      const result = await processRefund('refund-auto-scan', 'approve', 'Auto recovery notes');

      expect(result?.status).toBe('completed');
      expect(result?.gatewayRefundId).toBe('re_auto_scan');
    });
  });
});
