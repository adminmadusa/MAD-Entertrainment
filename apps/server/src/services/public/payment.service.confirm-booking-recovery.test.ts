import mongoose from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, PaymentStatus } from '@mad/shared';

import { getEnv } from '../../config/env';
import { Booking } from '../../models/booking.schema';
import { Coupon } from '../../models/coupon.schema';
import { Event } from '../../models/event.schema';
import { Notification } from '../../models/notification.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { Reservation } from '../../models/reservation.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { Ticket } from '../../models/ticket.schema';
import { UserModel } from '../../models/user.schema';
import { CacheService } from '../cache.service';
import { QueueService } from '../queue.service';
import { ReservationService } from '../reservation.service';
import { PaymentService } from './payment.service';

// ─── Session Mock ─────────────────────────────────────────────────────────────

const { mockSession } = vi.hoisted(() => {
  const session = {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    abortTransaction: vi.fn(),
    withTransaction: vi.fn().mockImplementation(async (callback: () => Promise<unknown>) => {
      return callback();
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

// ─── Query Helper ─────────────────────────────────────────────────────────────

const createMockQuery = (val: unknown) => {
  const query = Promise.resolve(val);
  (query as any).session = vi.fn().mockReturnValue(query);
  (query as any).lean = vi.fn().mockReturnValue(query);
  (query as any).sort = vi.fn().mockReturnValue(query);
  return query as any;
};

// ─── Model Mocks ──────────────────────────────────────────────────────────────

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
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/refund.schema', () => ({
  Refund: {
    create: vi.fn(),
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

vi.mock('../../models/user.schema', () => ({
  UserModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/notification.schema', () => ({
  Notification: {
    updateOne: vi.fn(),
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

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('../reservation.service', () => ({
  ReservationService: {
    transitionForBooking: vi.fn().mockResolvedValue([]),
    confirmCapacity: vi.fn().mockResolvedValue([]),
    releaseCapacityForTerminalReservations: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../notification.service', () => ({
  createNotificationSafe: vi.fn().mockResolvedValue({ _id: 'notification_001' } as any),
}));

vi.mock('../cache.service', () => ({
  CacheService: {
    delPattern: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/pdf', () => ({
  generateTicketPDF: vi.fn().mockResolvedValue(Buffer.from('mock-pdf')),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeIds = () => ({
  bookingObjectId: new mongoose.Types.ObjectId(),
  paymentObjectId: new mongoose.Types.ObjectId(),
  eventObjectId: new mongoose.Types.ObjectId(),
});

const makeFutureDate = (offsetMs = 24 * 60 * 60 * 1000) => new Date(Date.now() + offsetMs);
const makePastDate = (offsetMs = 60 * 60 * 1000) => new Date(Date.now() - offsetMs);

function makeBooking(overrides: Record<string, unknown> = {}) {
  const ids = makeIds();
  return {
    _id: ids.bookingObjectId,
    bookingId: 'MAD-TEST-001',
    eventId: ids.eventObjectId,
    status: BookingStatus.AWAITING_PAYMENT,
    guestEmail: 'guest@example.com',
    guestName: 'Test Guest',
    currency: 'INR',
    totalAmount: 500,
    totalTickets: 2,
    tickets: [
      {
        tier: 'general',
        tierName: 'General Admission',
        quantity: 2,
        subtotal: 500,
        pricePerTicket: 250,
      },
    ],
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makePayment(bookingId: unknown, overrides: Record<string, unknown> = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    bookingId,
    gateway: 'razorpay',
    status: PaymentStatus.PENDING,
    gatewayOrderId: 'order_test_001',
    gatewayPaymentId: 'pay_test_001',
    amount: 500,
    currency: 'INR',
    paidAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeEvent(eventId: unknown, overrides: Record<string, unknown> = {}) {
  return {
    _id: eventId,
    title: 'MAD Test Event',
    status: 'published',
    isDeleted: false,
    startDate: makeFutureDate(),
    soldCount: 0,
    reservedCount: 5,
    totalCapacity: 100,
    isSoldOut: false,
    bookingMode: 'general_admission',
    ticketTiers: [
      { tier: 'general', name: 'General Admission', totalCapacity: 100, soldCount: 0, groupSize: 1 },
    ],
    ...overrides,
  };
}

describe('confirmBooking Integration — Recovery & Failure Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getEnv).mockReturnValue({
      RAZORPAY_KEY_ID: 'test_rzp_key',
      RAZORPAY_KEY_SECRET: 'test_rzp_secret',
      STRIPE_PUBLISHABLE_KEY: 'test_stripe_key',
      STRIPE_SECRET_KEY: 'test_stripe_secret',
      ENABLE_ASYNC_CHECKOUT: true,
      MOCK_PAYMENTS: true,
    } as any);

    vi.mocked(Reservation.aggregate).mockImplementation(() => createMockQuery([{ total: 0 }]) as any);
    vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any);
    vi.mocked(SeatLayout.findOne).mockImplementation(() => createMockQuery(null) as any);
    vi.mocked(UserModel.findOne).mockImplementation(() => createMockQuery(null) as any);
    vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([]);
    vi.mocked(QueueService.enqueue).mockResolvedValue(undefined as any);
    vi.mocked(CacheService.delPattern).mockResolvedValue(undefined as any);
    vi.mocked(Notification.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    vi.mocked(Payment.findOneAndUpdate).mockImplementation((query: any, update: any) =>
      Promise.resolve({
        _id: query._id,
        status: PaymentStatus.PAID,
        gatewayPaymentId: update?.$set?.gatewayPaymentId || 'pay_test_001',
        gatewaySignature: update?.$set?.gatewaySignature,
        paidAt: update?.$set?.paidAt || new Date(),
        save: vi.fn(),
      }) as any
    );
  });

  describe('Suite 3 — Transaction Failure & Rollback', () => {
    it('3.1 — PAYMENT_ALREADY_CLAIMED: concurrent thread wins, returns booking from DB', async () => {
      const booking = makeBooking();
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId);
      const confirmedBooking = { ...booking, status: BookingStatus.CONFIRMED };

      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Payment.findOneAndUpdate).mockResolvedValue(null as any);
      vi.mocked(Booking.findById).mockResolvedValue(confirmedBooking as any);

      const result = await (PaymentService as any)['confirmBooking'](booking, payment);

      expect(result).toBeDefined();
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it('3.2 — EVENT_CAPACITY_ALLOCATION_FAILED: payment FAILED, refund triggered', async () => {
      const booking = makeBooking();
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId);

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue(null as any);
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any);
      vi.mocked(Refund.create).mockResolvedValue([{}] as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_cap_001', 'pay_cap_001', 'payment.captured', 'evt_cap_001'
      );

      expect(result.status).toBe('skipped');
      expect(payment.save).toHaveBeenCalled();
      expect(Refund.create).toHaveBeenCalled();
    });

    it('3.3 — CONCURRENT_CONFIRMATION, same payment wins: safe exit, no refund', async () => {
      const bookingId = new mongoose.Types.ObjectId();
      const paymentId = new mongoose.Types.ObjectId();
      const booking = makeBooking({ _id: bookingId });
      const payment = makePayment(bookingId, { _id: paymentId });
      const event = makeEvent(booking.eventId);
      const alreadyConfirmedLean = {
        status: BookingStatus.CONFIRMED,
        paymentId,
      };

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(null as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue(event as any);

      let findByIdCallCount = 0;
      vi.mocked(Booking.findById).mockImplementation((_id: any) => {
        findByIdCallCount++;
        if (findByIdCallCount === 1) {
          return Promise.resolve(booking) as any;
        }
        return {
          select: vi.fn().mockReturnValue({
            lean: vi.fn().mockReturnValue({
              catch: vi.fn().mockResolvedValue(alreadyConfirmedLean),
            }),
          }),
        } as any;
      });

      const result = await PaymentService.confirmFromWebhook(
        'order_cc_001', 'pay_cc_001', 'payment.captured', 'evt_cc_001'
      );

      expect(['confirmed', 'skipped']).toContain(result.status);
      expect(Refund.create).not.toHaveBeenCalled();
    });

    it('3.4 — CONCURRENT_CONFIRMATION, different payment wins: loser refunded', async () => {
      const bookingId = new mongoose.Types.ObjectId();
      const winningPaymentId = new mongoose.Types.ObjectId();
      const losingPaymentId = new mongoose.Types.ObjectId();
      const booking = makeBooking({ _id: bookingId });
      const losingPayment = makePayment(bookingId, { _id: losingPaymentId });
      const event = makeEvent(booking.eventId);
      const alreadyConfirmedLean = {
        status: BookingStatus.CONFIRMED,
        paymentId: winningPaymentId,
      };

      vi.mocked(Payment.findOne).mockResolvedValue(losingPayment as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(null as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue(event as any);
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any);
      vi.mocked(Refund.create).mockResolvedValue([{}] as any);

      let findByIdCallCount = 0;
      vi.mocked(Booking.findById).mockImplementation((_id: any) => {
        findByIdCallCount++;
        if (findByIdCallCount === 1) {
          return Promise.resolve(booking) as any;
        }
        return {
          select: vi.fn().mockReturnValue({
            lean: vi.fn().mockReturnValue({
              catch: vi.fn().mockResolvedValue(alreadyConfirmedLean),
            }),
          }),
        } as any;
      });

      const result = await PaymentService.confirmFromWebhook(
        'order_cc2_001', 'pay_cc2_001', 'payment.captured', 'evt_cc2_001'
      );

      expect(['confirmed', 'skipped']).toContain(result.status);
      expect(Refund.create).toHaveBeenCalled();
      expect(losingPayment.save).toHaveBeenCalled();
    });

    it('3.5 — EVENT_EXPIRED_DURING_CONFIRMATION: auto-recovery refund triggered', async () => {
      const booking = makeBooking();
      const payment = makePayment(booking._id);
      const expiredEvent = makeEvent(booking.eventId, { startDate: makePastDate() });

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(expiredEvent as any);
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any);
      vi.mocked(Refund.create).mockResolvedValue([{}] as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_exp_001', 'pay_exp_001', 'payment.captured', 'evt_exp_001'
      );

      expect(result.status).toBe('skipped');
      expect(payment.save).toHaveBeenCalled();
      expect(Refund.create).toHaveBeenCalled();
    });

    it('3.6 — SEAT_ALLOCATION_FAILED: modifiedCount mismatch triggers payment failure', async () => {
      const booking = makeBooking({
        tickets: [
          {
            tier: 'vip',
            tierName: 'VIP',
            quantity: 1,
            subtotal: 1000,
            pricePerTicket: 1000,
            seats: [{ seatId: 'B-05', row: 'B', number: '5', section: 'Main' }],
          },
        ],
        totalTickets: 1,
      });
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId, {
        bookingMode: 'seat_based',
        ticketTiers: [{ tier: 'vip', name: 'VIP', totalCapacity: 50, soldCount: 0, groupSize: 1 }],
      });

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(SeatLayout.updateOne).mockResolvedValue({ modifiedCount: 0 } as any);
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any);
      vi.mocked(Refund.create).mockResolvedValue([{}] as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_seat_fail_001', 'pay_seat_fail_001', 'payment.captured', 'evt_seat_fail_001'
      );

      expect(result.status).toBe('skipped');
      expect(payment.save).toHaveBeenCalled();
      expect(Refund.create).toHaveBeenCalled();
    });
  });

  describe('Suite 4 — Late Recovery (EXPIRED / EXPIRING bookings)', () => {
    it('4.1 — EXPIRED booking, capacity available: proceeds to confirmation', async () => {
      const booking = makeBooking({ status: BookingStatus.EXPIRED });
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId, { soldCount: 50, reservedCount: 0, totalCapacity: 100 });

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Reservation.aggregate).mockImplementation(() => createMockQuery([{ total: 0 }]) as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({ ...event, soldCount: 52 } as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue({ ...booking } as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_late_001', 'pay_late_001', 'payment.captured', 'evt_late_001'
      );

      expect(result.status).toBe('confirmed');
    });

    it('4.2 — EXPIRED booking, general capacity exhausted: payment FAILED, refund triggered', async () => {
      const booking = makeBooking({ status: BookingStatus.EXPIRED, totalTickets: 5 });
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId, { soldCount: 98, reservedCount: 0, totalCapacity: 100 });

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any);
      vi.mocked(Refund.create).mockResolvedValue([{}] as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_late_cap_001', 'pay_late_cap_001', 'payment.captured', 'evt_late_cap_001'
      );

      expect(result.status).toBe('skipped');
      expect(payment.save).toHaveBeenCalled();
      expect(Refund.create).toHaveBeenCalled();
    });

    it('4.3 — EXPIRED booking, tier capacity exhausted: payment FAILED, refund triggered', async () => {
      const booking = makeBooking({
        status: BookingStatus.EXPIRED,
        tickets: [{ tier: 'vip', tierName: 'VIP', quantity: 5, subtotal: 5000, pricePerTicket: 1000 }],
        totalTickets: 5,
      });
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId, {
        ticketTiers: [{ tier: 'vip', name: 'VIP', totalCapacity: 10, soldCount: 8, groupSize: 1 }],
      });

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Reservation.aggregate).mockImplementation(() => createMockQuery([{ total: 2 }]) as any);
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any);
      vi.mocked(Refund.create).mockResolvedValue([{}] as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_late_tier_001', 'pay_late_tier_001', 'payment.captured', 'evt_late_tier_001'
      );

      expect(result.status).toBe('skipped');
      expect(payment.save).toHaveBeenCalled();
      expect(Refund.create).toHaveBeenCalled();
    });

    it('4.4 — EXPIRED booking, seats taken (seat_based): payment FAILED, refund triggered', async () => {
      const booking = makeBooking({
        status: BookingStatus.EXPIRED,
        tickets: [
          {
            tier: 'vip',
            tierName: 'VIP',
            quantity: 1,
            subtotal: 1000,
            pricePerTicket: 1000,
            seats: [{ seatId: 'C-10', row: 'C', number: '10', section: 'West' }],
          },
        ],
        totalTickets: 1,
      });
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId, {
        bookingMode: 'seat_based',
        ticketTiers: [{ tier: 'vip', name: 'VIP', totalCapacity: 50, soldCount: 0, groupSize: 1 }],
      });

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Reservation.aggregate).mockImplementation(() => createMockQuery([{ total: 0 }]) as any);
      vi.mocked(SeatLayout.findOne).mockImplementation(() =>
        createMockQuery({ _id: 'layout_001', seats: [{ seatId: 'C-10', status: 'booked' }] }) as any
      );
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any);
      vi.mocked(Refund.create).mockResolvedValue([{}] as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_late_seat_001', 'pay_late_seat_001', 'payment.captured', 'evt_late_seat_001'
      );

      expect(result.status).toBe('skipped');
      expect(payment.save).toHaveBeenCalled();
      expect(Refund.create).toHaveBeenCalled();
    });
  });
});
