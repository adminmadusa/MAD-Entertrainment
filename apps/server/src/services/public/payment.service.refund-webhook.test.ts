import * as Sentry from '@sentry/node';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, PaymentStatus } from '@mad/shared';

import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { BookingLifecycleService } from './booking/booking-lifecycle.service';

const { cancelBooking, executeCancelBookingSideEffects } = BookingLifecycleService;
import { PaymentService } from './payment.service';

// Mock Session for MongoDB Transactions
const { mockSession } = vi.hoisted(() => {
  const session = {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    abortTransaction: vi.fn(),
    withTransaction: vi.fn().mockImplementation(async (callback) => {
      try {
        return await callback();
      } catch (err) {
        throw err;
      }
    }),
    endSession: vi.fn().mockResolvedValue(undefined),
  };
  return { mockSession: session };
});

vi.mock('mongoose', async (importOriginal) => {
  const original = await importOriginal<typeof import('mongoose')>();
  return {
    ...original,
    default: {
      ...original.default,
      startSession: vi.fn().mockResolvedValue(mockSession),
    },
    startSession: vi.fn().mockResolvedValue(mockSession),
  };
});

vi.mock('@sentry/node', () => ({
  captureMessage: vi.fn(),
}));

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    RAZORPAY_KEY_ID: 'test_rzp_key',
    RAZORPAY_KEY_SECRET: 'test_rzp_secret',
    STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
    STRIPE_SECRET_KEY: 'test_stripe_secret',
    MOCK_PAYMENTS: false,
  })),
}));

vi.mock('../../config/stripe', () => ({
  getStripe: vi.fn(),
  isStripeEnabled: vi.fn(() => true),
}));

vi.mock('../../config/razorpay', () => ({
  getRazorpay: vi.fn(),
  isRazorpayEnabled: vi.fn(() => true),
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
  },
}));

