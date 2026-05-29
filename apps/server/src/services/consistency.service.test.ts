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

describe('ConsistencyService - expireStaleBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transition stale bookings to EXPIRED and release inventory and locked seats', async () => {
    const mockSave = vi.fn();
    const mockBooking = {
      _id: 'b-expired',
      bookingId: 'MAD-2026-STALE',
      eventId: 'e-123',
      status: BookingStatus.AWAITING_PAYMENT,
      tickets: [{ seats: [{ seatId: 'seat-A1' }] }],
      bookingVersion: 1,
      save: mockSave,
    };

    vi.mocked(Booking.find).mockReturnValue({
      limit: vi.fn().mockResolvedValue([mockBooking]),
    } as any);
    vi.mocked(Event.findById).mockResolvedValue({ _id: 'e-123', bookingMode: 'seat_based' } as any);
    vi.mocked(ReservationService.transitionForBooking).mockResolvedValue([{ reservationId: 'r-123' }] as any);

    const expiredCount = await ConsistencyService.expireStaleBookings();

    expect(expiredCount).toBe(1);
    expect(mockBooking.status).toBe(BookingStatus.EXPIRED);
    expect(mockBooking.bookingVersion).toBe(2);
    expect(mockSave).toHaveBeenCalledTimes(1);

    expect(ReservationService.transitionForBooking).toHaveBeenCalledWith(
      'b-expired',
      ReservationStatus.FAILED,
      expect.objectContaining({ reason: 'booking-logical-checkout-timeout' })
    );
    expect(ReservationService.releaseCapacityForTerminalReservations).toHaveBeenCalledWith([{ reservationId: 'r-123' }]);
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
});
