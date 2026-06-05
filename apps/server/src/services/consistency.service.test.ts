import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsistencyService } from './consistency.service';
import { BookingStatus, PaymentStatus, ReservationStatus, SeatStatus } from '@mad/shared';
import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { SeatLayout } from '../models/seat-layout.schema';
import { ReservationService } from './reservation.service';
import { Ticket } from '../models/ticket.schema';
import { QueueService } from './queue.service';
import { Reservation } from '../models/reservation.schema';
import { Payment } from '../models/payment.schema';
import { Notification } from '../models/notification.schema';
import { PaymentService } from './public/payment.service';

vi.mock('./public/payment.service', () => ({
  PaymentService: {
    confirmBooking: vi.fn(),
    triggerRefundRequest: vi.fn(),
  },
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
      status: BookingStatus.EXPIRING,
      tickets: [{ seats: [{ seatId: 'seat-A1' }] }],
      bookingVersion: 2,
    };

    vi.mocked(Booking.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockCandidate]),
      }),
    } as any);

    vi.mocked(Booking.findOneAndUpdate).mockResolvedValue(mockBooking as any);
    vi.mocked(Event.findById).mockResolvedValue({ _id: 'e-123', bookingMode: 'seat_based' } as any);
    vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([{ reservationId: 'r-123', quantity: 2 }] as any);

    const expiredCount = await ConsistencyService.expireStaleBookings();

    expect(expiredCount).toBe(1);
    expect(Booking.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'b-expired', status: BookingStatus.AWAITING_PAYMENT },
      { $set: { status: BookingStatus.EXPIRING }, $inc: { bookingVersion: 1 } },
      { new: true }
    );
    expect(Booking.updateOne).toHaveBeenCalledWith(
      { _id: 'b-expired', status: BookingStatus.EXPIRING },
      { $set: { status: BookingStatus.EXPIRED } }
    );

    expect(ReservationService.transitionForBooking).toHaveBeenCalledWith(
      'b-expired',
      ReservationStatus.FAILED,
      expect.objectContaining({ reason: 'booking-logical-checkout-timeout' })
    );
    expect(ReservationService.releaseCapacityForTerminalReservations).toHaveBeenCalledWith([{ reservationId: 'r-123', quantity: 2 }]);
    expect(SeatLayout.updateOne).toHaveBeenCalledWith(
      { eventId: 'e-123' },
      expect.objectContaining({
        $set: { 'seats.$[seat].status': SeatStatus.AVAILABLE },
      }),
      expect.objectContaining({
        arrayFilters: [{
          'seat.seatId': { $in: ['seat-A1'] },
          'seat.status': SeatStatus.LOCKED,
          'seat.bookedByBookingId': 'b-expired',
        }],
      })
    );
  });

  it('should prevent multiple concurrent workers from double-expiring the same booking (Atomic Claim Scenario)', async () => {
    const mockCandidate = { _id: 'b-concurrent' };
    const mockBooking = {
      _id: 'b-concurrent',
      bookingId: 'MAD-2026-CONC',
      eventId: 'e-123',
      status: BookingStatus.EXPIRING,
      tickets: [{ seats: [] }],
      bookingVersion: 2,
    };

    // Both workers find the same candidate ID
    vi.mocked(Booking.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockCandidate]),
      }),
    } as any);

    // Worker A succeeds in claiming the booking
    vi.mocked(Booking.findOneAndUpdate)
      .mockResolvedValueOnce(mockBooking as any) // Worker A gets the booking
      .mockResolvedValueOnce(null);              // Worker B gets null (already claimed)

    vi.mocked(Event.findById).mockResolvedValue({ _id: 'e-123', bookingMode: 'general_admission' } as any);
    vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([{ reservationId: 'r-abc', quantity: 1 }] as any);

    // Simulate two concurrent worker executions running in parallel
    const [workerAResult, workerBResult] = await Promise.all([
      ConsistencyService.expireStaleBookings(),
      ConsistencyService.expireStaleBookings()
    ]);

    // Worker A successfully processed exactly 1 expired booking
    expect(workerAResult).toBe(1);
    // Worker B skipped the booking and processed exactly 0
    expect(workerBResult).toBe(0);

    // Assert that the database update transitions were only executed ONCE by Worker A
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

    const expiredCount = await ConsistencyService.expireStaleBookings();

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

    const reEnqueued = await (ConsistencyService as any).repairUnticketedConfirmedBookings();

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

    const reEnqueued = await (ConsistencyService as any).repairUnticketedConfirmedBookings();

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

    const reEnqueued = await (ConsistencyService as any).repairUnticketedConfirmedBookings();

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

    const reEnqueued = await (ConsistencyService as any).repairUnticketedConfirmedBookings();

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

    const count = await (ConsistencyService as any).countUnticketedConfirmedBookings();

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

    const reEnqueued = await (ConsistencyService as any).repairUnticketedConfirmedBookings();

    expect(reEnqueued).toBe(0);
    expect(Ticket.countDocuments).not.toHaveBeenCalled();
    expect(QueueService.enqueue).not.toHaveBeenCalled();
  });

  // Test 7 — runRepairCycle integrates the new watchdog
  it('should integrate the new watchdog into runRepairCycle', async () => {
    const repairSpy = vi.spyOn(ConsistencyService as any, 'repairUnticketedConfirmedBookings').mockResolvedValue(3);
    const countSpy = vi.spyOn(ConsistencyService as any, 'countUnticketedConfirmedBookings').mockResolvedValue(2);

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

    await (ConsistencyService as any).repairUnticketedConfirmedBookings();

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

    const reEnqueued = await (ConsistencyService as any).repairUnticketedConfirmedBookings();
 
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

