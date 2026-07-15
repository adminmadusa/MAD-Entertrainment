import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus, ReservationStatus } from '@mad/shared';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'test_secret',
    JWT_ADMIN_SECRET: 'test_admin_secret',
    JWT_SESSION_SECRET: 'test_session_secret',
    MOCK_PAYMENTS: false,
  })),
}));

import { emitToEvent, emitToBooking, emitToAdmin } from '../../config/socket';
import { Event } from '../../models/event.schema';
import { Reservation } from '../../models/reservation.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { ReservationService } from '../reservation.service';
import { PaymentInventoryService } from './payment-inventory.service';

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
  },
}));

vi.mock('../../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../../models/seat-layout.schema', () => ({
  SeatLayout: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../../models/reservation.schema', () => ({
  Reservation: {
    aggregate: vi.fn(),
  },
}));

vi.mock('../reservation.service', () => ({
  ReservationService: {
    transitionForBooking: vi.fn(),
    releaseCapacityForTerminalReservations: vi.fn(),
  },
}));

vi.mock('../../config/socket', () => ({
  emitToEvent: vi.fn(),
  emitToBooking: vi.fn(),
  emitToAdmin: vi.fn(),
}));

describe('PaymentInventoryService', () => {
  let mockSession: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = {} as any;
  });

  describe('validateLateRecoveryCapacity', () => {
    it('passes validation when general, tier, and seat capacity are available', async () => {
      const mockBooking: any = {
        totalTickets: 2,
        tickets: [{ tier: 'tier_1', quantity: 2 }],
      };
      const mockEvent: any = {
        _id: new Types.ObjectId(),
        soldCount: 10,
        reservedCount: 5,
        totalCapacity: 20,
        ticketTiers: [{ tier: 'tier_1', soldCount: 5, totalCapacity: 10, groupSize: 1 }],
      };

      vi.mocked(Reservation.aggregate).mockReturnValue({
        session: vi.fn().mockResolvedValue([{ total: 1 }]),
      } as any);

      await expect(
        PaymentInventoryService.validateLateRecoveryCapacity(mockBooking, mockEvent, [], mockSession)
      ).resolves.not.toThrow();
    });

    it('throws EVENT_EXPIRED_DURING_CONFIRMATION if general capacity is exceeded', async () => {
      const mockBooking: any = {
        totalTickets: 6,
        tickets: [{ tier: 'tier_1', quantity: 6 }],
      };
      const mockEvent: any = {
        _id: new Types.ObjectId(),
        soldCount: 10,
        reservedCount: 5,
        totalCapacity: 20,
        ticketTiers: [{ tier: 'tier_1', soldCount: 5, totalCapacity: 10, groupSize: 1 }],
      };

      await expect(
        PaymentInventoryService.validateLateRecoveryCapacity(mockBooking, mockEvent, [], mockSession)
      ).rejects.toThrow('EVENT_EXPIRED_DURING_CONFIRMATION');
    });

    it('throws EVENT_EXPIRED_DURING_CONFIRMATION if tier capacity is exceeded', async () => {
      const mockBooking: any = {
        totalTickets: 2,
        tickets: [{ tier: 'tier_1', quantity: 2 }],
      };
      const mockEvent: any = {
        _id: new Types.ObjectId(),
        soldCount: 10,
        reservedCount: 2,
        totalCapacity: 20,
        ticketTiers: [{ tier: 'tier_1', soldCount: 8, totalCapacity: 10, groupSize: 1 }],
      };

      vi.mocked(Reservation.aggregate).mockReturnValue({
        session: vi.fn().mockResolvedValue([{ total: 1 }]),
      } as any);

      await expect(
        PaymentInventoryService.validateLateRecoveryCapacity(mockBooking, mockEvent, [], mockSession)
      ).rejects.toThrow('EVENT_EXPIRED_DURING_CONFIRMATION');
    });

    it('throws SEAT_ALLOCATION_FAILED if seats are already taken', async () => {
      const mockBooking: any = {
        totalTickets: 2,
        tickets: [{ tier: 'tier_1', quantity: 2 }],
      };
      const mockEvent: any = {
        _id: new Types.ObjectId(),
        soldCount: 10,
        reservedCount: 2,
        totalCapacity: 20,
        bookingMode: 'seat_based',
        ticketTiers: [{ tier: 'tier_1', soldCount: 2, totalCapacity: 10, groupSize: 1 }],
      };

      vi.mocked(Reservation.aggregate).mockReturnValue({
        session: vi.fn().mockResolvedValue([{ total: 1 }]),
      } as any);

      vi.mocked(SeatLayout.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue({ _id: 'some_layout' }),
      } as any);

      await expect(
        PaymentInventoryService.validateLateRecoveryCapacity(mockBooking, mockEvent, ['seat_1'], mockSession)
      ).rejects.toThrow('SEAT_ALLOCATION_FAILED');
    });
  });

  describe('allocateSeats', () => {
    it('successfully updates SeatLayout status to BOOKED', async () => {
      const mockBooking: any = {
        _id: new Types.ObjectId(),
      };
      const mockEvent: any = {
        _id: new Types.ObjectId(),
        bookingMode: 'seat_based',
      };

      vi.mocked(SeatLayout.updateOne).mockResolvedValue({
        modifiedCount: 2,
      } as any);

      await expect(
        PaymentInventoryService.allocateSeats(mockBooking, mockEvent, ['seat_1', 'seat_2'], mockSession)
      ).resolves.not.toThrow();

      expect(SeatLayout.updateOne).toHaveBeenCalledWith(
        { eventId: mockEvent._id },
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('throws SEAT_ALLOCATION_FAILED if modifiedCount does not match seat count', async () => {
      const mockBooking: any = {
        _id: new Types.ObjectId(),
      };
      const mockEvent: any = {
        _id: new Types.ObjectId(),
        bookingMode: 'seat_based',
      };

      vi.mocked(SeatLayout.updateOne).mockResolvedValue({
        modifiedCount: 1,
      } as any);

      await expect(
        PaymentInventoryService.allocateSeats(mockBooking, mockEvent, ['seat_1', 'seat_2'], mockSession)
      ).rejects.toThrow('SEAT_ALLOCATION_FAILED');
    });
  });

  describe('allocateEventCapacity', () => {
    it('successfully updates event capacity with reservedCount decrement on normal flow', async () => {
      const mockBooking: any = {
        totalTickets: 2,
        tickets: [{ tier: 'tier_1', quantity: 2 }],
      };
      const mockEvent: any = {
        _id: new Types.ObjectId(),
        ticketTiers: [{ tier: 'tier_1', soldCount: 5, totalCapacity: 10, groupSize: 1 }],
      };

      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({
        _id: mockEvent._id,
      } as any);

      const result = await PaymentInventoryService.allocateEventCapacity(mockBooking, mockEvent, false, mockSession);
      expect(result).toBeDefined();
      expect(Event.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockEvent._id },
        {
          $inc: {
            soldCount: 2,
            eventVersion: 1,
            'ticketTiers.0.soldCount': 2,
            reservedCount: -2,
          },
        },
        { new: true, session: mockSession }
      );
    });

    it('throws EVENT_CAPACITY_ALLOCATION_FAILED if update query fails to return document', async () => {
      const mockBooking: any = {
        totalTickets: 2,
        tickets: [{ tier: 'tier_1', quantity: 2 }],
      };
      const mockEvent: any = {
        _id: new Types.ObjectId(),
        ticketTiers: [{ tier: 'tier_1', soldCount: 5, totalCapacity: 10, groupSize: 1 }],
      };

      vi.mocked(Event.findOneAndUpdate).mockResolvedValue(null as any);

      await expect(
        PaymentInventoryService.allocateEventCapacity(mockBooking, mockEvent, false, mockSession)
      ).rejects.toThrow('EVENT_CAPACITY_ALLOCATION_FAILED');
    });
  });

  describe('releaseInventoryForFailedPayment', () => {
    it('successfully releases reservations and seat layout locks', async () => {
      const mockBooking: any = {
        _id: new Types.ObjectId(),
        eventId: new Types.ObjectId(),
        status: BookingStatus.AWAITING_PAYMENT,
        bookingVersion: 1,
        save: vi.fn().mockResolvedValue(undefined),
        tickets: [{ seats: [{ seatId: 'seat_1' }] }],
      };
      const mockPayment: any = {
        _id: new Types.ObjectId(),
        gatewayPaymentId: 'pay_123',
      };

      vi.mocked(ReservationService.transitionForBooking).mockResolvedValue(['res_1'] as any);
      vi.mocked(Event.findById).mockResolvedValue({
        _id: mockBooking.eventId,
        bookingMode: 'seat_based',
      } as any);
      vi.mocked(SeatLayout.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      await expect(
        PaymentInventoryService.releaseInventoryForFailedPayment(mockBooking, mockPayment, 'payment failed')
      ).resolves.not.toThrow();

      expect(mockBooking.status).toBe(BookingStatus.FAILED);
      expect(mockBooking.bookingVersion).toBe(2);
      expect(mockBooking.save).toHaveBeenCalled();
      expect(ReservationService.transitionForBooking).toHaveBeenCalledWith(
        mockBooking._id,
        ReservationStatus.FAILED,
        expect.any(Object)
      );
      expect(ReservationService.releaseCapacityForTerminalReservations).toHaveBeenCalledWith(['res_1']);
      expect(SeatLayout.updateOne).toHaveBeenCalled();

      // Assert socket emissions
      expect(emitToEvent).toHaveBeenCalledWith(
        mockBooking.eventId.toString(),
        'seat:unlocked',
        { seatIds: ['seat_1'] },
        mockBooking.bookingId
      );
      expect(emitToBooking).toHaveBeenCalledWith(
        mockBooking._id.toString(),
        'booking:updated',
        { bookingId: mockBooking._id.toString(), status: BookingStatus.FAILED, bookingVersion: 2 },
        mockBooking.bookingId
      );
      expect(emitToAdmin).toHaveBeenCalledWith(
        'bookings',
        'booking:updated',
        { bookingId: mockBooking._id.toString(), status: BookingStatus.FAILED, bookingVersion: 2 },
        mockBooking.bookingId
      );
    });
  });
});
