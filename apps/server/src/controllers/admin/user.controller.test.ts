import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { getUsers, getUserById, getGuestUserByEmail, toggleUserActive } from './user.controller';
import { AdminUserService } from '../../services/admin/user.service';

vi.mock('../../services/admin/user.service', () => ({
  AdminUserService: {
    listUsers: vi.fn(),
    getRegisteredUserDetail: vi.fn(),
    getGuestUserDetail: vi.fn(),
    toggleUserActive: vi.fn(),
  },
}));

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const next: NextFunction = vi.fn();

describe('admin user controller unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUsers', () => {
    it('calls listUsers service with query params and returns success payload', async () => {
      const mockResult = {
        items: [
          { id: '1', name: 'John', email: 'john@example.com', accountType: 'registered' },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      vi.mocked(AdminUserService.listUsers).mockResolvedValue(mockResult as any);

      const req = {
        query: { page: '1', limit: '10', type: 'registered', search: 'John', sortField: 'name', sortOrder: 'asc' },
      } as unknown as Request;
      const res = makeRes();

      await getUsers(req, res, next);

      expect(AdminUserService.listUsers).toHaveBeenCalledWith(1, 10, 'John', 'registered', 'name', 'asc');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Users fetched successfully',
      });
    });
  });

  describe('getUserById', () => {
    it('returns user details when user exists', async () => {
      const mockUser = {
        profile: { id: 'user-123', name: 'John Doe', email: 'john@example.com' },
        bookings: [],
      };
      vi.mocked(AdminUserService.getRegisteredUserDetail).mockResolvedValue(mockUser as any);

      const req = { params: { id: 'user-123' } } as unknown as Request;
      const res = makeRes();

      await getUserById(req, res, next);

      expect(AdminUserService.getRegisteredUserDetail).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
        message: 'User details fetched successfully',
      });
    });

    it('returns 404 when registered user detail is null', async () => {
      vi.mocked(AdminUserService.getRegisteredUserDetail).mockResolvedValue(null);

      const req = { params: { id: 'user-not-found' } } as unknown as Request;
      const res = makeRes();

      await getUserById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });
  });

  describe('getGuestUserByEmail', () => {
    it('returns guest details when guest bookings exist', async () => {
      const mockGuest = {
        profile: { email: 'guest@example.com', name: 'Guest User' },
        bookings: [],
      };
      vi.mocked(AdminUserService.getGuestUserDetail).mockResolvedValue(mockGuest as any);

      const req = { params: { email: 'guest@example.com' } } as unknown as Request;
      const res = makeRes();

      await getGuestUserByEmail(req, res, next);

      expect(AdminUserService.getGuestUserDetail).toHaveBeenCalledWith('guest@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockGuest,
        message: 'Guest user details fetched successfully',
      });
    });

    it('returns 404 when guest user detail is null', async () => {
      vi.mocked(AdminUserService.getGuestUserDetail).mockResolvedValue(null);

      const req = { params: { email: 'guest-not-found@example.com' } } as unknown as Request;
      const res = makeRes();

      await getGuestUserByEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Guest user not found',
      });
    });
  });

  describe('toggleUserActive', () => {
    it('toggles user active status and returns active status mapping', async () => {
      const mockUser = {
        _id: new Types.ObjectId('60d5ec482f8fb814c489705a'),
        email: 'john@example.com',
        isActive: false,
        save: vi.fn(),
      };
      vi.mocked(AdminUserService.toggleUserActive).mockResolvedValue(mockUser as any);

      const req = {
        params: { id: '60d5ec482f8fb814c489705a' },
        admin: { sub: 'admin-id-123' },
      } as unknown as Request;
      const res = makeRes();

      await toggleUserActive(req, res, next);

      expect(AdminUserService.toggleUserActive).toHaveBeenCalledWith('60d5ec482f8fb814c489705a', 'admin-id-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: '60d5ec482f8fb814c489705a',
          email: 'john@example.com',
          isActive: false,
        },
        message: 'User account has been successfully suspended',
      });
    });
  });
});
