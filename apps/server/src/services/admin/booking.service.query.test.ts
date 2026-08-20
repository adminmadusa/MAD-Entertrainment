import mongoose from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus } from '@mad/shared';

import { AuditLogModel } from '../../models/audit-log.schema';
import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { Ticket } from '../../models/ticket.schema';
import { CacheService } from '../cache.service';
import { getBookingsSummary, getBookings, getBookingById } from './booking.service';

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../../models/audit-log.schema', () => ({
  AuditLogModel: {
    find: vi.fn(),
  },
}));

vi.mock('../cache.service', () => ({
  CacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delPattern: vi.fn(),
  },
}));

vi.mock('../../models/payment.schema', () => ({
  Payment: {
    aggregate: vi.fn(),
  },
}));

vi.mock('../../models/refund.schema', () => ({
  Refund: {
    aggregate: vi.fn(),
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

describe('Admin Booking Service — Query & Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBookingsSummary', () => {
    it('should return cached summary if available', async () => {
      const mockCachedData = {
        totalBookings: 10,
        totalTickets: 20,
        grossRevenue: 5000,
        refundAmount: 1000,
        netRevenue: 4000,
        revenue: 4000,
        confirmed: 8,
        pending: 1,
        cancelled: 1,
        checkedIn: 5,
      };

      vi.mocked(CacheService.get).mockResolvedValue(mockCachedData);

      const result = await getBookingsSummary();

      expect(CacheService.get).toHaveBeenCalledWith('bookings:summary:global');
      expect(result).toEqual(mockCachedData);
      expect(Booking.aggregate).not.toHaveBeenCalled();
    });

    it('should run aggregation and calculate stats globally when no eventId is provided', async () => {
      vi.mocked(CacheService.get).mockResolvedValue(null);
      vi.mocked(Booking.aggregate).mockResolvedValueOnce([
        {
          totalBookings: 15,
          totalTickets: 30,
          confirmed: 10,
          pending: 3,
          cancelled: 2,
        },
      ]);
      vi.mocked(Payment.aggregate).mockResolvedValueOnce([
        {
          totalGross: 15000,
        },
      ]);
      vi.mocked(Refund.aggregate).mockResolvedValueOnce([
        {
          totalRefunded: 2000,
        },
      ]);
      vi.mocked(Ticket.aggregate).mockResolvedValue([
        {
          checkedIn: 12,
        },
      ]);

      const result = await getBookingsSummary();

      expect(CacheService.get).toHaveBeenCalledWith('bookings:summary:global');
      expect(Booking.aggregate).toHaveBeenCalled();
      expect(Ticket.aggregate).toHaveBeenCalledWith([
        { $match: { scannedAt: { $ne: null } } },
        { $group: { _id: null, checkedIn: { $sum: '$admits' } } },
      ]);
      expect(CacheService.set).toHaveBeenCalledWith('bookings:summary:global', result, 60);
      expect(result).toEqual({
        totalBookings: 15,
        totalTickets: 30,
        grossRevenue: 15000,
        refundAmount: 2000,
        netRevenue: 13000,
        revenue: 13000,
        confirmed: 10,
        pending: 3,
        cancelled: 2,
        checkedIn: 12,
      });
    });

    it('should run aggregation filtered by eventId when provided', async () => {
      const eventId = '507f1f77bcf86cd799439011';
      vi.mocked(CacheService.get).mockResolvedValue(null);
      vi.mocked(Booking.aggregate).mockResolvedValueOnce([
        {
          totalBookings: 5,
          totalTickets: 10,
          confirmed: 4,
          pending: 1,
          cancelled: 0,
        },
      ]);
      vi.mocked(Payment.aggregate).mockResolvedValueOnce([
        {
          totalGross: 5000,
        },
      ]);
      vi.mocked(Refund.aggregate).mockResolvedValueOnce([
        {
          totalRefunded: 500,
        },
      ]);
      vi.mocked(Ticket.aggregate).mockResolvedValue([
        {
          checkedIn: 6,
        },
      ]);

      const result = await getBookingsSummary(eventId);

      expect(CacheService.get).toHaveBeenCalledWith(`bookings:summary:event:${eventId}`);
      expect(Booking.aggregate).toHaveBeenCalled();
      expect(Ticket.aggregate).toHaveBeenCalled();
      expect(CacheService.set).toHaveBeenCalledWith(`bookings:summary:event:${eventId}`, result, 60);
      expect(result.checkedIn).toBe(6);
      expect(result.grossRevenue).toBe(5000);
      expect(result.refundAmount).toBe(500);
      expect(result.netRevenue).toBe(4500);
    });

    it('should fall back to 0 values if aggregation returns empty results', async () => {
      vi.mocked(CacheService.get).mockResolvedValue(null);
      vi.mocked(Booking.aggregate).mockResolvedValue([]);
      vi.mocked(Payment.aggregate).mockResolvedValue([]);
      vi.mocked(Refund.aggregate).mockResolvedValue([]);
      vi.mocked(Ticket.aggregate).mockResolvedValue([]);

      const result = await getBookingsSummary();

      expect(result).toEqual({
        totalBookings: 0,
        totalTickets: 0,
        grossRevenue: 0,
        refundAmount: 0,
        netRevenue: 0,
        revenue: 0,
        confirmed: 0,
        pending: 0,
        cancelled: 0,
        checkedIn: 0,
      });
    });
  });

  describe('PERF-001: getBookings and getBookingById DTO Parity & Performance Tests', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should retrieve paginated bookings list and match DTO payload schema contract', async () => {
      const mockEventId = new mongoose.Types.ObjectId();
      const mockBookingId = new mongoose.Types.ObjectId();

      const mockBookings = [
        {
          _id: mockBookingId,
          bookingId: 'MAD-2026-TEST1',
          status: BookingStatus.CONFIRMED,
          tickets: [{ tier: 'general', tierName: 'General', quantity: 2, pricePerTicket: 100, subtotal: 200 }],
          totalTickets: 2,
          totalAmount: 200,
          currency: 'INR',
          createdAt: new Date('2026-06-28T10:00:00Z'),
          guestName: 'John Doe',
          guestEmail: 'john@example.com',
          guestPhone: '+919876543210',
          eventId: {
            _id: mockEventId,
            title: 'Sample Concert',
            startDate: new Date('2026-07-01T12:00:00Z'),
            bookingMode: 'general_admission',
          },
        }
      ];

      const mockTickets = [
        {
          ticketId: 'TCK-1',
          bookingId: mockBookingId,
          status: 'active',
          createdAt: new Date('2026-06-28T10:05:00Z'),
          admits: 1,
        }
      ];

      const mockAuditLogs = [
        {
          _id: new mongoose.Types.ObjectId(),
          action: 'BOOKING_EMAIL_CORRECTED',
          actor: { id: 'admin-1' },
          status: 'success',
          createdAt: new Date('2026-06-28T10:10:00Z'),
          metadata: { bookingId: mockBookingId.toString() },
          description: 'Corrected email',
        }
      ];

      vi.mocked(Booking.countDocuments).mockResolvedValue(1);

      const mockLean = vi.fn().mockResolvedValue(mockBookings);
      const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate = vi.fn().mockReturnValue({ sort: mockSort });
      vi.mocked(Booking.find).mockReturnValue({ populate: mockPopulate } as any);

      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTickets),
      } as any);

      vi.mocked(AuditLogModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockAuditLogs),
        }),
      } as any);

      const result = await getBookings(1, 10);

      expect(Booking.countDocuments).toHaveBeenCalledTimes(1);
      expect(Booking.find).toHaveBeenCalledTimes(1);
      expect(Ticket.find).toHaveBeenCalledTimes(1);
      expect(AuditLogModel.find).toHaveBeenCalledTimes(1);

      expect(AuditLogModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { 'metadata.bookingId': { $in: [mockBookingId.toString()] } },
            { 'metadata.bookingReference': { $in: ['MAD-2026-TEST1'] } }
          ],
          action: { $in: ['BOOKING_EMAIL_CORRECTED', 'BOOKING_TICKETS_RESENT'] }
        }),
        expect.objectContaining({
          _id: 1,
          action: 1,
          actor: 1,
          status: 1,
          createdAt: 1,
          metadata: 1,
          description: 1
        })
      );

      expect(result.data).toHaveLength(1);
      const dto = result.data[0];

      expect(dto).toEqual(
        expect.objectContaining({
          _id: mockBookingId.toString(),
          bookingId: 'MAD-2026-TEST1',
          status: BookingStatus.CONFIRMED,
          totalAmount: 200,
          currency: 'INR',
          mode: 'general_admission',
          totalTickets: 1,
          ticketsScanned: 0,
          ticketsRemaining: 1,
          attendanceStatus: 'NOT_ATTENDED',
        })
      );

      expect(dto.eventId).toEqual(
        expect.objectContaining({
          _id: mockEventId.toString(),
          title: 'Sample Concert',
        })
      );

      expect(dto.tickets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tierName: 'General', quantity: 2, price: 100 })
        ])
      );

      expect(dto.auditHistory).toEqual([
        expect.objectContaining({
          action: 'BOOKING_EMAIL_CORRECTED',
          actor: 'admin-1',
          status: 'success',
          description: 'Corrected email',
        })
      ]);

      expect(dto.individualTickets).toEqual([
        expect.objectContaining({
          ticketId: 'TCK-1',
          status: 'active',
        })
      ]);

      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should retrieve a single booking by ID with pre-loaded logs and tickets', async () => {
      const mockEventId = new mongoose.Types.ObjectId();
      const mockBookingId = new mongoose.Types.ObjectId();

      const mockBooking = {
        _id: mockBookingId,
        bookingId: 'MAD-2026-TEST1',
        status: BookingStatus.CONFIRMED,
        tickets: [{ tier: 'general', tierName: 'General', quantity: 2, pricePerTicket: 100, subtotal: 200 }],
        totalTickets: 2,
        totalAmount: 200,
        currency: 'INR',
        createdAt: new Date('2026-06-28T10:00:00Z'),
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        guestPhone: '+919876543210',
        eventId: {
          _id: mockEventId,
          title: 'Sample Concert',
          startDate: new Date('2026-07-01T12:00:00Z'),
          bookingMode: 'general_admission',
        },
      };

      const mockTickets = [
        {
          ticketId: 'TCK-1',
          bookingId: mockBookingId,
          status: 'active',
          createdAt: new Date('2026-06-28T10:05:00Z'),
          admits: 1,
        }
      ];

      const mockAuditLogs = [
        {
          _id: new mongoose.Types.ObjectId(),
          action: 'BOOKING_EMAIL_CORRECTED',
          actor: { id: 'admin-1' },
          status: 'success',
          createdAt: new Date('2026-06-28T10:10:00Z'),
          metadata: { bookingId: mockBookingId.toString() },
          description: 'Corrected email',
        }
      ];

      const mockLean = vi.fn().mockResolvedValue(mockBooking);
      const mockFindOnePopulate = vi.fn().mockReturnValue({
        lean: mockLean,
      });
      vi.mocked(Booking.findOne).mockReturnValue({
        populate: mockFindOnePopulate,
      } as any);

      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTickets),
      } as any);

      vi.mocked(AuditLogModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockAuditLogs),
        }),
      } as any);

      const result = await getBookingById(mockBookingId.toString());

      expect(Booking.findOne).toHaveBeenCalledTimes(1);
      expect(Ticket.find).toHaveBeenCalledTimes(1);
      expect(AuditLogModel.find).toHaveBeenCalledTimes(1);

      expect(result).toEqual(
        expect.objectContaining({
          bookingId: 'MAD-2026-TEST1',
          status: BookingStatus.CONFIRMED,
          totalAmount: 200,
        })
      );
    });

    it('should pass regression tests for guest, authenticated, cancelled bookings, replaced tickets, and empty sets', async () => {
      const mockEventId = new mongoose.Types.ObjectId();
      const mockBookingId = new mongoose.Types.ObjectId();

      const mockBookings = [
        {
          _id: mockBookingId,
          bookingId: 'MAD-2026-REG1',
          status: BookingStatus.CANCELLED,
          tickets: [],
          totalTickets: 0,
          totalAmount: 0,
          currency: 'INR',
          createdAt: new Date('2026-06-28T10:00:00Z'),
          guestName: 'Guest Customer',
          guestEmail: 'guest@example.com',
          guestPhone: '+919876543219',
          cancellationReason: 'User cancelled',
          cancelledAt: new Date('2026-06-28T11:00:00Z'),
          eventId: {
            _id: mockEventId,
            title: 'Sample Concert',
            startDate: new Date('2026-07-01T12:00:00Z'),
            bookingMode: 'general_admission',
          },
        }
      ];

      vi.mocked(Booking.countDocuments).mockResolvedValue(1);

      const mockLean = vi.fn().mockResolvedValue(mockBookings);
      const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate = vi.fn().mockReturnValue({ sort: mockSort });
      vi.mocked(Booking.find).mockReturnValue({ populate: mockPopulate } as any);

      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.mocked(AuditLogModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await getBookings(1, 10);

      expect(result.data).toHaveLength(1);
      const dto = result.data[0];
      expect(dto.userId).toBeNull();
      expect(dto.guestInfo).toEqual(expect.objectContaining({
        email: 'guest@example.com',
        name: 'Guest Customer',
      }));
      expect(dto.status).toBe(BookingStatus.CANCELLED);
      expect(dto.cancellationReason).toBe('User cancelled');
      expect(dto.cancelledAt).toBeDefined();
      expect(dto.auditHistory).toHaveLength(0);
      expect(dto.tickets).toHaveLength(0);
    });

    it('should dynamically verify projection coverage against mapper requirements', async () => {
      const mockEventId = new mongoose.Types.ObjectId();
      const mockBookingId = new mongoose.Types.ObjectId();

      const projectedBookingOnly = {
        _id: mockBookingId,
        bookingId: 'MAD-2026-PROJ1',
        status: BookingStatus.CONFIRMED,
        totalAmount: 100,
        currency: 'INR',
        eventId: {
          _id: mockEventId,
          title: 'Concert',
          startDate: new Date(),
          bookingMode: 'general_admission',
        },
        userId: new mongoose.Types.ObjectId(),
        guestName: 'Test',
        firstName: 'Test',
        lastName: 'User',
        guestEmail: 'test@example.com',
        guestPhone: '+919999999999',
        keepUpdated: true,
        sendBestEvents: false,
        tickets: [
          {
            tierName: 'General',
            quantity: 1,
            pricePerTicket: 100,
            seats: []
          }
        ],
        createdAt: new Date(),
        cancellationReason: undefined,
        cancelledAt: undefined,
      };

      const mockTickets = [
        {
          ticketId: 'T-1',
          bookingId: mockBookingId,
          status: 'replaced',
          createdAt: new Date(),
          replacedAt: new Date(),
          replacedByTicketId: 'T-2',
          replacementReason: 'EMAIL_CORRECTION',
          admits: 1,
        }
      ];

      const mockLogs = [
        {
          _id: new mongoose.Types.ObjectId(),
          action: 'BOOKING_EMAIL_CORRECTED',
          actor: { id: 'admin-1' },
          status: 'success',
          createdAt: new Date(),
          metadata: { bookingId: mockBookingId.toString() },
          description: 'Updated email',
        }
      ];

      vi.mocked(Booking.countDocuments).mockResolvedValue(1);

      const mockLean = vi.fn().mockResolvedValue([projectedBookingOnly]);
      const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate = vi.fn().mockReturnValue({ sort: mockSort });
      vi.mocked(Booking.find).mockReturnValue({ populate: mockPopulate } as any);

      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTickets),
      } as any);

      vi.mocked(AuditLogModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockLogs),
        }),
      } as any);

      const result = await getBookings(1, 10);

      expect(result.data).toHaveLength(1);
      const mapped = result.data[0];
      expect(mapped._id).toBe(mockBookingId.toString());
      expect(mapped.individualTickets[0].replacedByTicketId).toBe('T-2');
      expect(mapped.individualTickets[0].replacementReason).toBe('EMAIL_CORRECTION');
    });

    it('should return empty pagination response when no bookings are found', async () => {
      vi.mocked(Booking.countDocuments).mockResolvedValue(0);

      const mockLean = vi.fn().mockResolvedValue([]);
      const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = vi.fn().mockReturnValue({ skip: mockSkip });
      const mockPopulate = vi.fn().mockReturnValue({ sort: mockSort });
      vi.mocked(Booking.find).mockReturnValue({ populate: mockPopulate } as any);

      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.mocked(AuditLogModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await getBookings(1, 10);

      expect(result.data).toHaveLength(0);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      });
    });
  });
});
