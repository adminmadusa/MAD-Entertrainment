import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────
// Hoisted Mock Variables
// ─────────────────────────────────────────────────────────────

const { mockSession, mockBookingSave, mockRedis } = vi.hoisted(() => {
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

  const saveFn = vi.fn().mockResolvedValue(undefined);

  const redis = {
    get: vi.fn(),
    del: vi.fn(),
  };

  return {
    mockSession: session,
    mockBookingSave: saveFn,
    mockRedis: redis,
  };
});

// ─────────────────────────────────────────────────────────────
// vi.mock declarations
// ─────────────────────────────────────────────────────────────

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

vi.mock('../../models/booking.schema', () => {
  const { Types } = require('mongoose');
  const mockBooking = vi.fn().mockImplementation(function (data) {
    this._id = new Types.ObjectId('60c72b2f9b1d8e25b8d29b01');
    this.bookingId = 'MAD-2026-ABCDE';
    this.status = data?.status || 'awaiting_payment';
    this.save = mockBookingSave;
    this.tickets = data?.tickets || [];
    this.totalTickets = data?.totalTickets || 0;
    this.subtotal = data?.subtotal ?? 0;
    this.discount = data?.discount ?? 0;
    this.convenienceFee = data?.convenienceFee ?? 0;
    this.gst = data?.gst ?? 0;
    this.totalAmount = data?.totalAmount ?? 0;
    this.bookingVersion = 0;
    Object.assign(this, data);
    return this;
  });
  (mockBooking as any).findOne = vi.fn();
  (mockBooking as any).find = vi.fn();
  return {
    Booking: mockBooking,
  };
});

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn(),
  },
}));

vi.mock('../../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/seat-layout.schema', () => ({
  SeatLayout: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../../models/coupon.schema', () => ({
  Coupon: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/user.schema', () => ({
  UserModel: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../reservation.service', () => ({
  ReservationService: {
    reserveForBooking: vi.fn(),
    transitionForBooking: vi.fn(),
    releaseCapacityForTerminalReservations: vi.fn(),
  },
}));

