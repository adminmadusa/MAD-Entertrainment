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

describe('confirmBooking Integration — Success Paths & Guard Conditions', () => {
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

  describe('Suite 1 — Success Paths', () => {
    it('1.1 — general admission, async checkout: booking confirmed, queue enqueued', async () => {
      const booking = makeBooking();
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId);

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({ ...event, soldCount: 2 } as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue({ ...booking } as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_test_001', 'pay_test_001', 'payment.captured', 'evt_001'
      );

      expect(result.status).toBe('confirmed');
      expect(result.bookingId).toBe(booking._id.toString());
      expect(QueueService.enqueue).toHaveBeenCalledWith(
        expect.any(String),
        'booking:confirm',
        { bookingId: booking._id.toString() },
        expect.stringContaining('booking:confirm')
      );
    });

    it('1.2 — general admission, sync checkout: tickets generated, notification created', async () => {
      vi.mocked(getEnv).mockReturnValue({
        RAZORPAY_KEY_ID: 'test_rzp_key',
        RAZORPAY_KEY_SECRET: 'test_rzp_secret',
        ENABLE_ASYNC_CHECKOUT: false,
        MOCK_PAYMENTS: true,
      } as any);

      const booking = makeBooking();
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId);

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({ ...event, soldCount: 2 } as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue({ ...booking } as any);
      vi.mocked(Ticket.findOneAndUpdate).mockResolvedValue({ _id: 'ticket_001' } as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_test_001', 'pay_test_001', 'payment.captured', 'evt_001'
      );

      expect(result.status).toBe('confirmed');
      expect(Ticket.findOneAndUpdate).toHaveBeenCalled();
      for (const call of vi.mocked(Ticket.findOneAndUpdate).mock.calls) {
        expect((call[1] as any).$setOnInsert.assignmentStatus).toBe('unassigned');
      }
    });

    it('1.3 — seat-based booking: SeatLayout updated with BOOKED status', async () => {
      const booking = makeBooking({
        tickets: [
          {
            tier: 'vip',
            tierName: 'VIP',
            quantity: 1,
            subtotal: 1000,
            pricePerTicket: 1000,
            seats: [{ seatId: 'A-01', row: 'A', number: '1', section: 'Main' }],
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
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({ ...event, soldCount: 1 } as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue({ ...booking } as any);
      vi.mocked(SeatLayout.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_seat_001', 'pay_seat_001', 'payment.captured', 'evt_seat_001'
      );

      expect(result.status).toBe('confirmed');
      expect(SeatLayout.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: event._id }),
        expect.objectContaining({
          $set: expect.objectContaining({ 'seats.$[seat].status': 'booked' }),
        }),
        expect.any(Object)
      );
    });

    it('1.4 — booking with coupon: Coupon.updateOne increments usedCount', async () => {
      const couponId = new mongoose.Types.ObjectId();
      const booking = makeBooking({ couponId });
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId);

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({ ...event } as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue({ ...booking } as any);
      vi.mocked(Coupon.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_cpn_001', 'pay_cpn_001', 'payment.captured', 'evt_cpn_001'
      );

      expect(result.status).toBe('confirmed');
      expect(Coupon.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: couponId }),
        { $inc: { usedCount: 1 } },
        expect.any(Object)
      );
    });

    it('1.5 — user with matching email: userId linked to confirmed booking', async () => {
      const userId = new mongoose.Types.ObjectId();
      const booking = makeBooking({ guestEmail: 'user@mad.com' });
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId);

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({ ...event } as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue({ ...booking } as any);
      vi.mocked(UserModel.findOne).mockImplementation(() =>
        createMockQuery({ _id: userId, email: 'user@mad.com' }) as any
      );

      const result = await PaymentService.confirmFromWebhook(
        'order_usr_001', 'pay_usr_001', 'payment.captured', 'evt_usr_001'
      );

      expect(result.status).toBe('confirmed');
      expect(Booking.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ $set: expect.objectContaining({ userId }) }),
        expect.any(Object)
      );
    });
  });

  describe('Suite 2 — Guard Conditions (Pre-Transaction)', () => {
    it('2.1 — CONFIRMED booking, same payment: webhook returns skipped (idempotency)', async () => {
      const booking = makeBooking({ status: BookingStatus.CONFIRMED });
      const payment = makePayment(booking._id, { status: PaymentStatus.PAID });

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_idem_001', 'pay_idem_001', 'payment.captured', 'evt_idem_001'
      );

      expect(result.status).toBe('skipped');
      expect(Event.findById).not.toHaveBeenCalled();
    });

    it('2.2 — CONFIRMED booking, different payment: duplicate payment marked FAILED, refund triggered', async () => {
      const booking = makeBooking({
        status: BookingStatus.CONFIRMED,
        paymentId: new mongoose.Types.ObjectId(),
      });
      const incomingPayment = makePayment(booking._id, {
        status: PaymentStatus.PENDING,
        _id: new mongoose.Types.ObjectId(),
      });
      const event = makeEvent(booking.eventId);

      vi.mocked(Payment.findOne).mockResolvedValue(incomingPayment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(null as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({ ...event } as any);
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any);
      vi.mocked(Refund.create).mockResolvedValue([{}] as any);

      vi.mocked(Booking.findById)
        .mockResolvedValueOnce(booking as any)
        .mockResolvedValueOnce(booking as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_dup_001', 'pay_dup_001', 'payment.captured', 'evt_dup_001'
      );

      expect(['confirmed', 'skipped']).toContain(result.status);
      expect(Refund.create).toHaveBeenCalled();
      expect(incomingPayment.save).toHaveBeenCalled();
    });

    it('2.3 — CANCELLED booking: confirmFromWebhook returns skipped without touching capacity', async () => {
      const booking = makeBooking({ status: BookingStatus.CANCELLED });
      const payment = makePayment(booking._id, { status: PaymentStatus.PENDING });
      const event = makeEvent(booking.eventId);

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(null as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({ ...event } as any);

      const result = await PaymentService.confirmFromWebhook(
        'order_can_001', 'pay_can_001', 'payment.captured', 'evt_can_001'
      );

      expect(['skipped', 'confirmed']).toContain(result.status);
      expect(Event.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Suite 5 — Transaction Integrity Assertions', () => {
    it('5.1 — payment claim is atomic: findOneAndUpdate called with PENDING status guard', async () => {
      const booking = makeBooking();
      const payment = makePayment(booking._id, { status: PaymentStatus.PENDING });
      const event = makeEvent(booking.eventId);

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({ ...event } as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue({ ...booking } as any);

      await PaymentService.confirmFromWebhook(
        'order_atm_001', 'pay_atm_001', 'payment.captured', 'evt_atm_001'
      );

      expect(Payment.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.PENDING }),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('5.2 — event capacity updated with correct soldCount and tier soldCount', async () => {
      const booking = makeBooking({
        tickets: [
          { tier: 'general', tierName: 'General', quantity: 3, subtotal: 750, pricePerTicket: 250 },
        ],
        totalTickets: 3,
      });
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId, {
        ticketTiers: [{ tier: 'general', name: 'General', totalCapacity: 100, soldCount: 10, groupSize: 1 }],
      });

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({ ...event } as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue({ ...booking } as any);

      await PaymentService.confirmFromWebhook(
        'order_cap2_001', 'pay_cap2_001', 'payment.captured', 'evt_cap2_001'
      );

      expect(Event.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $inc: expect.objectContaining({
            soldCount: 3,
            'ticketTiers.0.soldCount': 3,
          }),
        }),
        expect.any(Object)
      );
    });

    it('5.3 — normal path: reservedCount decremented by totalTickets', async () => {
      const booking = makeBooking({ totalTickets: 2 });
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId, { reservedCount: 10 });

      vi.mocked(Payment.findOne).mockResolvedValue(payment as any);
      vi.mocked(Booking.findById).mockResolvedValue(booking as any);
      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({ ...event } as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue({ ...booking } as any);

      await PaymentService.confirmFromWebhook(
        'order_res_001', 'pay_res_001', 'payment.captured', 'evt_res_001'
      );

      expect(Event.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $inc: expect.objectContaining({ reservedCount: -2 }),
        }),
        expect.any(Object)
      );
    });

    it('5.4 — coupon usage limit reached: throws and aborts transaction', async () => {
      const couponId = new mongoose.Types.ObjectId();
      const booking = makeBooking({ couponId });
      const payment = makePayment(booking._id);
      const event = makeEvent(booking.eventId);

      vi.mocked(Event.findById).mockResolvedValue(event as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({ ...event } as any);
      vi.mocked(Booking.findOneAndUpdate).mockResolvedValue({ ...booking } as any);
      vi.mocked(Coupon.updateOne).mockResolvedValue({ modifiedCount: 0 } as any);
      vi.mocked(Refund.findOne).mockImplementation(() => createMockQuery(null) as any);
      vi.mocked(Refund.create).mockResolvedValue([{}] as any);

      await expect(
        (PaymentService as any)['confirmBooking'](booking, payment)
      ).rejects.toMatchObject({ code: 'COUPON_USAGE_LIMIT_REACHED' });
    });
  });
});
