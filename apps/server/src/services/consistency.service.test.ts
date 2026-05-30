import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsistencyService } from './consistency.service';
import { BookingStatus, ReservationStatus, SeatStatus } from '@mad/shared';
import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { SeatLayout } from '../models/seat-layout.schema';
import { ReservationService } from './reservation.service';

vi.mock('../models/booking.schema', () => ({
  Booking: {
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
  },
}));

vi.mock('../models/seat-layout.schema', () => ({
  SeatLayout: {
    updateOne: vi.fn(),
  },
}));

vi.mock('./reservation.service', () => ({
  ReservationService: {
    transitionForBooking: vi.fn().mockResolvedValue([]),
    releaseCapacityForTerminalReservations: vi.fn().mockResolvedValue([]),
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