vi.mock('../cache.service', () => ({
  CacheService: {
    delPattern: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../config/redis', () => ({
  getRedis: vi.fn().mockReturnValue(mockRedis),
}));

vi.mock('../../config/socket', () => ({
  emitToAdmin: vi.fn(),
  emitToEvent: vi.fn(),
}));

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { Booking } from '../../models/booking.schema';
import { Coupon } from '../../models/coupon.schema';
import { Event } from '../../models/event.schema';
import { ReservationService } from '../reservation.service';
import { PublicBookingService } from './booking.service';



// ─────────────────────────────────────────────────────────────
// getBookingByReference — ticketsReady
// ─────────────────────────────────────────────────────────────

  describe('PublicBookingService.createBooking — transactions & rollback', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(Booking.findOne).mockReset();
      mockBookingSave.mockClear();
      mockRedis.get.mockReset();
      mockRedis.del.mockReset();
    });

  describe('PublicBookingService.createBooking — event expiry and boundaries', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should throw badRequest if event has already started', async () => {
      const mockEvent = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b02'),
        status: 'published',
        isDeleted: false,
        isSoldOut: false,
        bookingMode: 'general_admission',
        title: 'Expired Event',
        category: 'music',
        startDate: new Date(Date.now() - 3600000), // 1 hour ago
        ticketTiers: [
          {
            tier: 'GA_EARLY',
            name: 'Early GA',
            isActive: true,
            price: 500,
            soldCount: 0,
            totalCapacity: 100,
            taxPercent: 18,
          },
        ],
      };

      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

      await expect(
        PublicBookingService.createBooking(
          {
            eventId: mockEvent._id.toString(),
            tickets: [{ tier: 'GA_EARLY', quantity: 2 }],
          },
          'session-123'
        )
      ).rejects.toThrow('This event is no longer available for booking.');
    });

    it('should throw badRequest if event has already ended', async () => {
      const mockEvent = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b02'),
        status: 'published',
        isDeleted: false,
        isSoldOut: false,
        bookingMode: 'general_admission',
        title: 'Ended Event',
        category: 'music',
        startDate: new Date(Date.now() - 7200000), // 2 hours ago
        endDate: new Date(Date.now() - 3600000), // 1 hour ago
        ticketTiers: [
          {
            tier: 'GA_EARLY',
            name: 'Early GA',
            isActive: true,
            price: 500,
            soldCount: 0,
            totalCapacity: 100,
            taxPercent: 18,
          },
        ],
      };

      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

      await expect(
        PublicBookingService.createBooking(
          {
            eventId: mockEvent._id.toString(),
            tickets: [{ tier: 'GA_EARLY', quantity: 2 }],
          },
          'session-123'
        )
      ).rejects.toThrow('This event is no longer available for booking.');
    });
  });

  describe('PublicBookingService.createBooking — duplicate tier consolidation', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(Booking.findOne).mockResolvedValue(null);
    });

    it('should consolidate duplicate tiers and reject if the consolidated quantity exceeds maxPerBooking', async () => {
      const mockEvent = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b02'),
        status: 'published',
        isDeleted: false,
        isSoldOut: false,
        bookingMode: 'general_admission',
        title: 'GA Concert',
        category: 'music',
        startDate: new Date(Date.now() + 3600000), // in 1 hour
        ticketTiers: [
          {
            tier: 'GA_EARLY',
            name: 'Early GA',
            isActive: true,
            price: 500,
            soldCount: 0,
            totalCapacity: 100,
            taxPercent: 18,
            maxPerBooking: 2,
          },
        ],
      };

      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

      await expect(
        PublicBookingService.createBooking(
          {
            eventId: mockEvent._id.toString(),
            tickets: [
              { tier: 'GA_EARLY', quantity: 2 },
              { tier: 'GA_EARLY', quantity: 1 }
            ],
          },
          'session-123'
        )
      ).rejects.toThrow('Maximum 2 tickets allowed for tier "Early GA"');
    });

    it('should consolidate duplicate tiers and succeed if the consolidated quantity does not exceed maxPerBooking', async () => {
      const mockEvent = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b02'),
        status: 'published',
        isDeleted: false,
        isSoldOut: false,
        bookingMode: 'general_admission',
        title: 'GA Concert',
        category: 'music',
        startDate: new Date(Date.now() + 3600000), // in 1 hour
        ticketTiers: [
          {
            tier: 'GA_EARLY',
            name: 'Early GA',
            isActive: true,
            price: 500,
            soldCount: 0,
            totalCapacity: 100,
            taxPercent: 18,
            maxPerBooking: 2,
          },
        ],
      };

      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

      const mockPostCommit = vi.fn().mockResolvedValue(undefined);
      const mockReservations = [
        { reservationId: 'RES-001', tier: 'GA_EARLY', quantity: 2, status: 'reserved' },
      ];
      vi.mocked(ReservationService.reserveForBooking).mockResolvedValue({
        reservations: mockReservations,
        postCommit: mockPostCommit,
      } as any);

      const result = await PublicBookingService.createBooking(
        {
          eventId: mockEvent._id.toString(),
          tickets: [
            { tier: 'GA_EARLY', quantity: 1 },
            { tier: 'GA_EARLY', quantity: 1 }
          ],
        },
        'session-123'
      );

      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].tier).toBe('GA_EARLY');
      expect(result.tickets[0].quantity).toBe(2);
      expect(ReservationService.reserveForBooking).toHaveBeenCalledTimes(1);
      expect(ReservationService.reserveForBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'GA_EARLY',
          quantity: 2,
        }),
        expect.any(Object)
      );
    });
  });

  describe('PublicBookingService.createBooking — promo code calculation & tax base integrity', () => {
    const baseEvent = {
      _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b02'),
      status: 'published',
      isDeleted: false,
      isSoldOut: false,
      bookingMode: 'general_admission',
      title: 'Discounted Festival',
      category: 'music',
      countryCode: 'US',
      currency: 'USD',
      convenienceFee: 5,
      taxPercentage: 10,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      ticketTiers: [
        {
          tier: 'GA_TIER',
          name: 'General Admission',
          isActive: true,
          price: 100,
          soldCount: 0,
          totalCapacity: 100,
          taxPercent: 10,
        },
      ],
    };

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(Booking.findOne).mockResolvedValue(null);
      vi.mocked(ReservationService.reserveForBooking).mockResolvedValue({
        reservations: [{ reservationId: 'RES-01', tier: 'GA_TIER', quantity: 1, status: 'reserved' }],
        postCommit: vi.fn().mockResolvedValue(undefined),
      } as any);
    });

    it('Percentage Coupon: calculates tax strictly on discounted net subtotal', async () => {
      vi.mocked(Event.findById).mockResolvedValue(baseEvent as any);

      // 50% discount on $100 ticket -> subtotal $100, discount $50, netTicketSubtotal $50
      // netTicketGst = 10% of $50 = $5
      // convenienceFee = $5 (1 ticket), feeGst = 10% of $5 = $1 (round(0.5) = 1)
      // totalAmount = 50 + 5 + (5 + 1) = $61
      const mockCoupon = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b88'),
        code: 'HALF50',
        discountType: 'percentage',
        discountValue: 50,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
        usageLimit: 100,
        usedCount: 5,
        isActive: true,
      };
      vi.mocked(Coupon.findOne).mockResolvedValue(mockCoupon as any);

      const booking = await PublicBookingService.createBooking(
        {
          eventId: baseEvent._id.toString(),
          tickets: [{ tier: 'GA_TIER', quantity: 1 }],
          couponCode: 'HALF50',
        },
        'session-user-1'
      );

      expect(booking.subtotal).toBe(100);
      expect(booking.discount).toBe(50);
      expect(booking.convenienceFee).toBe(5);
      expect(booking.gst).toBe(6); // $5 net ticket tax + $1 fee tax
      expect(booking.totalAmount).toBe(61);
    });

    it('Fixed Coupon: calculates discount and net tax accurately', async () => {
      vi.mocked(Event.findById).mockResolvedValue(baseEvent as any);

      // $20 fixed discount on $100 ticket -> subtotal $100, discount $20, netTicketSubtotal $80
      // netTicketGst = 10% of $80 = $8
      // fee = $5, feeGst = $1, total gst = $9
      // totalAmount = 80 + 5 + 9 = $94
      const mockCoupon = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b89'),
        code: 'FLAT20',
        discountType: 'fixed',
        discountValue: 20,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
        usageLimit: 50,
        usedCount: 0,
        isActive: true,
      };
      vi.mocked(Coupon.findOne).mockResolvedValue(mockCoupon as any);

      const booking = await PublicBookingService.createBooking(
        {
          eventId: baseEvent._id.toString(),
          tickets: [{ tier: 'GA_TIER', quantity: 1 }],
          couponCode: 'FLAT20',
        },
        'session-user-2'
      );

      expect(booking.subtotal).toBe(100);
      expect(booking.discount).toBe(20);
      expect(booking.convenienceFee).toBe(5);
      expect(booking.gst).toBe(9);
      expect(booking.totalAmount).toBe(94);
    });

    it('Max Discount: caps percentage discount to maxDiscount', async () => {
      vi.mocked(Event.findById).mockResolvedValue(baseEvent as any);

      // 50% discount on $200 (2 tickets), but maxDiscount is $30
      // discount = $30, netTicketSubtotal = $170
      // netTicketGst = 10% of $170 = $17
      // fee = $10 (2 * $5), feeGst = 10% of $10 = $1, total gst = $18
      // totalAmount = 170 + 10 + 18 = $198
      const mockCoupon = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b90'),
        code: 'CAP30',
        discountType: 'percentage',
        discountValue: 50,
        maxDiscount: 30,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
        usageLimit: 10,
        usedCount: 0,
        isActive: true,
      };
      vi.mocked(Coupon.findOne).mockResolvedValue(mockCoupon as any);

      const booking = await PublicBookingService.createBooking(
        {
          eventId: baseEvent._id.toString(),
          tickets: [{ tier: 'GA_TIER', quantity: 2 }],
          couponCode: 'CAP30',
        },
        'session-user-3'
      );

      expect(booking.subtotal).toBe(200);
      expect(booking.discount).toBe(30);
      expect(booking.totalAmount).toBe(198);
    });

    it('100% Free Booking: correctly reduces ticket subtotal and tax to 0', async () => {
      const freeFeeEvent = {
        ...baseEvent,
        convenienceFee: 0,
      };
      vi.mocked(Event.findById).mockResolvedValue(freeFeeEvent as any);

      const mockCoupon = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b91'),
        code: 'ALLFREE',
        discountType: 'percentage',
        discountValue: 100,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
        usageLimit: 10,
        usedCount: 0,
        isActive: true,
      };
      vi.mocked(Coupon.findOne).mockResolvedValue(mockCoupon as any);

      const booking = await PublicBookingService.createBooking(
        {
          eventId: baseEvent._id.toString(),
          tickets: [{ tier: 'GA_TIER', quantity: 1 }],
          couponCode: 'ALLFREE',
        },
        'session-user-4'
      );

      expect(booking.subtotal).toBe(100);
      expect(booking.discount).toBe(100);
      expect(booking.gst).toBe(0);
      expect(booking.totalAmount).toBe(0);
    });

    it('Rejects coupon if usageLimit has been reached', async () => {
      vi.mocked(Event.findById).mockResolvedValue(baseEvent as any);

      const mockCoupon = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b92'),
        code: 'EXHAUSTED',
        discountType: 'fixed',
        discountValue: 10,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
        usageLimit: 5,
        usedCount: 5,
        isActive: true,
      };
      vi.mocked(Coupon.findOne).mockResolvedValue(mockCoupon as any);

      await expect(
        PublicBookingService.createBooking(
          {
            eventId: baseEvent._id.toString(),
            tickets: [{ tier: 'GA_TIER', quantity: 1 }],
            couponCode: 'EXHAUSTED',
          },
          'session-user-5'
        )
      ).rejects.toThrow('Coupon usage limit reached');
    });

    it('Rejects coupon if minOrderAmount is not satisfied', async () => {
      vi.mocked(Event.findById).mockResolvedValue(baseEvent as any);

      const mockCoupon = {
        _id: new Types.ObjectId('60c72b2f9b1d8e25b8d29b93'),
        code: 'BIGSPENDER',
        discountType: 'fixed',
        discountValue: 50,
        minOrderAmount: 300,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
        usageLimit: 10,
        usedCount: 0,
        isActive: true,
      };
      vi.mocked(Coupon.findOne).mockResolvedValue(mockCoupon as any);

      await expect(
        PublicBookingService.createBooking(
          {
            eventId: baseEvent._id.toString(),
            tickets: [{ tier: 'GA_TIER', quantity: 1 }], // subtotal = 100 < 300
            couponCode: 'BIGSPENDER',
          },
          'session-user-6'
        )
      ).rejects.toThrow('Minimum subtotal order amount of $300 is required');
    });
  });
  });

