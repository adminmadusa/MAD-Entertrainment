import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, PaymentStatus } from '@mad/shared';

import { getEnv } from '../../config/env';
import { getStripe } from '../../config/stripe';
import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { Reservation } from '../../models/reservation.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { UserModel } from '../../models/user.schema';
import { QueueService } from '../queue.service';
import { ReservationService } from '../reservation.service';
import { PaymentService } from './payment.service';

const { mockSession } = vi.hoisted(() => {
  const session = {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    abortTransaction: vi.fn(),
    withTransaction: vi.fn().mockImplementation(async (callback) => {
      try {
        await callback();
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

const createMockQuery = (val: any) => {
  const query = Promise.resolve(val);
  (query as any).session = vi.fn().mockReturnValue(query);
  (query as any).lean = vi.fn().mockReturnValue(query);
  (query as any).sort = vi.fn().mockReturnValue(query);
  return query as any;
};

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    RAZORPAY_KEY_ID: 'test_rzp_key',
    RAZORPAY_KEY_SECRET: 'test_rzp_secret',
    STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
    STRIPE_SECRET_KEY: 'test_stripe_secret',
    ENABLE_ASYNC_CHECKOUT: true,
    MOCK_PAYMENTS: false,
  })),
}));

vi.mock('../../config/razorpay', () => ({
  isRazorpayEnabled: vi.fn(() => true),
  getRazorpay: vi.fn(),
}));

vi.mock('../../config/stripe', () => ({
  isStripeEnabled: vi.fn(() => true),
  getStripe: vi.fn(),
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../../models/payment.schema', () => ({
  Payment: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn().mockImplementation(async (query, update) => {
      const payment = await Payment.findOne(query);
      if (payment) {
        if (update && update.$set) {
          Object.assign(payment, update.$set);
        }
        return payment;
      }
      return null;
    }),
  },
}));

