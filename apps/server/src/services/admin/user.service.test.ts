import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'testsecret',
    JWT_ADMIN_SECRET: 'testsecret',
    JWT_SESSION_SECRET: 'testsecret',
    ALLOWED_ORIGINS: 'http://localhost:3000',
  })),
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { Ticket } from '../../models/ticket.schema';
import { UserModel } from '../../models/user.schema';
import { AdminUserService } from './user.service';

vi.mock('../../models/user.schema', () => ({
  UserModel: {
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    find: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn(),
  },
}));

vi.mock('../../models/refund.schema', () => ({
  Refund: {
    find: vi.fn(),
  },
}));

vi.mock('../../models/payment.schema', () => ({
  Payment: {
    find: vi.fn(),
  },
}));

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

describe('AdminUserService unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsers — registered', () => {
    it('returns formatted registered users and pagination summary', async () => {
      vi.mocked(UserModel.countDocuments).mockResolvedValue(12);
      const mockUsers = [
        {
          _id: new Types.ObjectId('60d5ec482f8fb814c489705a'),
          name: 'Jane Doe',
          email: 'jane@example.com',
          mobileNumber: '1234567890',
          googleId: 'g-123',
          isActive: true,
          lastLogin: new Date('2026-06-02T10:00:00Z'),
          totalBookings: 3,
          createdAt: new Date('2026-05-01T12:00:00Z'),
        },
      ];
      vi.mocked(UserModel.aggregate).mockResolvedValue(mockUsers);

      const result = await AdminUserService.listUsers(1, 10, 'Jane', 'registered', 'name', 'asc');

      expect(UserModel.countDocuments).toHaveBeenCalled();
      expect(UserModel.aggregate).toHaveBeenCalled();
      expect(result.pagination.total).toBe(12);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.items[0]).toEqual(expect.objectContaining({
        id: '60d5ec482f8fb814c489705a',
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '1234567890',
        accountType: 'registered',
        loginVia: 'google',
        isActive: true,
        totalBookings: 3,
      }));
    });
  });

  describe('listUsers — guest', () => {
    it('returns formatted unique guest customers grouped by email', async () => {
      // Mock count unique guest emails
      vi.mocked(Booking.aggregate)
        .mockResolvedValueOnce([{ total: 5 }]) // Count aggregate response
        .mockResolvedValueOnce([               // Main aggregate response
          {
            _id: 'guest@example.com',
            guestName: 'Guest Person',
            guestPhone: '9876543210',
            totalBookings: 2,
            createdAt: new Date('2026-04-10T11:00:00Z'),
          },
        ]);

      const result = await AdminUserService.listUsers(1, 10, 'Guest', 'guest', 'email', 'desc');

      expect(Booking.aggregate).toHaveBeenCalledTimes(2);
      expect(result.pagination.total).toBe(5);
      expect(result.items[0]).toEqual({
        id: null,
        name: 'Guest Person',
        email: 'guest@example.com',
        phone: '9876543210',
        accountType: 'guest',
        totalBookings: 2,
        createdAt: expect.any(Date),
      });
    });
  });

  describe('getRegisteredUserDetail', () => {
    it('returns null if user does not exist', async () => {
      vi.mocked(UserModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const result = await AdminUserService.getRegisteredUserDetail('60d5ec482f8fb814c489705a');

      expect(result).toBeNull();
    });

    it('aggregates user metadata, confirmed spends using payments, and refunds correctly', async () => {
      const userId = new Types.ObjectId('60d5ec482f8fb814c489705a');
      const bookingId = new Types.ObjectId('60d5ec482f8fb814c489705b');

      vi.mocked(UserModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: userId,
          name: 'Jane Registered',
          email: 'jane.r@example.com',
          mobileNumber: '5555555555',
          isActive: true,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        }),
      } as any);

      vi.mocked(Booking.find).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([
              {
                _id: bookingId,
                bookingId: 'MAD-2026-11111',
                userId,
                status: 'confirmed',
                totalTickets: 2,
                totalAmount: 2000,
                createdAt: new Date('2026-06-01T12:00:00Z'),
                eventId: {
                  _id: new Types.ObjectId(),
                  title: 'Party Event',
                  startDate: new Date(),
                },
              },
            ]),
          }),
        }),
      } as any);

      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { ticketId: 'T-1', bookingId, admits: 1, scannedAt: new Date() },
          { ticketId: 'T-2', bookingId, admits: 1, scannedAt: null },
        ]),
      } as any);

      vi.mocked(Refund.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: new Types.ObjectId(), bookingId, amount: 500, status: 'completed' },
        ]),
      } as any);

      vi.mocked(Payment.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: new Types.ObjectId(), bookingId, amount: 2000, status: 'paid' },
        ]),
      } as any);

      const result = await AdminUserService.getRegisteredUserDetail(userId.toString());

      expect(result).not.toBeNull();
      expect(result!.profile.lifetimeGrossSpend).toBe(2000);
      expect(result!.profile.lifetimeRefunds).toBe(500);
      expect(result!.profile.lifetimeNetSpend).toBe(1500);
      expect(result!.profile.totalSpend).toBe(1500);
      expect(result!.profile.totalTickets).toBe(2);
      expect(result!.bookings[0].ticketsScanned).toBe(1);
      expect(result!.bookings[0].ticketsRemaining).toBe(1);
      expect(result!.bookings[0].refunds[0].amount).toBe(500);
    });
  });

  describe('toggleUserActive', () => {
    it('throws error when administrator deactivates self', async () => {
      await expect(
        AdminUserService.toggleUserActive('admin-id', 'admin-id')
      ).rejects.toThrow('Administrators cannot suspend their own account');
    });

    it('toggles isActive flag and invokes Mongoose save', async () => {
      const mockSave = vi.fn();
      const mockUser = {
        _id: new Types.ObjectId('60d5ec482f8fb814c489705a'),
        email: 'john@example.com',
        isActive: true,
        save: mockSave,
      };
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser as any);

      const result = await AdminUserService.toggleUserActive('60d5ec482f8fb814c489705a', 'admin-requester');

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result.isActive).toBe(false);
    });
  });
});
