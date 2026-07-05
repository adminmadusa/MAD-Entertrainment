import mongoose from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, PaymentStatus, ReservationStatus, SeatStatus, NotificationType } from '@mad/shared';

import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { Notification } from '../models/notification.schema';
import { Payment } from '../models/payment.schema';
import { Refund } from '../models/refund.schema';
import { Reservation } from '../models/reservation.schema';
import { SeatLayout } from '../models/seat-layout.schema';
import { Ticket } from '../models/ticket.schema';
import { ConsistencyService } from './consistency.service';
import { BookingConsistencyService } from './consistency/booking-consistency.service';
import { PaymentService } from './public/payment.service';
import { QueueService } from './queue.service';
import { ReservationService } from './reservation.service';

vi.mock('mongoose', async (importOriginal) => {
  const original = await importOriginal<typeof import('mongoose')>();
  return {
    ...original,
    default: {
      ...original.default,
      startSession: vi.fn().mockRejectedValue(new Error('No transaction in test')),
    },
    startSession: vi.fn().mockRejectedValue(new Error('No transaction in test')),
  };
});

const { mockTriggerRefundRequest } = vi.hoisted(() => ({
  mockTriggerRefundRequest: vi.fn(),
}));

vi.mock('./public/payment.service', () => ({
  PaymentService: {
    confirmBooking: vi.fn(),
    triggerRefundRequest: mockTriggerRefundRequest,
  },
}));

vi.mock('./public/payment-refund.service', () => ({
  PaymentRefundService: {
    triggerRefundRequest: mockTriggerRefundRequest,
  },
}));

vi.mock('./notification.service', () => ({
  createNotificationSafe: vi.fn().mockResolvedValue([]),
}));

const mockCreateMockQuery = (resolvedValue: any = []) => {
  const query: any = {
    sort: vi.fn().mockImplementation(() => query),
    limit: vi.fn().mockImplementation(() => query),
    select: vi.fn().mockImplementation(() => query),
    lean: vi.fn().mockImplementation(() => Promise.resolve(resolvedValue)),
    then: vi.fn().mockImplementation((resolve) => resolve(resolvedValue)),
  };
  return query;
};

vi.mock('../models/booking.schema', () => ({
  Booking: {
    find: vi.fn(() => mockCreateMockQuery([])),
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    exists: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/notification.schema', () => ({
  Notification: {
    find: vi.fn(() => mockCreateMockQuery([])),
    findOne: vi.fn(),
    updateOne: vi.fn(),
    exists: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
    find: vi.fn(() => mockCreateMockQuery([])),
  },
}));

vi.mock('../models/seat-layout.schema', () => ({
  SeatLayout: {
    updateOne: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('./reservation.service', () => ({
  ReservationService: {
    transitionForBooking: vi.fn().mockResolvedValue([]),
    releaseCapacityForTerminalReservations: vi.fn().mockResolvedValue([]),
    expireReservations: vi.fn().mockResolvedValue([]),
    groupByEvent: vi.fn(() => new Map()),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../models/ticket.schema', () => ({
  Ticket: {
    countDocuments: vi.fn(),
  },
}));

vi.mock('./queue.service', () => ({
  QueueService: {
    enqueue: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../config/queue.config', () => ({
  getQueueName: vi.fn((name: string) => `${name}-test`),
}));

vi.mock('../models/reservation.schema', () => ({
  Reservation: {
    countDocuments: vi.fn(),
    find: vi.fn(() => mockCreateMockQuery([])),
  },
}));

vi.mock('../models/payment.schema', () => ({
  Payment: {
    countDocuments: vi.fn(),
    find: vi.fn(() => mockCreateMockQuery([])),
  },
}));

vi.mock('../models/refund.schema', () => ({
  Refund: {
    findOne: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(() => mockCreateMockQuery([])),
    countDocuments: vi.fn(() => mockCreateMockQuery(0)),
    updateOne: vi.fn(() => mockCreateMockQuery({ modifiedCount: 1 })),
  },
}));

vi.mock('../config/redis', () => ({
  isRedisConnected: vi.fn(() => false),
  getRedis: vi.fn(),
}));

vi.mock('../config/socket', () => ({
  emitToAdmin: vi.fn(),
  emitToEvent: vi.fn(),
}));

vi.mock('../utils/audit', () => ({
  auditLog: vi.fn(),
}));

describe('ConsistencyService - expireStaleBookings and Concurrency Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Booking.updateMany).mockResolvedValue({ modifiedCount: 0 } as any);
    vi.mocked(Booking.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);
  });

  it('should transition stale bookings to EXPIRED and release inventory and locked seats concurrency-safely', async () => {
    const mockCandidate = { _id: 'b-expired' };
    const mockBooking = {
      _id: 'b-expired',
      bookingId: 'MAD-2026-STALE',
      eventId: 'e-123',
      status: BookingStatus.AWAITING_PAYMENT,
      tickets: [{ seats: [{ seatId: 'seat-A1' }] }],
      bookingVersion: 2,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(Booking.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockCandidate]),
      }),
    } as any);

    const mockFindByIdQuery = {
      session: vi.fn().mockResolvedValue(mockBooking),
    };
    vi.mocked(Booking.findById).mockReturnValue(mockFindByIdQuery as any);

    const mockEventQuery = {
      session: vi.fn().mockResolvedValue({ _id: 'e-123', bookingMode: 'seat_based' }),
    };
    vi.mocked(Event.findById).mockReturnValue(mockEventQuery as any);

    vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([{ reservationId: 'r-123', quantity: 2 }] as any);

    const expiredCount = await BookingConsistencyService.expireStaleBookings();

    expect(expiredCount).toBe(1);
    expect(mockBooking.save).toHaveBeenCalled();
    expect(mockBooking.status).toBe(BookingStatus.EXPIRED);

    expect(ReservationService.transitionForBooking).toHaveBeenCalledWith(
      'b-expired',
      ReservationStatus.EXPIRED,
      expect.objectContaining({ reason: 'booking-logical-checkout-timeout' }),
      undefined
    );
    expect(ReservationService.releaseCapacityForTerminalReservations).toHaveBeenCalledWith([{ reservationId: 'r-123', quantity: 2 }], undefined);
    expect(SeatLayout.updateOne).toHaveBeenCalledWith(
      { eventId: 'e-123' },
      expect.objectContaining({
        $set: { 'seats.$[seat].status': SeatStatus.AVAILABLE },
      }),
      expect.objectContaining({
        arrayFilters: [{
          'seat.seatId': { $in: ['seat-A1'] },
          $or: [
            { 'seat.bookedByBookingId': 'b-expired' },
            { 'seat.reservationId': { $in: expect.any(Array) } }
          ]
        }],
        session: undefined
      })
    );
  });

  it('should prevent multiple concurrent workers from double-expiring the same booking (Atomic Claim Scenario)', async () => {
    const mockCandidate = { _id: 'b-concurrent' };
    const mockBookingA = {
      _id: 'b-concurrent',
      bookingId: 'MAD-2026-CONC',
      eventId: 'e-123',
      status: BookingStatus.AWAITING_PAYMENT,
      tickets: [{ seats: [] }],
      bookingVersion: 2,
      save: vi.fn().mockResolvedValue(true),
    };
    const mockBookingB = {
      _id: 'b-concurrent',
      bookingId: 'MAD-2026-CONC',
      eventId: 'e-123',
      status: BookingStatus.EXPIRED,
      tickets: [{ seats: [] }],
      bookingVersion: 3,
      save: vi.fn().mockResolvedValue(true),
    };

    // Both workers find the same candidate ID
    vi.mocked(Booking.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockCandidate]),
      }),
    } as any);

    // Worker A claims AWAITING_PAYMENT, Worker B gets EXPIRED
    const queryA = { session: vi.fn().mockResolvedValue(mockBookingA) };
    const queryB = { session: vi.fn().mockResolvedValue(mockBookingB) };
    vi.mocked(Booking.findById)
      .mockReturnValueOnce(queryA as any)
      .mockReturnValueOnce(queryB as any);

    const mockEventQuery = {
      session: vi.fn().mockResolvedValue({ _id: 'e-123', bookingMode: 'general_admission' }),
    };
    vi.mocked(Event.findById).mockReturnValue(mockEventQuery as any);

    vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([{ reservationId: 'r-abc', quantity: 1 }] as any);

    // Simulate two concurrent worker executions running in parallel
    const [workerAResult, workerBResult] = await Promise.all([
      BookingConsistencyService.expireStaleBookings(),
      BookingConsistencyService.expireStaleBookings()
    ]);

    // Worker A successfully processed exactly 1 expired booking
    expect(workerAResult).toBe(1);
    // Worker B skipped the booking and processed exactly 0
    expect(workerBResult).toBe(0);

    // Assert that the database updates were only executed ONCE by Worker A
    expect(mockBookingA.save).toHaveBeenCalledTimes(1);
    expect(mockBookingB.save).not.toHaveBeenCalled();

    expect(ReservationService.transitionForBooking).toHaveBeenCalledTimes(1);
    expect(ReservationService.releaseCapacityForTerminalReservations).toHaveBeenCalledTimes(1);
  });

  it('should recover stuck EXPIRING bookings back to AWAITING_PAYMENT during the stuck-booking sweep', async () => {
    vi.mocked(Booking.updateMany).mockResolvedValue({ modifiedCount: 3 } as any);
    vi.mocked(Booking.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    const expiredCount = await BookingConsistencyService.expireStaleBookings();

    expect(expiredCount).toBe(0);
    expect(Booking.updateMany).toHaveBeenCalledWith(
      { status: BookingStatus.EXPIRING, updatedAt: { $lte: expect.any(Date) } },
      { $set: { status: BookingStatus.AWAITING_PAYMENT } }
    );
  });
});

