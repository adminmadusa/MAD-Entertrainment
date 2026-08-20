import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BookingStatus } from '@mad/shared';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'testsecret',
    JWT_ADMIN_SECRET: 'testsecret',
    JWT_SESSION_SECRET: 'testsecret',
  })),
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/audit-log.schema', () => ({
  AuditLogModel: {
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    find: vi.fn(),
  },
}));

import { Ticket } from '../../models/ticket.schema';
import { Booking } from '../../models/booking.schema';
import { AuditLogModel } from '../../models/audit-log.schema';
import * as scannerService from './scanner.service';

describe('Admin Scanner Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateAndCheckInTicket', () => {
    const eventId = '507f1f77bcf86cd799439011';
    const scannerId = '507f1f77bcf86cd799439012';
    const ticketId = 'TKT-001';

    it('returns SUCCESS on successful scan & check-in', async () => {
      const mockTicket = {
        _id: 'ticket-1',
        ticketId,
        eventId,
        bookingId: 'booking-1',
        tierName: 'VIP',
        admits: 1,
        status: 'active',
        assignmentStatus: 'claimed',
        scannedAt: null,
      };

      const mockBooking = {
        _id: 'booking-1',
        bookingId: 'MAD-2026-ABCDE',
        guestName: 'John Doe',
        status: BookingStatus.CONFIRMED,
      };

      vi.mocked(Ticket.findOne).mockResolvedValue(mockTicket as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Ticket.findOneAndUpdate).mockResolvedValue({
        ...mockTicket,
        scannedAt: new Date(),
      } as any);

      const result = await scannerService.validateAndCheckInTicket({
        ticketId,
        eventId,
        scannerId,
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.ticketId).toBe(ticketId);
      expect(result.guestName).toBe('John Doe');
      expect(Ticket.findOneAndUpdate).toHaveBeenCalled();
    });

    it('handles idempotency key replay successfully', async () => {
      const requestId = 'req-123';
      const mockAuditLog = {
        action: 'TICKET_SCAN',
        status: 'success',
        createdAt: new Date(),
        metadata: {
          requestId,
          ticketId,
          tierName: 'VIP',
          admits: 2,
          scannedAt: '2026-07-06T18:00:00.000Z',
          guestName: 'Jane Doe',
        },
      };

      vi.mocked(AuditLogModel.findOne).mockResolvedValue(mockAuditLog as any);

      const result = await scannerService.validateAndCheckInTicket({
        ticketId,
        eventId,
        scannerId,
        requestId,
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.guestName).toBe('Jane Doe');
      expect(result.message).toContain('idempotent');
      expect(Ticket.findOne).not.toHaveBeenCalled();
    });

    it('returns INVALID if ticket does not exist', async () => {
      vi.mocked(Ticket.findOne).mockResolvedValue(null);

      const result = await scannerService.validateAndCheckInTicket({
        ticketId,
        eventId,
        scannerId,
      });

      expect(result.status).toBe('INVALID');
      expect(result.message).toContain('Ticket not found');
    });

    it('returns WRONG_EVENT if eventIds do not match', async () => {
      const mockTicket = {
        ticketId,
        eventId: 'different-event-id',
        status: 'active',
      };

      vi.mocked(Ticket.findOne).mockResolvedValue(mockTicket as any);

      const result = await scannerService.validateAndCheckInTicket({
        ticketId,
        eventId,
        scannerId,
      });

      expect(result.status).toBe('WRONG_EVENT');
      expect(result.message).toContain('different event');
    });

    it('normalizes ticket references provided as full URLs', async () => {
      const mockTicket = {
        _id: 'ticket-1',
        ticketId: 'TKT-001',
        eventId,
        bookingId: 'booking-1',
        tierName: 'VIP',
        admits: 1,
        status: 'active',
        assignmentStatus: 'claimed',
        scannedAt: null,
      };

      const mockBooking = {
        _id: 'booking-1',
        bookingId: 'MAD-2026-ABCDE',
        guestName: 'John Doe',
        attendeeEmail: 'john@example.com',
        status: BookingStatus.CONFIRMED,
      };

      vi.mocked(Ticket.findOne).mockResolvedValue(mockTicket as any);
      vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
      vi.mocked(Ticket.findOneAndUpdate).mockResolvedValue({
        ...mockTicket,
        scannedAt: new Date(),
      } as any);

      const result = await scannerService.validateAndCheckInTicket({
        ticketId: 'https://www.madentertainments.net/tickets/TKT-001?ref=gate',
        eventId,
        scannerId,
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.ticketId).toBe('TKT-001');
      expect(result.guestName).toBe('John Doe');
      expect(result.attendeeEmail).toBe('john@example.com');
      expect(Ticket.findOne).toHaveBeenCalledWith({ ticketId: { $eq: 'TKT-001' } });
    });

    it('returns ALREADY_SCANNED if ticket is already scanned', async () => {
      const scannedDate = new Date('2026-08-18T00:00:00.000Z');
      const mockTicket = {
        ticketId,
        eventId,
        scannedAt: scannedDate,
        status: 'active',
        assignmentStatus: 'claimed',
      };

      vi.mocked(Ticket.findOne).mockResolvedValue(mockTicket as any);

      const result = await scannerService.validateAndCheckInTicket({
        ticketId,
        eventId,
        scannerId,
      });

      expect(result.status).toBe('ALREADY_SCANNED');
      expect(result.ticketId).toBe(ticketId);
      expect(result.scannedAt).toBe(scannedDate.toISOString());
    });
  });

  describe('getScannerStats', () => {
    const eventId = '507f1f77bcf86cd799439011';

    it('derives and aggregates stats correctly', async () => {
      vi.mocked(Ticket.countDocuments).mockImplementation(async (query: any) => {
        if (query.scannedAt) return 40; // Checked-in count
        return 100; // Total active count
      });

      vi.mocked(AuditLogModel.countDocuments).mockImplementation(async (query: any) => {
        if (query['metadata.offline'] === true) return 2;
        if (query['metadata.result'] === 'ALREADY_SCANNED') return 5;
        if (query.status === 'success') return 40;
        if (query.status === 'failure') return 10;
        return 50; // Total scans
      });

      vi.mocked(Ticket.findOne).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ scannedAt: new Date('2026-07-06T18:00:00.000Z') }),
        }),
      } as any);

      const stats = await scannerService.getScannerStats(eventId);

      expect(stats.totalTickets).toBe(100);
      expect(stats.checkedIn).toBe(40);
      expect(stats.remaining).toBe(60);
      expect(stats.successRate).toBe(80); // 40 / 50 * 100
      expect(stats.offlineSynced).toBe(2);
      expect(stats.lastScanTime).toBe('2026-07-06T18:00:00.000Z');
    });
  });

  describe('getScannerHistory', () => {
    const eventId = '507f1f77bcf86cd799439011';

    it('returns logs list and handles filtering/pagination', async () => {
      const mockLogs = [
        {
          _id: new Types.ObjectId(),
          createdAt: new Date(),
          actor: { id: 'admin-1' },
          status: 'success',
          metadata: {
            ticketId: 'T-1',
            guestName: 'Jane Doe',
            tierName: 'VIP',
            result: 'SUCCESS',
            scanSource: 'camera',
            offline: false,
          },
        },
      ];

      vi.mocked(AuditLogModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockLogs),
          }),
        }),
      } as any);

      vi.mocked(AuditLogModel.countDocuments).mockResolvedValue(1);

      const history = await scannerService.getScannerHistory(eventId, { page: 1, limit: 10 });

      expect(history.items.length).toBe(1);
      expect(history.items[0].guestName).toBe('Jane Doe');
      expect(history.items[0].status).toBe('SUCCESS');
      expect(history.pagination.total).toBe(1);
    });
  });
});
