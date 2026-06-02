import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminAuthController } from './auth.controller';
import { adminAuthService } from '../../services/admin/auth.service';
import { AdminModel } from '../../models/admin.schema';
import { verifyAdminToken } from '../../utils/jwt';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    JWT_SECRET: 'test_jwt_secret_with_32_characters_long_minimum',
    JWT_ADMIN_SECRET: 'test_admin_secret_with_32_characters_long_minimum',
    JWT_ADMIN_EXPIRES_IN: '1d',
  })),
}));

vi.mock('../../models/admin.schema', () => ({
  AdminModel: {
    findOne: vi.fn(),
    findById: vi.fn(),
  },
}));

const mockRequest = (body = {}, admin?: any) => {
  return {
    body,
    admin,
  } as any;
};

const mockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('Admin Authentication Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('adminAuthService - login() and JwtAdminPayload', () => {
    it('should generate a token containing sub, email, and role', async () => {
      const mockAdmin = {
        _id: 'admin-id-999',
        email: 'admin@example.com',
        name: 'Super Admin',
        role: 'super_admin',
        isActive: true,
        comparePassword: vi.fn().mockResolvedValue(true),
        save: vi.fn(),
      };

      vi.mocked(AdminModel.findOne).mockResolvedValue(mockAdmin as any);

      const result = await adminAuthService.login('admin@example.com', 'password');

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.admin.id).toBe(mockAdmin._id);
      expect(result.admin.email).toBe(mockAdmin.email);

      // Verify token payload matches JwtAdminPayload exactly using verifyAdminToken
      const decoded = verifyAdminToken(result.token);
      expect(decoded.sub).toBe(mockAdmin._id);
      expect(decoded.email).toBe(mockAdmin.email);
      expect(decoded.role).toBe(mockAdmin.role);
      
      // Ensure the legacy id property is NOT in the payload
      expect((decoded as any).id).toBeUndefined();
    });
  });

  describe('adminAuthController - getMe()', () => {
    it('should retrieve admin details using req.admin.sub', async () => {
      const mockAdmin = {
        _id: 'admin-id-999',
        email: 'admin@example.com',
        name: 'Super Admin',
        role: 'super_admin',
      };

      vi.mocked(AdminModel.findById).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue(mockAdmin),
      } as any);

      // Mock request with req.admin populated (e.g. from requireAdmin middleware)
      const req = mockRequest({}, { sub: 'admin-id-999', email: 'admin@example.com', role: 'super_admin' });
      const res = mockResponse();

      await adminAuthController.getMe(req, res);

      expect(AdminModel.findById).toHaveBeenCalledWith('admin-id-999');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'admin-id-999',
          name: 'Super Admin',
          email: 'admin@example.com',
          role: 'super_admin',
        },
      });
    });

    it('should throw unauthorized error if req.admin.sub is missing', async () => {
      const req = mockRequest({}, undefined); // missing admin info
      const res = mockResponse();

      await expect(adminAuthController.getMe(req, res)).rejects.toThrow('Admin authentication required');
    });
  });
});