vi.mock('../../models/payment.schema', () => ({
  Payment: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/refund.schema', () => ({
  Refund: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../models/notification.schema', () => ({
  Notification: {
    findOne: vi.fn(),
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

vi.mock('./booking/booking-lifecycle.service', () => {
  const cancelBooking = vi.fn().mockResolvedValue({
    booking: { _id: 'b-123', status: 'refunded' },
    postCommitPayload: 'mock-payload',
  });
  const executeCancelBookingSideEffects = vi.fn();
  return {
    BookingLifecycleService: {
      cancelBooking,
      executeCancelBookingSideEffects,
    }
  };
});

vi.mock('../queue.service', () => ({
  QueueService: {
    enqueue: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../notification.service', () => ({
  createNotificationSafe: vi.fn().mockResolvedValue(undefined),
}));

describe('PaymentService — Webhook Refund Reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reconcileStripeRefundWebhook', () => {
    it('successfully processes processing -> completed for charge.refunded', async () => {
      const mockRefund = {
        _id: 'ref-123',
        bookingId: 'b-123',
        paymentId: 'pay-123',
        amount: 100,
        status: 'processing',
      };
      const mockPayment = {
        _id: 'pay-123',
        amount: 100,
        bookingId: 'b-123',
        status: PaymentStatus.PAID,
      };
      const mockBooking = {
        _id: 'b-123',
        status: BookingStatus.CONFIRMED,
      };

      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(mockRefund));
      vi.mocked(Payment.findOneAndUpdate).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));
      vi.mocked(Refund.findOneAndUpdate).mockImplementation(() => createMockQuery({
        ...mockRefund,
        status: 'completed',
        amount: 100,
      }));
      vi.mocked(Refund.find).mockImplementation(() => createMockQuery([])); // No other completed refunds
      vi.mocked(Payment.findByIdAndUpdate).mockImplementation(() => createMockQuery({}));

      const chargePayload = {
        id: 'ch_123',
        refunds: {
          data: [{ id: 're_123', amount: 10000 }],
        },
      };

      const result = await PaymentService.reconcileStripeRefundWebhook(
        chargePayload,
        'evt_123',
        'charge.refunded'
      );

      expect(result.status).toBe('completed');
      expect(result.refundId).toBe('ref-123');
      expect(Payment.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'pay-123' },
        { $set: { updatedAt: expect.any(Date) } },
        { session: mockSession, new: true }
      );
      expect(Refund.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'ref-123', status: { $in: ['processing', 'requested'] } },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'completed',
            gatewayRefundStatus: 'succeeded',
            webhookEventId: 'evt_123',
          }),
        }),
        { session: mockSession, new: true }
      );
      expect(cancelBooking).toHaveBeenCalledWith(
        'b-123',
        'Stripe Webhook Reconciled',
        mockSession,
        BookingStatus.REFUNDED
      );
      expect(executeCancelBookingSideEffects).toHaveBeenCalledWith('mock-payload');
    });

    it('returns skipped on refund.updated when status is pending', async () => {
      const refundPayload = {
        id: 're_123',
        charge: 'ch_123',
        status: 'pending',
        amount: 10000,
      };

      const result = await PaymentService.reconcileStripeRefundWebhook(
        refundPayload,
        'evt_123',
        'refund.updated'
      );

      expect(result.status).toBe('skipped');
      expect(Refund.findOne).not.toHaveBeenCalled();
    });

    it('processes completed on refund.updated when status is succeeded', async () => {
      const mockRefund = {
        _id: 'ref-123',
        bookingId: 'b-123',
        paymentId: 'pay-123',
        amount: 100,
        status: 'processing',
      };
      const mockPayment = {
        _id: 'pay-123',
        amount: 100,
        bookingId: 'b-123',
        status: PaymentStatus.PAID,
      };
      const mockBooking = {
        _id: 'b-123',
        status: BookingStatus.CONFIRMED,
      };

      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(mockRefund));
      vi.mocked(Payment.findOneAndUpdate).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));
      vi.mocked(Refund.findOneAndUpdate).mockImplementation(() => createMockQuery({
        ...mockRefund,
        status: 'completed',
        amount: 100,
      }));
      vi.mocked(Refund.find).mockImplementation(() => createMockQuery([]));

      const refundPayload = {
        id: 're_123',
        charge: 'ch_123',
        status: 'succeeded',
        amount: 10000,
      };

      const result = await PaymentService.reconcileStripeRefundWebhook(
        refundPayload,
        'evt_123',
        'refund.updated'
      );

      expect(result.status).toBe('completed');
      expect(Refund.findOne).toHaveBeenCalledWith({ gatewayRefundId: 're_123' });
    });

    it('processes failed on refund.failed (transitions processing -> failed)', async () => {
      const mockRefund = {
        _id: 'ref-123',
        bookingId: 'b-123',
        paymentId: 'pay-123',
        amount: 100,
        status: 'processing',
      };
      const mockPayment = {
        _id: 'pay-123',
        amount: 100,
        bookingId: 'b-123',
        status: PaymentStatus.PAID,
      };
      const mockBooking = {
        _id: 'b-123',
        status: BookingStatus.CONFIRMED,
      };

      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(mockRefund));
      vi.mocked(Payment.findOneAndUpdate).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));
      vi.mocked(Refund.findOneAndUpdate).mockImplementation(() => createMockQuery({
        ...mockRefund,
        status: 'failed',
      }));

      const refundPayload = {
        id: 're_123',
        charge: 'ch_123',
        status: 'failed',
        amount: 10000,
      };

      const result = await PaymentService.reconcileStripeRefundWebhook(
        refundPayload,
        'evt_123',
        'refund.failed'
      );

      expect(result.status).toBe('failed');
      expect(Refund.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'ref-123', status: { $in: ['processing', 'requested'] } },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'failed',
            gatewayRefundStatus: 'failed',
          }),
        }),
        expect.any(Object)
      );
    });

    it('alerts Sentry when refund.failed is delivered on an already completed refund', async () => {
      const mockRefund = {
        _id: 'ref-123',
        bookingId: 'b-123',
        paymentId: 'pay-123',
        amount: 100,
        status: 'completed',
      };

      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(mockRefund));

      const refundPayload = {
        id: 're_123',
        charge: 'ch_123',
        status: 'failed',
        amount: 10000,
      };

      const result = await PaymentService.reconcileStripeRefundWebhook(
        refundPayload,
        'evt_123',
        'refund.failed'
      );

      expect(result.status).toBe('anomaly');
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL ANOMALY: Webhook reports Stripe refund re_123 failed, but DB status is completed!'),
        expect.objectContaining({ level: 'error' })
      );
      expect(Refund.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('recovers crash window using fallback lookup (amount matching)', async () => {
      const mockRefund = {
        _id: 'ref-123',
        bookingId: 'b-123',
        paymentId: 'pay-123',
        amount: 100,
        status: 'processing',
      };
      const mockPayment = {
        _id: 'pay-123',
        amount: 100,
        bookingId: 'b-123',
        status: PaymentStatus.PAID,
      };
      const mockBooking = {
        _id: 'b-123',
        status: BookingStatus.CONFIRMED,
      };

      // Primary lookup fails
      vi.mocked(Refund.findOne)
        .mockImplementationOnce(() => createMockQuery(null)) // Primary
        .mockImplementationOnce(() => createMockQuery(mockRefund)); // Fallback

      vi.mocked(Payment.findOne).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Payment.findOneAndUpdate).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));
      vi.mocked(Refund.findOneAndUpdate).mockImplementation(() => createMockQuery({
        ...mockRefund,
        status: 'completed',
        amount: 100,
      }));
      vi.mocked(Refund.find).mockImplementation(() => createMockQuery([]));

      const chargePayload = {
        id: 'ch_123',
        refunds: {
          data: [{ id: 're_123', amount: 10000 }],
        },
      };

      const result = await PaymentService.reconcileStripeRefundWebhook(
        chargePayload,
        'evt_123',
        'charge.refunded'
      );

      expect(result.status).toBe('completed');
      expect(Refund.findOne).toHaveBeenCalledTimes(2);
      expect(Refund.findOne).toHaveBeenLastCalledWith({
        paymentId: 'pay-123',
        status: { $in: ['processing', 'requested'] },
        amount: 100,
      });
    });

    it('auto-creates a new completed Refund for gateway-initiated full refunds', async () => {
      const mockPayment = {
        _id: 'pay-123',
        amount: 100,
        bookingId: 'b-123',
        currency: 'INR',
        status: PaymentStatus.PAID,
      };
      const mockBooking = {
        _id: 'b-123',
        status: BookingStatus.CONFIRMED,
      };

      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null)); // No refund exists
      vi.mocked(Payment.findOne).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Payment.findOneAndUpdate).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Refund.create).mockResolvedValue([
        {
          _id: 'ref-created',
          amount: 100,
        },
      ] as any);
      vi.mocked(Refund.find).mockImplementation(() => createMockQuery([]));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));

      const chargePayload = {
        id: 'ch_123',
        refunds: {
          data: [{ id: 're_123', amount: 10000 }],
        },
      };

      const result = await PaymentService.reconcileStripeRefundWebhook(
        chargePayload,
        'evt_123',
        'charge.refunded'
      );

      expect(result.status).toBe('completed');
      expect(Refund.create).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            paymentId: 'pay-123',
            amount: 100,
            status: 'completed',
            gatewayRefundId: 're_123',
            cancelTickets: true,
          }),
        ],
        { session: mockSession }
      );
      expect(cancelBooking).toHaveBeenCalledWith(
        'b-123',
        'Stripe Webhook Full Auto-Refund',
        mockSession,
        BookingStatus.REFUNDED
      );
    });

    it('auto-creates a new completed Refund for gateway-initiated partial refunds (booking active)', async () => {
      const mockPayment = {
        _id: 'pay-123',
        amount: 100,
        bookingId: 'b-123',
        currency: 'INR',
        status: PaymentStatus.PAID,
      };
      const mockBooking = {
        _id: 'b-123',
        status: BookingStatus.CONFIRMED,
      };

      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null));
      vi.mocked(Payment.findOne).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Payment.findOneAndUpdate).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Refund.create).mockResolvedValue([
        {
          _id: 'ref-created',
          amount: 50,
        },
      ] as any);
      vi.mocked(Refund.find).mockImplementation(() => createMockQuery([]));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));

      const chargePayload = {
        id: 'ch_123',
        refunds: {
          data: [{ id: 're_123', amount: 5000 }], // partial ₹50
        },
      };

      const result = await PaymentService.reconcileStripeRefundWebhook(
        chargePayload,
        'evt_123',
        'charge.refunded'
      );

      expect(result.status).toBe('completed');
      expect(Refund.create).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            paymentId: 'pay-123',
            amount: 50,
            status: 'completed',
            gatewayRefundId: 're_123',
            cancelTickets: false, // Partial refund, do not auto-cancel
          }),
        ],
        { session: mockSession }
      );
      expect(cancelBooking).not.toHaveBeenCalled(); // booking remains CONFIRMED
    });
  });

  describe('reconcileRazorpayRefundWebhook', () => {
    it('successfully processes processing -> completed for refund.processed', async () => {
      const mockRefund = {
        _id: 'ref-123',
        bookingId: 'b-123',
        paymentId: 'pay-123',
        amount: 100,
        status: 'processing',
      };
      const mockPayment = {
        _id: 'pay-123',
        amount: 100,
        bookingId: 'b-123',
        status: PaymentStatus.PAID,
      };
      const mockBooking = {
        _id: 'b-123',
        status: BookingStatus.CONFIRMED,
      };

      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(mockRefund));
      vi.mocked(Payment.findOneAndUpdate).mockImplementation(() => createMockQuery(mockPayment));
      vi.mocked(Booking.findById).mockImplementation(() => createMockQuery(mockBooking));
      vi.mocked(Refund.findOneAndUpdate).mockImplementation(() => createMockQuery({
        ...mockRefund,
        status: 'completed',
        amount: 100,
      }));
      vi.mocked(Refund.find).mockImplementation(() => createMockQuery([]));
      vi.mocked(Payment.findByIdAndUpdate).mockImplementation(() => createMockQuery({}));

      const refundEntity = {
        id: 'rfnd_123',
        payment_id: 'pay_123',
        amount: 10000,
      };

      const result = await PaymentService.reconcileRazorpayRefundWebhook(
        refundEntity,
        'refund.processed',
        'evt_123'
      );

      expect(result.status).toBe('completed');
      expect(result.refundId).toBe('ref-123');
      expect(Refund.findOne).toHaveBeenCalledWith({ gatewayRefundId: 'rfnd_123' });
    });
  });
});