describe('ConsistencyService - Confirmed Booking Ticket Watchdog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Booking.exists).mockResolvedValue(true as any);
    vi.mocked(QueueService.enqueue).mockResolvedValue(undefined);
    vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([]) as any);
  });

  // Test 1 — Detect CONFIRMED booking with zero tickets
  it('should detect CONFIRMED booking with zero tickets and enqueue it', async () => {
    const mockCandidate = { _id: 'b-confirmed-1', totalTickets: 1 };
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([mockCandidate]),
    };
    vi.mocked(Booking.find).mockReturnValue(mockQuery as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.exists).mockResolvedValue(true as any);

    const reEnqueued = await BookingConsistencyService.repairUnticketedConfirmedBookings();

    expect(reEnqueued).toBe(1);
    expect(Ticket.countDocuments).toHaveBeenCalledWith({ bookingId: 'b-confirmed-1' });
    expect(Booking.exists).toHaveBeenCalledWith({ _id: 'b-confirmed-1' });
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'booking-queue-test',
      'booking:confirm',
      { bookingId: 'b-confirmed-1' },
      'booking:confirm:b-confirmed-1'
    );
  });

  // Test 2 — Skip booking that already has tickets
  it('should skip booking that already has tickets', async () => {
    const mockCandidate = { _id: 'b-confirmed-2', totalTickets: 1 };
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([mockCandidate]),
    };
    vi.mocked(Booking.find).mockReturnValue(mockQuery as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(1);

    const reEnqueued = await BookingConsistencyService.repairUnticketedConfirmedBookings();

    expect(reEnqueued).toBe(0);
    expect(Booking.exists).not.toHaveBeenCalled();
    expect(QueueService.enqueue).not.toHaveBeenCalled();
  });

  // Test 3 — Re-enqueue uses exact queue name, job name, and jobId
  it('should use exact queue name, job name, and jobId patterns', async () => {
    const mockCandidate1 = { _id: 'b-confirmed-3', totalTickets: 1 };
    const mockCandidate2 = { _id: 'b-confirmed-4', totalTickets: 1 };
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([mockCandidate1, mockCandidate2]),
    };
    vi.mocked(Booking.find).mockReturnValue(mockQuery as any);
    vi.mocked(Ticket.countDocuments)
      .mockResolvedValueOnce(0) // candidate 1
      .mockResolvedValueOnce(1); // candidate 2

    const reEnqueued = await BookingConsistencyService.repairUnticketedConfirmedBookings();

    expect(reEnqueued).toBe(1);
    expect(QueueService.enqueue).toHaveBeenCalledTimes(1);
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'booking-queue-test',
      'booking:confirm',
      { bookingId: 'b-confirmed-3' },
      'booking:confirm:b-confirmed-3'
    );
  });

  // Test 4 — BullMQ deduplication: queue failure does not crash cycle
  it('should catch queue connection failures per candidate without crashing the cycle', async () => {
    const mockCandidate = { _id: 'b-confirmed-5', totalTickets: 1 };
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([mockCandidate]),
    };
    vi.mocked(Booking.find).mockReturnValue(mockQuery as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(0);
    vi.mocked(QueueService.enqueue).mockRejectedValue(new Error('Redis connection failure'));

    const reEnqueued = await BookingConsistencyService.repairUnticketedConfirmedBookings();

    expect(reEnqueued).toBe(0);
    expect(QueueService.enqueue).toHaveBeenCalled();
  });

  // Test 5 — Report metric: countUnticketedConfirmedBookings returns correct count
  it('should count unticketed confirmed bookings correctly', async () => {
    const mockCandidates = [
      { _id: 'b-1', totalTickets: 1 },
      { _id: 'b-2', totalTickets: 2 },
      { _id: 'b-3', totalTickets: 1 },
    ];
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockCandidates),
    };
    vi.mocked(Booking.find).mockReturnValue(mockQuery as any);
    vi.mocked(Ticket.countDocuments)
      .mockResolvedValueOnce(0) // b-1 has 0 tickets
      .mockResolvedValueOnce(2) // b-2 has 2 tickets
      .mockResolvedValueOnce(0); // b-3 has 0 tickets

    const count = await BookingConsistencyService.countUnticketedConfirmedBookings();

    expect(count).toBe(2);
    expect(Ticket.countDocuments).toHaveBeenCalledTimes(3);
  });

  // Test 6 — Empty candidate list: no enqueues, returns 0
  it('should return 0 immediately if the candidate list is empty', async () => {
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(Booking.find).mockReturnValue(mockQuery as any);

    const reEnqueued = await BookingConsistencyService.repairUnticketedConfirmedBookings();

    expect(reEnqueued).toBe(0);
    expect(Ticket.countDocuments).not.toHaveBeenCalled();
    expect(QueueService.enqueue).not.toHaveBeenCalled();
  });

  // Test 7 — runRepairCycle integrates the new watchdog
  it('should integrate the new watchdog into runRepairCycle', async () => {
    const repairSpy = vi.spyOn(BookingConsistencyService, 'repairUnticketedConfirmedBookings').mockResolvedValue(3);
    const countSpy = vi.spyOn(BookingConsistencyService, 'countUnticketedConfirmedBookings').mockResolvedValue(2);

    // Mock other models called by generateReport / runRepairCycle to prevent crashes
    vi.mocked(Reservation.countDocuments).mockResolvedValue(10);
    vi.mocked(Booking.countDocuments).mockResolvedValue(5);
    vi.mocked(Payment.countDocuments).mockResolvedValue(1);
    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([]));

    const report = await ConsistencyService.runRepairCycle();

    expect(repairSpy).toHaveBeenCalled();
    expect(countSpy).toHaveBeenCalled();
    expect(report.repairs?.reEnqueuedUnticketedBookings).toBe(3);
    expect(report.drift.unticketedConfirmedBookings).toBe(2);

    repairSpy.mockRestore();
    countSpy.mockRestore();
  });

  // Test 8 — Query contract verification
  it('should verify the query contract filters for CONFIRMED and within the correct window and page limit', async () => {
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(Booking.find).mockReturnValue(mockQuery as any);

    await BookingConsistencyService.repairUnticketedConfirmedBookings();

    expect(Booking.find).toHaveBeenCalledWith({
      status: BookingStatus.CONFIRMED,
      updatedAt: { $gte: expect.any(Date) },
    });
    expect(mockQuery.sort).toHaveBeenCalledWith({ updatedAt: 1 });
    expect(mockQuery.limit).toHaveBeenCalledWith(25);
  });

  // Test 9 — Booking deleted after scan but before enqueue
  it('should skip enqueue and log warn if booking is deleted after scan but before enqueue', async () => {
    const mockCandidate = { _id: 'b-confirmed-deleted', totalTickets: 1 };
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([mockCandidate]),
    };
    vi.mocked(Booking.find).mockReturnValue(mockQuery as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.exists).mockResolvedValue(null as any);

    const reEnqueued = await BookingConsistencyService.repairUnticketedConfirmedBookings();

    expect(reEnqueued).toBe(0);
    expect(Booking.exists).toHaveBeenCalledWith({ _id: 'b-confirmed-deleted' });
    expect(QueueService.enqueue).not.toHaveBeenCalled();
  });
});

