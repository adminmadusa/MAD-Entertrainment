import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, ReservationStatus, SeatStatus } from '@mad/shared';

import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { Payment } from '../models/payment.schema';
import { Reservation } from '../models/reservation.schema';
import { SeatLayout } from '../models/seat-layout.schema';
import { Ticket } from '../models/ticket.schema';
import { ConsistencyService } from './consistency.service';
import { BookingConsistencyService } from './consistency/booking-consistency.service';
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