vi.mock('../../models/refund.schema', () => ({
  Refund: {
    create: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/user.schema', () => ({
  UserModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/coupon.schema', () => ({
  Coupon: {
    updateOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../../models/reservation.schema', () => ({
  Reservation: {
    aggregate: vi.fn(),
  },
}));

vi.mock('../../models/seat-layout.schema', () => ({
  SeatLayout: {
    updateOne: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../../config/socket', () => ({
  emitToAdmin: vi.fn(),
  emitToBooking: vi.fn(),
  emitToEvent: vi.fn(),
}));

vi.mock('../queue.service', () => ({
  QueueService: {
    enqueue: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../reservation.service', () => ({
  ReservationService: {
    transitionForBooking: vi.fn().mockResolvedValue([]),
    confirmCapacity: vi.fn().mockResolvedValue([]),
    releaseCapacityForTerminalReservations: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../notification.service', () => ({
  createNotificationSafe: vi.fn().mockResolvedValue({ _id: 'notification_123' } as any),
}));

describe('Payment Service — Webhook Processing & Intent Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(Booking.findById).mockReset();
    vi.mocked(Booking.findOne).mockReset();
    vi.mocked(Booking.findOneAndUpdate).mockReset();
    vi.mocked(Event.findById).mockReset();
    vi.mocked(Event.findOneAndUpdate).mockReset();
    vi.mocked(Reservation.aggregate).mockReset();
    vi.mocked(SeatLayout.updateOne).mockReset();
    vi.mocked(SeatLayout.findOne).mockReset();
    vi.mocked(Refund.create).mockReset();
    vi.mocked(Refund.findOne).mockReset();
    vi.mocked(ReservationService.transitionForBooking).mockReset();
    vi.mocked(QueueService.enqueue).mockReset();
    vi.mocked(Payment.findOneAndUpdate).mockReset();
    vi.mocked(UserModel.findOne).mockReset();

    vi.mocked(Reservation.aggregate).mockImplementation(() => createMockQuery([{ total: 0 }]) as any);
    vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any);
    vi.mocked(SeatLayout.findOne).mockImplementation(() => createMockQuery(null) as any);
    vi.mocked(UserModel.findOne).mockImplementation(() => createMockQuery(null) as any);
    vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([]);
    vi.mocked(QueueService.enqueue).mockResolvedValue(undefined as any);
    vi.mocked(Payment.findOneAndUpdate).mockImplementation((query: any, update: any) => {
      return Promise.resolve({
        _id: query._id || 'p-123',
        status: PaymentStatus.PAID,
        gatewayPaymentId: update?.$set?.gatewayPaymentId || 'pay_123',
        gatewaySignature: update?.$set?.gatewaySignature,
        paidAt: update?.$set?.paidAt || new Date(),
        save: vi.fn(),
      } as any);
    });

    vi.mocked(getEnv).mockReturnValue({
      RAZORPAY_KEY_ID: 'test_rzp_key',
      RAZORPAY_KEY_SECRET: 'test_rzp_secret',
      STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
      STRIPE_SECRET_KEY: 'test_stripe_secret',
      ENABLE_ASYNC_CHECKOUT: true,
      MOCK_PAYMENTS: false,
    } as any);

    vi.mocked(Event.findById).mockResolvedValue({
      _id: 'e-123',
      title: 'MAD Event',
      status: 'published',
      isDeleted: false,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      soldCount: 0,
      reservedCount: 0,
      totalCapacity: 100,
      bookingMode: 'general_admission',
      ticketTiers: [
        { tier: 'general', name: 'General Admission', price: 100, totalCapacity: 100, soldCount: 0 }
      ]
    } as any);

    vi.mocked(Reservation.aggregate).mockImplementation(() => createMockQuery([{ total: 0 }]) as any);
    vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);
  });

  describe('confirmFromWebhook and recovery', () => {
    it('should skip confirmation if payment is already paid (idempotency check)', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PAID, save: vi.fn() };
      const mockBooking = { _id: 'b-123', eventId: 'e-123', status: BookingStatus.CONFIRMED };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');
      expect(result.status).toBe('skipped');
      expect(result.bookingId).toBe('b-123');
    });

    it('should confirm booking successfully if booking status is EXPIRED (late webhook recovery)', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PENDING, save: vi.fn() };
      const mockBooking = { _id: 'b-123', eventId: 'e-123', status: BookingStatus.EXPIRED, tickets: [], save: vi.fn() };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');
      expect(result.status).toBe('confirmed');
      expect(mockPayment.status).toBe(PaymentStatus.PAID);
      expect(vi.mocked(Booking.findOneAndUpdate)).toHaveBeenCalledWith(
        expect.objectContaining({ status: expect.objectContaining({ $in: [BookingStatus.AWAITING_PAYMENT, BookingStatus.EXPIRED, BookingStatus.EXPIRING] }) }),
        expect.any(Object),
        expect.objectContaining({ new: false })
      );
    });

    it('should confirm booking successfully if booking status is EXPIRING (concurrent webhook recovery)', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PENDING, save: vi.fn() };
      const mockBooking = { _id: 'b-123', eventId: 'e-123', status: BookingStatus.EXPIRING, tickets: [], save: vi.fn() };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');
      expect(result.status).toBe('confirmed');
      expect(mockPayment.status).toBe(PaymentStatus.PAID);
      expect(vi.mocked(Booking.findOneAndUpdate)).toHaveBeenCalledWith(
        expect.objectContaining({ status: expect.objectContaining({ $in: [BookingStatus.AWAITING_PAYMENT, BookingStatus.EXPIRED, BookingStatus.EXPIRING] }) }),
        expect.any(Object),
        expect.objectContaining({ new: false })
      );
    });

    it('should reject late recovery if event capacity is exhausted', async () => {
      const refundSpy = vi.spyOn(PaymentService as any, 'triggerRefundRequest').mockResolvedValue(undefined);
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PENDING, failureReason: undefined, save: vi.fn() };
      const mockBooking = {
        _id: 'b-123',
        eventId: 'e-123',
        status: BookingStatus.EXPIRED,
        tickets: [{ tier: 'general', quantity: 2, subtotal: 200, pricePerTicket: 100, tierName: 'General' }],
        totalTickets: 2,
        save: vi.fn(),
      };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

      vi.mocked(Event.findById).mockResolvedValue({
        _id: 'e-123',
        status: 'published',
        soldCount: 99,
        reservedCount: 0,
        totalCapacity: 100,
        ticketTiers: [{ tier: 'general', soldCount: 99, totalCapacity: 100, name: 'General' }],
      } as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');

      expect(result.status).toBe('skipped');
      expect(mockPayment.failureReason).toBe('LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED');
      expect(mockPayment.save).toHaveBeenCalled();
      expect(vi.mocked(Booking.findOneAndUpdate)).not.toHaveBeenCalled();
      expect(refundSpy).toHaveBeenCalledWith(
        mockBooking,
        mockPayment,
        'LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED',
        expect.any(Object),
        'auto_recovery',
        'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
      );
      refundSpy.mockRestore();
    });

    it('should reject late recovery if seats are already booked', async () => {
      const refundSpy = vi.spyOn(PaymentService as any, 'triggerRefundRequest').mockResolvedValue(undefined);
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PENDING, failureReason: undefined, save: vi.fn() };
      const mockBooking = {
        _id: 'b-123',
        eventId: 'e-123',
        status: BookingStatus.EXPIRED,
        tickets: [{ tier: 'vip', quantity: 1, subtotal: 500, pricePerTicket: 500, tierName: 'VIP', seats: [{ seatId: 'seat-101', row: 'A', number: 1 }] }],
        totalTickets: 1,
        save: vi.fn(),
      };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

      vi.mocked(Event.findById).mockResolvedValue({
        _id: 'e-123',
        status: 'published',
        soldCount: 0,
        reservedCount: 0,
        totalCapacity: 100,
        bookingMode: 'seat_based',
        ticketTiers: [{ tier: 'vip', soldCount: 0, totalCapacity: 10, name: 'VIP' }],
      } as any);

      vi.mocked(SeatLayout.findOne).mockImplementation(() => createMockQuery({
        eventId: 'e-123',
        seats: [{ seatId: 'seat-101', status: 'booked' }]
      }) as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');

      expect(result.status).toBe('skipped');
      expect(mockPayment.failureReason).toBe('LATE_PAYMENT_RECOVERY_REJECTED_SEATS_TAKEN');
      expect(mockPayment.save).toHaveBeenCalled();
      expect(vi.mocked(Booking.findOneAndUpdate)).not.toHaveBeenCalled();
      expect(refundSpy).toHaveBeenCalledWith(
        mockBooking,
        mockPayment,
        'LATE_PAYMENT_RECOVERY_REJECTED_SEATS_TAKEN',
        expect.any(Object),
        'auto_recovery',
        'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
      );
      refundSpy.mockRestore();
    });
  });

  describe('Phase 1 Webhook & Intent Isolation', () => {
    it('should fail loudly in verifyPayment if no payment identifier is supplied', async () => {
      vi.mocked(Booking.findOne).mockResolvedValue({
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        status: BookingStatus.AWAITING_PAYMENT,
      } as any);

      await expect(
        PaymentService.verifyPayment('MAD-2026-ABCDE', {}, { userId: 'user-owner' })
      ).rejects.toThrow('Payment verification requires a payment identifier');
    });

    it('should query exact payment record using paymentIntentId for Stripe', async () => {
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        totalAmount: 100,
        currency: 'INR',
      };
      const mockPayment = { _id: 'p-stripe-123', gateway: 'stripe', status: PaymentStatus.PENDING, gatewayOrderId: 'pi_123', save: vi.fn() };

      const mockStripe = {
        paymentIntents: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'pi_123',
            status: 'succeeded',
            amount_received: 10000,
            currency: 'inr',
            metadata: {
              bookingId: 'b-123',
              bookingReference: 'MAD-2026-ABCDE',
            },
          }),
        },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockImplementation((query: any) => {
        if (query.gatewayOrderId === 'pi_123' && query.gateway === 'stripe') {
          return { sort: vi.fn().mockResolvedValue(mockPayment) } as any;
        }
        return { sort: vi.fn().mockResolvedValue(null) } as any;
      });
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);

      const result = await PaymentService.verifyPayment(
        'MAD-2026-ABCDE',
        { paymentIntentId: 'pi_123' },
        { userId: 'user-owner' }
      );

      expect(result).toBeDefined();
      expect(mockPayment.status).toBe(PaymentStatus.PAID);
      expect(Payment.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'b-123',
          gatewayOrderId: 'pi_123',
          gateway: 'stripe',
        })
      );
    });

    it('should not mutate booking or release inventory in failPaymentAndReleaseInventory if status is not AWAITING_PAYMENT', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PENDING, save: vi.fn() };
      const mockBooking = { _id: 'b-123', eventId: 'e-123', status: BookingStatus.CONFIRMED, tickets: [], save: vi.fn() };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.failed', 'evt_123');
      expect(result.status).toBe('failed');
      expect(mockPayment.status).toBe(PaymentStatus.FAILED);
      expect(mockPayment.save).toHaveBeenCalled();
      expect(mockBooking.save).not.toHaveBeenCalled();
    });

    it('should bind successful payment to booking.paymentId when confirmation succeeds (Multiple Payment Regression Test)', async () => {
      const mockBooking = {
        _id: 'b-123',
        bookingId: 'MAD-2026-ABCDE',
        userId: { toString: () => 'user-owner' },
        eventId: 'e-123',
        status: BookingStatus.AWAITING_PAYMENT,
        tickets: [],
        paymentId: 'p-A',
        totalAmount: 100,
        currency: 'INR',
      };

      const paymentB = {
        _id: 'p-B',
        gateway: 'stripe',
        status: PaymentStatus.PENDING,
        gatewayOrderId: 'pi_B',
        save: vi.fn(),
      };

      const mockStripe = {
        paymentIntents: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'pi_B',
            status: 'succeeded',
            amount_received: 10000,
            currency: 'inr',
            metadata: {
              bookingId: 'b-123',
              bookingReference: 'MAD-2026-ABCDE',
            },
          }),
        },
      };
      vi.mocked(getStripe).mockReturnValue(mockStripe as any);

      vi.mocked(Booking.findOne).mockResolvedValue(mockBooking as any);
      vi.mocked(Payment.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue(paymentB),
      } as any);
      vi.mocked(Booking.findOneAndUpdate).mockImplementation((query: any, update: any) => {
        if (update.$set) {
          mockBooking.status = update.$set.status;
          mockBooking.paymentId = update.$set.paymentId;
        }
        return mockBooking as any;
      });

      const result = await PaymentService.verifyPayment(
        'MAD-2026-ABCDE',
        { paymentIntentId: 'pi_B' },
        { userId: 'user-owner' }
      );

      expect(result).toBeDefined();
      expect(paymentB.status).toBe(PaymentStatus.PAID);
      expect(mockBooking.status).toBe(BookingStatus.CONFIRMED);
      expect(mockBooking.paymentId).toBe('p-B');
    });

    it('should skip capacity rollback if booking status is already CONFIRMED (concurrency verify race)', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'stripe', status: PaymentStatus.PENDING, save: vi.fn() };
      const mockBooking = {
        _id: 'b-123',
        eventId: 'e-123',
        status: BookingStatus.EXPIRED,
        tickets: [{ tier: 'general', quantity: 2, subtotal: 200, pricePerTicket: 100, tierName: 'General' }],
        totalTickets: 2,
        save: vi.fn(),
      };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Event.findById).mockResolvedValue({
        _id: 'e-123',
        status: 'published',
        soldCount: 0,
        reservedCount: 0,
        totalCapacity: 100,
        ticketTiers: [{ tier: 'general', soldCount: 0, totalCapacity: 100, name: 'General' }],
      } as any);

      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(null);
      const docQueryMock = {
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        catch: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) => {
          if (docQueryMock.select.mock.calls.length > 0) {
            resolve({ status: BookingStatus.CONFIRMED, bookingId: 'b-123', paymentId: 'p-123' });
          } else {
            resolve(mockBooking);
          }
        })
      };
      vi.mocked(Booking.findById).mockImplementation((id: any) => {
        if (id === 'b-123') return docQueryMock as any;
        return null as any;
      });

      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({} as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');

      expect(result.status).toBe('confirmed');
      expect(mockPayment.failureReason).toBeUndefined();
      expect(Event.updateOne).not.toHaveBeenCalled();
    });

    it('should automatically create a requested Refund record when late payment recovery is rejected', async () => {
      const mockPayment = { _id: 'p-123', bookingId: 'b-123', gateway: 'razorpay', status: PaymentStatus.PENDING, failureReason: undefined, save: vi.fn() };
      const mockBooking = {
        _id: 'b-123',
        eventId: 'e-123',
        status: BookingStatus.EXPIRED,
        tickets: [{ tier: 'general', quantity: 2, subtotal: 200, pricePerTicket: 100, tierName: 'General' }],
        totalTickets: 2,
        totalAmount: 200,
        currency: 'INR',
        save: vi.fn(),
      };

      vi.mocked(Payment.findOne).mockResolvedValue(mockPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any);

      vi.mocked(Event.findById).mockResolvedValue({
        _id: 'e-123',
        status: 'published',
        soldCount: 99,
        reservedCount: 0,
        totalCapacity: 100,
        ticketTiers: [{ tier: 'general', soldCount: 99, totalCapacity: 100, name: 'General' }],
      } as any);

      const result = await PaymentService.confirmFromWebhook('order_123', 'pay_123', 'payment.captured', 'evt_123');

      expect(result.status).toBe('skipped');
      expect(mockPayment.failureReason).toBe('LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED');
      expect(Refund.create).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            bookingId: 'b-123',
            paymentId: 'p-123',
            amount: 200,
            currency: 'INR',
            reason: 'LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED',
            status: 'requested',
          }),
        ],
        expect.any(Object)
      );
    });
  });
});