describe('ConsistencyService - Pipeline Watchdog (PR-T4A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Notification.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);
    vi.mocked(Notification.exists).mockResolvedValue(false as any);
  });

  // Test 1: Stuck Notification Repair - Safety Ordering (no update if enqueue fails)
  it('should not update notification status in DB if QueueService.enqueue fails', async () => {
    const mockNotification = {
      _id: 'n-stuck-1',
      bookingId: 'b-confirmed-stuck-1',
      status: 'queued',
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    };
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([mockNotification]) as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(2);
    vi.mocked(Booking.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'b-confirmed-stuck-1',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.CONFIRMED,
      totalTickets: 2,
    }) as any);

    vi.mocked(QueueService.enqueue).mockRejectedValue(new Error('Queue offline'));

    const count = await (ConsistencyService as any).repairStuckNotifications();

    expect(count).toBe(0);
    expect(QueueService.enqueue).toHaveBeenCalled();
    expect(Notification.updateOne).not.toHaveBeenCalled();
  });

  // Test 2: Stuck Notification Repair - Successful Enqueue transitions status conditionally
  it('should conditionally update notification status in DB to failed if enqueue succeeds', async () => {
    const mockNotification = {
      _id: 'n-stuck-2',
      bookingId: 'b-confirmed-stuck-2',
      status: 'processing',
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    };
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([mockNotification]) as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(2);
    vi.mocked(Booking.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'b-confirmed-stuck-2',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.CONFIRMED,
      totalTickets: 2,
    }) as any);
    vi.mocked(QueueService.enqueue).mockResolvedValue(undefined);
    vi.mocked(Notification.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const count = await (ConsistencyService as any).repairStuckNotifications();

    expect(count).toBe(1);
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'pdf-queue-test',
      'pdf:generate',
      {
        bookingId: 'b-confirmed-stuck-2',
        eventId: 'e-123',
        recipientEmail: 'guest@example.com',
        guestName: 'Guest User',
      },
      'pdf:generate:b-confirmed-stuck-2'
    );
    expect(Notification.updateOne).toHaveBeenCalledWith(
      {
        _id: 'n-stuck-2',
        status: { $in: ['queued', 'processing'] },
      },
      {
        $set: {
          status: 'failed',
          errorMessage: 'WATCHDOG_RESET_STUCK_LEASE',
        },
      }
    );
  });

  // Test 3: Stuck Notification - Conditional transition avoids overwriting sent state
  it('should handle update failure if status was modified concurrently to sent', async () => {
    const mockNotification = {
      _id: 'n-stuck-3',
      bookingId: 'b-confirmed-stuck-3',
      status: 'processing',
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    };
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([mockNotification]) as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(2);
    vi.mocked(Booking.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'b-confirmed-stuck-3',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.CONFIRMED,
      totalTickets: 2,
    }) as any);
    vi.mocked(QueueService.enqueue).mockResolvedValue(undefined);
    vi.mocked(Notification.updateOne).mockResolvedValue({ modifiedCount: 0 } as any);

    const count = await (ConsistencyService as any).repairStuckNotifications();

    expect(count).toBe(0);
  });

  // Test 3B: Stuck Refund Notification Repair
  it('should recover stuck refund notifications independently of booking confirmed status', async () => {
    const mockNotification = {
      _id: 'n-stuck-refund-1',
      bookingId: 'b-refund-stuck',
      status: 'queued',
      type: NotificationType.FULL_REFUND,
      jobId: 'refund-ref-123-timestamp',
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    };
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([mockNotification]) as any);

    const mockRefund = {
      _id: 'ref-123',
      paymentId: 'p-123',
      amount: 500,
      status: 'completed',
      processedAt: new Date(),
    };
    vi.mocked(Refund.findById).mockResolvedValue(mockRefund as any);
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([mockRefund]) as any);

    vi.mocked(Booking.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'b-refund-stuck',
      bookingId: 'MAD-2026-REF',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.REFUNDED,
      totalAmount: 500,
    }) as any);

    vi.mocked(Event.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'e-123',
      title: 'Event Title',
    }) as any);

    vi.mocked(QueueService.enqueue).mockResolvedValue(undefined);
    vi.mocked(Notification.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const count = await (ConsistencyService as any).repairStuckNotifications();

    expect(count).toBe(1);
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'notification-queue-test',
      'email-dispatch',
      expect.objectContaining({
        to: 'guest@example.com',
        notificationType: NotificationType.FULL_REFUND,
        bookingId: 'b-refund-stuck',
      }),
      expect.stringContaining('refund-ref-123-')
    );
    expect(Notification.updateOne).toHaveBeenCalledWith(
      {
        _id: 'n-stuck-refund-1',
        status: { $in: ['queued', 'processing'] },
      },
      {
        $set: {
          status: 'failed',
          errorMessage: 'WATCHDOG_RESET_STUCK_LEASE',
        },
      }
    );
  });

  // Test 3C: Stuck Event Cancellation Notification Repair
  it('should recover stuck event cancellation notifications independently of booking confirmed status', async () => {
    const mockNotification = {
      _id: 'n-stuck-cancel-1',
      bookingId: 'b-cancel-stuck',
      status: 'queued',
      type: NotificationType.EVENT_CANCELLED,
      jobId: 'cancellation-MAD-2026-timestamp',
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    };
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([mockNotification]) as any);

    vi.mocked(Booking.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'b-cancel-stuck',
      bookingId: 'MAD-2026-CANCEL',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.CANCELLED,
    }) as any);

    vi.mocked(Event.findById).mockReturnValue(mockCreateMockQuery({
      _id: 'e-123',
      title: 'Event Title',
      venue: 'Event Venue',
      startDate: new Date(),
    }) as any);

    vi.mocked(QueueService.enqueue).mockResolvedValue(undefined);
    vi.mocked(Notification.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const count = await (ConsistencyService as any).repairStuckNotifications();

    expect(count).toBe(1);
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'notification-queue-test',
      'email-dispatch',
      expect.objectContaining({
        to: 'guest@example.com',
        notificationType: NotificationType.EVENT_CANCELLED,
        bookingId: 'b-cancel-stuck',
      }),
      expect.stringContaining('cancellation-MAD-2026-CANCEL-')
    );
  });

  // Test 4: Orphaned Confirmed Deliveries - Successful repair & final sent verification
  it('should repair orphaned confirmed deliveries only if tickets exist and no sent notification exists', async () => {
    const mockBooking = {
      _id: 'b-orphaned-1',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.CONFIRMED,
      totalTickets: 2,
    };
    vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([mockBooking]) as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(2);

    vi.mocked(Notification.exists)
      .mockResolvedValueOnce(false as any) // first call in loop
      .mockResolvedValueOnce(false as any); // final verification check

    const count = await (ConsistencyService as any).repairOrphanedConfirmedDeliveries();

    expect(count).toBe(1);
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'pdf-queue-test',
      'pdf:generate',
      {
        bookingId: 'b-orphaned-1',
        eventId: 'e-123',
        recipientEmail: 'guest@example.com',
        guestName: 'Guest User',
      },
      'pdf:generate:b-orphaned-1'
    );
  });

  // Test 5: Orphaned Confirmed Deliveries - Race condition check
  it('should skip repair if final sent check verification finds notification was completed concurrently', async () => {
    const mockBooking = {
      _id: 'b-orphaned-2',
      eventId: 'e-123',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      status: BookingStatus.CONFIRMED,
      totalTickets: 2,
    };
    vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([mockBooking]) as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(2);

    vi.mocked(Notification.exists)
      .mockResolvedValueOnce(false as any) // first check
      .mockResolvedValueOnce(true as any); // final check

    const count = await (ConsistencyService as any).repairOrphanedConfirmedDeliveries();

    expect(count).toBe(0);
    expect(QueueService.enqueue).not.toHaveBeenCalled();
  });

  // Test 6: Report metrics
  it('should fetch correct report drift metrics for pipeline faults', async () => {
    vi.mocked(Notification.countDocuments).mockResolvedValue(4);
    const mockBooking = { _id: 'b-orph-3', totalTickets: 1 };
    vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([mockBooking]) as any);
    vi.mocked(Ticket.countDocuments).mockResolvedValue(1);
    vi.mocked(Notification.exists).mockResolvedValue(false as any);

    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([]));

    const report = await ConsistencyService.generateReport();

    expect(report.drift.stuckNotifications).toBe(4);
    expect(report.drift.orphanedConfirmedDeliveries).toBe(1);
  });

  // Test 7: Integration in runRepairCycle
  it('should execute pipeline watchdog repair methods in runRepairCycle', async () => {
    const stuckSpy = vi.spyOn(ConsistencyService as any, 'repairStuckNotifications').mockResolvedValue(5);
    const orphanedSpy = vi.spyOn(ConsistencyService as any, 'repairOrphanedConfirmedDeliveries').mockResolvedValue(7);

    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);

    const report = await ConsistencyService.runRepairCycle();

    expect(stuckSpy).toHaveBeenCalled();
    expect(orphanedSpy).toHaveBeenCalled();
    expect(report.repairs?.resetStuckNotifications).toBe(5);
    expect(report.repairs?.reEnqueuedOrphanedDeliveries).toBe(7);

    stuckSpy.mockRestore();
    orphanedSpy.mockRestore();
  });
});

describe('ConsistencyService - Paid Payment Recovery Watchdog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should count paid payment mismatches correctly', async () => {
    const mockPayments = [
      { _id: 'pay-1', bookingId: 'b-1' },
      { _id: 'pay-2', bookingId: 'b-2' },
    ];
    vi.mocked(Payment.find).mockReturnValue(mockCreateMockQuery(mockPayments) as any);
    vi.mocked(Booking.findById)
      .mockReturnValueOnce(mockCreateMockQuery({ status: BookingStatus.AWAITING_PAYMENT }) as any) // pay-1
      .mockReturnValueOnce(mockCreateMockQuery({ status: BookingStatus.CONFIRMED }) as any); // pay-2

    const count = await (ConsistencyService as any).countPaidPaymentMismatches();
    expect(count).toBe(1);
    expect(Payment.find).toHaveBeenCalled();
  });

  it('should attempt recovery (confirmBooking) for Case A and succeed', async () => {
    const mockPayment = {
      _id: 'pay-1',
      bookingId: 'b-1',
      status: PaymentStatus.PAID,
      amount: 100,
      save: vi.fn(),
    };
    const mockBooking = {
      _id: 'b-1',
      status: BookingStatus.AWAITING_PAYMENT,
    };
    vi.mocked(Payment.find).mockReturnValue(mockCreateMockQuery([mockPayment]) as any);
    vi.mocked(Booking.findById)
      .mockReturnValueOnce(mockCreateMockQuery(mockBooking) as any) // first find in loop
      .mockReturnValueOnce(mockCreateMockQuery({ status: BookingStatus.CONFIRMED }) as any); // check after confirmation

    vi.mocked(PaymentService.confirmBooking).mockResolvedValue({ status: BookingStatus.CONFIRMED } as any);

    const repaired = await (ConsistencyService as any).repairPaidPaymentMismatches();
    expect(repaired).toBe(1);
    expect(PaymentService.confirmBooking).toHaveBeenCalledWith(mockBooking, mockPayment);
    expect(PaymentService.triggerRefundRequest).not.toHaveBeenCalled();
    expect(mockPayment.save).not.toHaveBeenCalled();
  });

  it('should handle Case B (recovery fails/capacity exhausted) by failing payment and requesting refund', async () => {
    const mockPayment = {
      _id: 'pay-1',
      bookingId: 'b-1',
      status: PaymentStatus.PAID,
      amount: 100,
      save: vi.fn().mockResolvedValue(undefined),
    };
    const mockBooking = {
      _id: 'b-1',
      status: BookingStatus.AWAITING_PAYMENT,
    };
    vi.mocked(Payment.find).mockReturnValue(mockCreateMockQuery([mockPayment]) as any);
    vi.mocked(Booking.findById)
      .mockReturnValueOnce(mockCreateMockQuery(mockBooking) as any) // first find in loop
      .mockReturnValueOnce(mockCreateMockQuery({ status: BookingStatus.AWAITING_PAYMENT }) as any); // check after confirmation (still awaiting payment)

    vi.mocked(PaymentService.confirmBooking).mockResolvedValue(null as any); // confirmBooking returns null/falsy

    const repaired = await (ConsistencyService as any).repairPaidPaymentMismatches();
    expect(repaired).toBe(1);
    expect(PaymentService.confirmBooking).toHaveBeenCalledWith(mockBooking, mockPayment);
    expect(mockPayment.status).toBe(PaymentStatus.FAILED);
    expect(mockPayment.failureReason).toBe('LATE_PAYMENT_RECOVERY_REJECTED');
    expect(mockPayment.save).toHaveBeenCalled();
    expect(PaymentService.triggerRefundRequest).toHaveBeenCalledWith(mockBooking, mockPayment, 'LATE_PAYMENT_RECOVERY_REJECTED');
  });

  it('should handle Case C (booking already unrecoverable cancelled/failed) by failing payment and requesting refund', async () => {
    const mockPayment = {
      _id: 'pay-1',
      bookingId: 'b-1',
      status: PaymentStatus.PAID,
      amount: 100,
      save: vi.fn().mockResolvedValue(undefined),
    };
    const mockBooking = {
      _id: 'b-1',
      status: BookingStatus.CANCELLED,
    };
    vi.mocked(Payment.find).mockReturnValue(mockCreateMockQuery([mockPayment]) as any);
    vi.mocked(Booking.findById).mockReturnValue(mockCreateMockQuery(mockBooking) as any);

    const repaired = await (ConsistencyService as any).repairPaidPaymentMismatches();
    expect(repaired).toBe(1);
    expect(PaymentService.confirmBooking).not.toHaveBeenCalled();
    expect(mockPayment.status).toBe(PaymentStatus.FAILED);
    expect(mockPayment.failureReason).toBe('BOOKING_UNRECOVERABLE');
    expect(mockPayment.save).toHaveBeenCalled();
    expect(PaymentService.triggerRefundRequest).toHaveBeenCalledWith(mockBooking, mockPayment, 'BOOKING_UNRECOVERABLE');
  });
});

describe('ConsistencyService - Stuck Processing, Notifications, Optimistic Locking, and Stale Seats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset stuck processing refunds back to requested status', async () => {
    const mockRefund = {
      _id: 'ref-stuck-1',
      paymentId: 'pay-1',
      bookingId: 'book-1',
      amount: 100,
    };

    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([mockRefund]) as any);
    vi.mocked(Refund.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const resetCount = await (ConsistencyService as any).repairStuckProcessingRefunds();
    expect(resetCount).toBe(1);
    expect(Refund.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'processing',
        updatedAt: { $lte: expect.any(Date) }
      })
    );
    expect(Refund.updateOne).toHaveBeenCalledWith(
      { _id: 'ref-stuck-1', status: 'processing' },
      { $set: { status: 'requested' } }
    );
  });

  it('should recover orphaned completed refund notifications', async () => {
    const mockRefund = {
      _id: 'ref-orph-1',
      bookingId: 'book-orph-1',
      paymentId: 'pay-orph-1',
      amount: 150,
      processedAt: new Date(),
    };

    vi.mocked(Refund.find).mockImplementation((filter: any) => {
      if (filter.status === 'completed') {
        return mockCreateMockQuery([mockRefund]);
      }
      return mockCreateMockQuery([]);
    });

    vi.mocked(Notification.exists).mockResolvedValue(false as any);

    const mockBooking = {
      _id: 'book-orph-1',
      bookingId: 'MAD-REF-1',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      totalAmount: 300,
      eventId: 'event-1',
      currency: 'INR',
    };
    vi.mocked(Booking.findById).mockReturnValue({
      populate: vi.fn().mockResolvedValue(mockBooking)
    } as any);

    const mockPayment = {
      _id: 'pay-orph-1',
      amount: 300,
    };
    (Payment as any).findById = vi.fn().mockResolvedValue(mockPayment);

    const mockEvent = {
      _id: 'event-1',
      title: 'MAD Concert',
    };
    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

    const count = await (ConsistencyService as any).repairOrphanedRefundNotifications();
    expect(count).toBe(1);
    expect(Notification.exists).toHaveBeenCalledWith({
      bookingId: 'book-orph-1',
      jobId: { $regex: '^refund-ref-orph-1' }
    });
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'notification-queue-test',
      'email-dispatch',
      expect.objectContaining({
        to: 'guest@example.com',
        notificationType: NotificationType.PARTIAL_REFUND,
      }),
      'refund-ref-orph-1-retry'
    );
  });

  it('should recover orphaned cancellation notifications', async () => {
    const mockBooking = {
      _id: 'book-cancel-1',
      bookingId: 'MAD-CANCEL-1',
      guestEmail: 'guest@example.com',
      guestName: 'Guest User',
      eventId: 'event-1',
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
    };

    vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([mockBooking]) as any);
    vi.mocked(Notification.exists).mockResolvedValue(false as any);

    const mockEvent = {
      _id: 'event-1',
      title: 'MAD Concert',
      startDate: new Date(),
      venue: 'Arena 1',
    };
    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

    const count = await (ConsistencyService as any).repairOrphanedCancellationNotifications();
    expect(count).toBe(1);
    expect(Notification.exists).toHaveBeenCalledWith({
      bookingId: 'book-cancel-1',
      type: NotificationType.EVENT_CANCELLED,
    });
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'notification-queue-test',
      'email-dispatch',
      expect.objectContaining({
        to: 'guest@example.com',
        notificationType: NotificationType.EVENT_CANCELLED,
      }),
      'cancellation-MAD-CANCEL-1-retry'
    );
  });

  const setupInventoryRepairCycle = ({
    event,
    soldTotal,
    reservedTotal = 0,
    confirmedBookingDocs = [],
    updateResult = { modifiedCount: 1 },
  }: {
    event: any;
    soldTotal: number;
    reservedTotal?: number;
    confirmedBookingDocs?: any[];
    updateResult?: { modifiedCount: number };
  }) => {
    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([event]) as any);
    (Booking as any).aggregate = vi.fn().mockResolvedValue([{ total: soldTotal }]);
    (Reservation as any).aggregate = vi.fn().mockResolvedValue([{ total: reservedTotal }]);
    vi.mocked(Booking.find).mockImplementation((filter: any) => {
      if (filter?.eventId === event._id && filter?.status === BookingStatus.CONFIRMED) {
        return mockCreateMockQuery(confirmedBookingDocs);
      }
      return mockCreateMockQuery([]);
    });
    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);

    const mockEventUpdateOne = vi.fn().mockResolvedValue(updateResult);
    (Event as any).updateOne = mockEventUpdateOne;

    return mockEventUpdateOne;
  };

  it('should execute event inventory repair and handle optimistic lock conflicts', async () => {
    // 1. Setup mock Event that needs repair
    const mockEvent = {
      _id: 'event-inv-1',
      soldCount: 5,
      reservedCount: 2,
      totalCapacity: 20,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 3 }],
      eventVersion: 1,
    };

    // Aggregate calls inside repairEventInventoryMismatches: confirmedBookings & activeReservations
    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([mockEvent]) as any);
    (Booking as any).aggregate = vi.fn().mockResolvedValue([{ total: 10 }]);
    (Reservation as any).aggregate = vi.fn().mockResolvedValue([{ total: 5 }]);
    vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([{ tickets: [{ tier: 'general', quantity: 10 }] }]) as any);

    // Mock other watchdog queries to return empty arrays to avoid running other checks
    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Booking.find).mockImplementation((filter: any) => {
      // For general bookings query inside other watchdogs
      if (filter && filter.status && filter.status.$in) {
        return mockCreateMockQuery([]);
      }
      return mockCreateMockQuery([{ tickets: [{ tier: 'general', quantity: 10 }] }]);
    });

    // Mock count / stats queries for generateReport
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);

    // Dynamic mock for Event.updateOne
    const mockEventUpdateOne = vi.fn()
      .mockResolvedValueOnce({ modifiedCount: 0 }) // Conflict first
      .mockResolvedValueOnce({ modifiedCount: 1 }); // Success second

    (Event as any).updateOne = mockEventUpdateOne;

    // First cycle run: conflict scenario
    const report1 = await ConsistencyService.runRepairCycle();
    expect(report1.repairs?.eventInventoryMismatchesRepaired).toBe(0);
    expect(mockEventUpdateOne).toHaveBeenCalledWith(
      { _id: 'event-inv-1', eventVersion: 1 },
      expect.objectContaining({
        $set: expect.objectContaining({ soldCount: 10, reservedCount: 5, isSoldOut: false }),
        $inc: { eventVersion: 1 }
      })
    );

    // Second cycle run: success scenario
    const report2 = await ConsistencyService.runRepairCycle();
    expect(report2.repairs?.eventInventoryMismatchesRepaired).toBe(1);
  });

  it('should repair isSoldOut to true when sold count exhausts capacity', async () => {
    const mockEvent = {
      _id: 'event-sold-out-true',
      soldCount: 10,
      reservedCount: 0,
      totalCapacity: 10,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 10 }],
      eventVersion: 1,
    };

    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([mockEvent]) as any);
    (Booking as any).aggregate = vi.fn().mockResolvedValue([{ total: 10 }]);
    (Reservation as any).aggregate = vi.fn().mockResolvedValue([{ total: 0 }]);
    vi.mocked(Booking.find).mockImplementation((filter: any) => {
      if (filter && filter.status && filter.status.$in) {
        return mockCreateMockQuery([]);
      }
      return mockCreateMockQuery([{ tickets: [{ tier: 'general', quantity: 10 }] }]);
    });
    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);

    const mockEventUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    (Event as any).updateOne = mockEventUpdateOne;

    const report = await ConsistencyService.runRepairCycle();

    expect(report.repairs?.eventInventoryMismatchesRepaired).toBe(1);
    expect(mockEventUpdateOne).toHaveBeenCalledWith(
      { _id: 'event-sold-out-true', eventVersion: 1 },
      expect.objectContaining({
        $set: expect.objectContaining({ isSoldOut: true }),
      })
    );
  });

  it('should repair isSoldOut to false when sold count is below capacity', async () => {
    const mockEvent = {
      _id: 'event-sold-out-false',
      soldCount: 9,
      reservedCount: 0,
      totalCapacity: 10,
      isSoldOut: true,
      ticketTiers: [{ tier: 'general', soldCount: 9 }],
      eventVersion: 1,
    };

    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([mockEvent]) as any);
    (Booking as any).aggregate = vi.fn().mockResolvedValue([{ total: 9 }]);
    (Reservation as any).aggregate = vi.fn().mockResolvedValue([{ total: 0 }]);
    vi.mocked(Booking.find).mockImplementation((filter: any) => {
      if (filter && filter.status && filter.status.$in) {
        return mockCreateMockQuery([]);
      }
      return mockCreateMockQuery([{ tickets: [{ tier: 'general', quantity: 9 }] }]);
    });
    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);

    const mockEventUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    (Event as any).updateOne = mockEventUpdateOne;

    const report = await ConsistencyService.runRepairCycle();

    expect(report.repairs?.eventInventoryMismatchesRepaired).toBe(1);
    expect(mockEventUpdateOne).toHaveBeenCalledWith(
      { _id: 'event-sold-out-false', eventVersion: 1 },
      expect.objectContaining({
        $set: expect.objectContaining({ isSoldOut: false }),
      })
    );
  });

  it('should not throw and should emit logger.warn when a booking has tickets: undefined (malformed document)', async () => {
    const { logger } = await import('../utils/logger');

    const mockEvent = {
      _id: 'event-corrupt-1',
      soldCount: 5,
      reservedCount: 0,
      totalCapacity: 20,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 5 }],
      eventVersion: 1,
    };

    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([mockEvent]) as any);
    (Booking as any).aggregate = vi.fn().mockResolvedValue([{ total: 10 }]);
    (Reservation as any).aggregate = vi.fn().mockResolvedValue([{ total: 0 }]);

    // Simulate a malformed document from .lean() — tickets field is missing/undefined
    const malformedBookingDoc = {
      _id: 'b-corrupt-1',
      bookingId: 'MAD-2026-CORRUPT',
      tickets: undefined,
    };
    vi.mocked(Booking.find).mockImplementation((filter: any) => {
      if (filter && filter.status && filter.status.$in) {
        return mockCreateMockQuery([]);
      }
      return mockCreateMockQuery([malformedBookingDoc]);
    });

    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);
    (Event as any).updateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });

    // Should not throw despite the malformed document
    const report = await expect(ConsistencyService.runRepairCycle()).resolves.toBeDefined();

    // Warning must have been emitted with booking identifiers
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 'b-corrupt-1',
        bookingRef: 'MAD-2026-CORRUPT',
        ticketsType: 'undefined',
      }),
      expect.stringContaining('invalid tickets structure')
    );
  });

  it('repairs stale isSoldOut true to false when capacity is available', async () => {
    const event = {
      _id: 'event-stale-true',
      soldCount: 9,
      reservedCount: 0,
      totalCapacity: 10,
      isSoldOut: true,
      ticketTiers: [{ tier: 'general', soldCount: 9 }],
      eventVersion: 3,
    };
    const updateOne = setupInventoryRepairCycle({
      event,
      soldTotal: 9,
      confirmedBookingDocs: [{ tickets: [{ tier: 'general', quantity: 9 }] }],
    });

    const report = await ConsistencyService.runRepairCycle();

    expect(report.repairs?.eventInventoryMismatchesRepaired).toBe(1);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'event-stale-true', eventVersion: 3 },
      expect.objectContaining({
        $set: expect.objectContaining({ isSoldOut: false, soldCount: 9, reservedCount: 0 }),
        $inc: { eventVersion: 1 },
      })
    );
  });

  it('repairs stale isSoldOut false to true when sold count reaches capacity', async () => {
    const event = {
      _id: 'event-stale-false',
      soldCount: 10,
      reservedCount: 0,
      totalCapacity: 10,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 10 }],
      eventVersion: 4,
    };
    const updateOne = setupInventoryRepairCycle({
      event,
      soldTotal: 10,
      confirmedBookingDocs: [{ tickets: [{ tier: 'general', quantity: 10 }] }],
    });

    const report = await ConsistencyService.runRepairCycle();

    expect(report.repairs?.eventInventoryMismatchesRepaired).toBe(1);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'event-stale-false', eventVersion: 4 },
      expect.objectContaining({
        $set: expect.objectContaining({ isSoldOut: true, soldCount: 10, reservedCount: 0 }),
        $inc: { eventVersion: 1 },
      })
    );
  });

  it('is idempotent when rerun after isSoldOut reconciliation', async () => {
    const staleEvent = {
      _id: 'event-idempotent',
      soldCount: 10,
      reservedCount: 0,
      totalCapacity: 10,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 10 }],
      eventVersion: 2,
    };
    const repairedEvent = {
      ...staleEvent,
      isSoldOut: true,
      eventVersion: 3,
    };

    vi.mocked(Event.find)
      .mockReturnValueOnce(mockCreateMockQuery([staleEvent]) as any)
      .mockReturnValueOnce(mockCreateMockQuery([staleEvent]) as any)
      .mockReturnValueOnce(mockCreateMockQuery([repairedEvent]) as any)
      .mockReturnValueOnce(mockCreateMockQuery([repairedEvent]) as any);
    (Booking as any).aggregate = vi.fn().mockResolvedValue([{ total: 10 }]);
    (Reservation as any).aggregate = vi.fn().mockResolvedValue([{ total: 0 }]);
    vi.mocked(Booking.find).mockImplementation((filter: any) => {
      if (filter?.eventId === 'event-idempotent' && filter?.status === BookingStatus.CONFIRMED) {
        return mockCreateMockQuery([{ tickets: [{ tier: 'general', quantity: 10 }] }]);
      }
      return mockCreateMockQuery([]);
    });
    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Notification.find).mockReturnValue(mockCreateMockQuery([]) as any);
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);
    const updateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    (Event as any).updateOne = updateOne;

    const firstReport = await ConsistencyService.runRepairCycle();
    const secondReport = await ConsistencyService.runRepairCycle();

    expect(firstReport.repairs?.eventInventoryMismatchesRepaired).toBe(1);
    expect(secondReport.repairs?.eventInventoryMismatchesRepaired).toBe(0);
    expect(updateOne).toHaveBeenCalledTimes(1);
  });

  it('clears sold-out state after capacity increases above sold count', async () => {
    const event = {
      _id: 'event-capacity-increase',
      soldCount: 100,
      reservedCount: 0,
      totalCapacity: 150,
      isSoldOut: true,
      ticketTiers: [{ tier: 'general', soldCount: 100 }],
      eventVersion: 7,
    };
    const updateOne = setupInventoryRepairCycle({
      event,
      soldTotal: 100,
      confirmedBookingDocs: [{ tickets: [{ tier: 'general', quantity: 100 }] }],
    });

    await ConsistencyService.runRepairCycle();

    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'event-capacity-increase', eventVersion: 7 },
      expect.objectContaining({
        $set: expect.objectContaining({ isSoldOut: false }),
      })
    );
  });

  it('keeps sold-out state after cancellation when sold count still meets capacity', async () => {
    const event = {
      _id: 'event-cancel-recalc',
      soldCount: 120,
      reservedCount: 0,
      totalCapacity: 100,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 120 }],
      eventVersion: 8,
    };
    const updateOne = setupInventoryRepairCycle({
      event,
      soldTotal: 120,
      confirmedBookingDocs: [{ tickets: [{ tier: 'general', quantity: 120 }] }],
    });

    await ConsistencyService.runRepairCycle();

    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'event-cancel-recalc', eventVersion: 8 },
      expect.objectContaining({
        $set: expect.objectContaining({ isSoldOut: true }),
      })
    );
  });

  it('does not repair inventory when isSoldOut already matches sold count and capacity', async () => {
    const event = {
      _id: 'event-noop',
      soldCount: 5,
      reservedCount: 0,
      totalCapacity: 10,
      isSoldOut: false,
      ticketTiers: [{ tier: 'general', soldCount: 5 }],
      eventVersion: 9,
    };
    const updateOne = setupInventoryRepairCycle({
      event,
      soldTotal: 5,
      confirmedBookingDocs: [{ tickets: [{ tier: 'general', quantity: 5 }] }],
    });

    const report = await ConsistencyService.runRepairCycle();

    expect(report.repairs?.eventInventoryMismatchesRepaired).toBe(0);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('should reclaim stale seat locks without the 24-hour window constraint', async () => {
    const mockReservation = {
      _id: 'res-stale-1',
      eventId: 'event-1',
      seatId: 'seat-A1',
      reservationId: 'res-abc',
    };

    vi.mocked(Reservation.find).mockReturnValue(mockCreateMockQuery([mockReservation]) as any);
    vi.mocked(SeatLayout.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    // Mock other watchdog queries to return empty/0
    vi.mocked(Event.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Refund.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Booking.find).mockReturnValue(mockCreateMockQuery([]));
    vi.mocked(Reservation.countDocuments).mockResolvedValue(0);
    vi.mocked(Booking.countDocuments).mockResolvedValue(0);
    vi.mocked(Payment.countDocuments).mockResolvedValue(0);
    vi.mocked(Notification.countDocuments).mockResolvedValue(0);

    const report = await ConsistencyService.runRepairCycle();
    expect(report.repairs?.staleSeatReservations).toBe(1);
    expect(Reservation.find).toHaveBeenCalledWith({
      status: { $in: [ReservationStatus.EXPIRED, ReservationStatus.FAILED, ReservationStatus.CANCELLED] },
      seatId: { $exists: true },
    });
    expect(SeatLayout.updateOne).toHaveBeenCalledWith(
      { eventId: 'event-1' },
      expect.objectContaining({
        $set: { 'seats.$[seat].status': SeatStatus.AVAILABLE },
      }),
      expect.objectContaining({
        arrayFilters: [{
          'seat.seatId': 'seat-A1',
          'seat.status': SeatStatus.LOCKED,
          'seat.reservationId': 'res-abc',
        }]
      })
    );
  });
});
