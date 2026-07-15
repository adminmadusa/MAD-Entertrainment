import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'testsecret',
    JWT_ADMIN_SECRET: 'testsecret',
    JWT_SESSION_SECRET: 'testsecret',
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

import { AdminModel } from '../../models/admin.schema';
import { auditLog } from '../../utils/audit';
import { createAdmin, toggleAdminActive, updateAdmin, updateAdminRole, resetAdminPassword } from './team.service';

vi.mock('../../models/admin.schema', () => {
  const { Types } = require('mongoose');

  const mockSave = vi.fn().mockImplementation(function (this: any) {
    this._id = new Types.ObjectId('60d5ec482f8fb814c489705a');
    return Promise.resolve(this);
  });

  class MockAdminModel {
    static findOne = vi.fn();
    static findById = vi.fn();
    static countDocuments = vi.fn();
    static mockSave = mockSave;

    _id?: any;
    email: string;
    role: string;
    name: string;
    isActive: boolean;

    constructor(payload: any) {
      this.email = payload.email;
      this.role = payload.role;
      this.name = payload.name;
      this.isActive = payload.isActive ?? true;
    }

    save = mockSave;

    toObject() {
      return {
        _id: this._id,
        email: this.email,
        role: this.role,
        name: this.name,
        isActive: this.isActive,
      };
    }
  }

  return {
    AdminModel: MockAdminModel,
  };
});

vi.mock('../../utils/transaction', () => ({
  runInTransaction: vi.fn(async (fn) => fn('mock-session')),
}));

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

describe('team.service unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAdmin', () => {
    it('throws badRequest if fields are missing', async () => {
      await expect(createAdmin({}, 'creator-id', 'super_admin')).rejects.toThrow('All fields (email, password, name, role) are required');
    });

    it('throws AppError.forbidden if requester is not super_admin', async () => {
      await expect(
        createAdmin(
          { email: 'new@example.com', password: 'password123', name: 'New Admin', role: 'admin' },
          'creator-id',
          'admin'
        )
      ).rejects.toThrow('Only Super Admins can manage administrative accounts');

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_MUTATION_DENIED',
          status: 'failure',
          metadata: expect.objectContaining({
            reason: 'insufficient_privileges',
            actionAttempted: 'create_admin',
          }),
        })
      );
    });

    it('creates account and logs ADMIN_CREATED audit event', async () => {
      vi.mocked(AdminModel.findOne).mockResolvedValue(null);
      (AdminModel as any).mockSave.mockClear();

      const result = await createAdmin(
        { email: 'new@example.com', password: 'password123', name: 'New Admin', role: 'admin' },
        'creator-id',
        'super_admin'
      );

      expect((AdminModel as any).mockSave).toHaveBeenCalledTimes(1);
      expect(result.email).toBe('new@example.com');
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_CREATED',
          actor: { type: 'admin', id: 'creator-id' },
          status: 'success',
          metadata: expect.objectContaining({
            targetRole: 'admin',
            targetEmail: 'new@example.com',
          }),
        })
      );
    });
  });

  describe('toggleAdminActive', () => {
    it('throws AppError.forbidden if requester is not super_admin', async () => {
      await expect(
        toggleAdminActive('target-id', 'admin-id', 'admin')
      ).rejects.toThrow('Only Super Admins can manage administrative accounts');

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_MUTATION_DENIED',
          status: 'failure',
          metadata: expect.objectContaining({
            reason: 'insufficient_privileges',
          }),
        })
      );
    });

    it('throws AppError.badRequest if super_admin attempts self deactivation', async () => {
      await expect(
        toggleAdminActive('same-id', 'same-id', 'super_admin')
      ).rejects.toThrow('You cannot deactivate your own administrative account');

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_MUTATION_DENIED',
          status: 'failure',
          metadata: expect.objectContaining({
            reason: 'self_deactivation',
          }),
        })
      );
    });

    it('throws AppError.badRequest if target super_admin is the last active super admin', async () => {
      const mockTarget = {
        _id: new Types.ObjectId(),
        role: 'super_admin',
        isActive: true,
        save: vi.fn(),
        session: vi.fn().mockReturnThis(),
      };

      vi.mocked(AdminModel.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockTarget),
      } as any);

      vi.mocked(AdminModel.countDocuments).mockReturnValue({
        session: vi.fn().mockResolvedValue(1),
      } as any);

      await expect(
        toggleAdminActive(mockTarget._id.toString(), 'requester-id', 'super_admin')
      ).rejects.toThrow('Cannot deactivate the last active Super Admin account');

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_MUTATION_DENIED',
          status: 'failure',
          metadata: expect.objectContaining({
            reason: 'last_active_super_admin',
          }),
        })
      );
    });

    it('successfully deactivates super_admin when multiple active super_admins exist', async () => {
      const mockSave = vi.fn();
      const mockTarget = {
        _id: new Types.ObjectId(),
        role: 'super_admin',
        isActive: true,
        save: mockSave,
        session: vi.fn().mockReturnThis(),
      };

      vi.mocked(AdminModel.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockTarget),
      } as any);

      vi.mocked(AdminModel.countDocuments).mockReturnValue({
        session: vi.fn().mockResolvedValue(2),
      } as any);

      const result = await toggleAdminActive(mockTarget._id.toString(), 'requester-id', 'super_admin');

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result!.isActive).toBe(false);
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_DEACTIVATED',
          status: 'success',
        })
      );
    });
  });

  describe('updateAdmin', () => {
    it('throws AppError.forbidden if requester is not super_admin', async () => {
      await expect(
        updateAdmin('target-id', { name: 'New Name', email: 'new@example.com' }, 'creator-id', 'admin')
      ).rejects.toThrow('Only Super Admins can manage administrative accounts');
    });

    it('throws AppError.badRequest if editing own email address', async () => {
      const mockTarget = {
        _id: new Types.ObjectId('60d5ec482f8fb814c489705a'),
        email: 'self@example.com',
        name: 'Self name',
        save: vi.fn(),
        session: vi.fn().mockReturnThis(),
      };

      vi.mocked(AdminModel.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockTarget),
      } as any);

      await expect(
        updateAdmin(mockTarget._id.toString(), { name: 'Self New Name', email: 'different@example.com' }, mockTarget._id.toString(), 'super_admin')
      ).rejects.toThrow('You cannot edit your own email address through the administrative panel');
    });

    it('throws conflict error if email is already in use by another admin', async () => {
      const mockTarget = {
        _id: new Types.ObjectId('60d5ec482f8fb814c489705a'),
        email: 'target@example.com',
        name: 'Target Name',
        save: vi.fn(),
        session: vi.fn().mockReturnThis(),
      };

      vi.mocked(AdminModel.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockTarget),
      } as any);

      vi.mocked(AdminModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue({ _id: 'other-id', email: 'conflict@example.com' }),
      } as any);

      await expect(
        updateAdmin(mockTarget._id.toString(), { name: 'Target Name', email: 'conflict@example.com' }, 'requester-id', 'super_admin')
      ).rejects.toThrow('An administrator with this email already exists');
    });

    it('successfully updates name/email and logs ADMIN_UPDATED audit log', async () => {
      const mockSave = vi.fn();
      const mockTarget = {
        _id: new Types.ObjectId('60d5ec482f8fb814c489705a'),
        email: 'target@example.com',
        name: 'Old Name',
        save: mockSave,
        session: vi.fn().mockReturnThis(),
        toObject: vi.fn().mockReturnValue({ _id: '60d5ec482f8fb814c489705a', name: 'New Name', email: 'new@example.com' }),
      };

      vi.mocked(AdminModel.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockTarget),
      } as any);

      vi.mocked(AdminModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);

      const result = await updateAdmin(mockTarget._id.toString(), { name: 'New Name', email: 'new@example.com' }, 'requester-id', 'super_admin');

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result!.name).toBe('New Name');
      expect(result!.email).toBe('new@example.com');
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_UPDATED',
          status: 'success',
          metadata: expect.objectContaining({
            before: expect.objectContaining({ name: 'Old Name', email: 'target@example.com' }),
            after: expect.objectContaining({ name: 'New Name', email: 'new@example.com' }),
          }),
        })
      );
    });
  });

  describe('updateAdminRole', () => {
    it('throws AppError.forbidden if requester is not super_admin', async () => {
      await expect(
        updateAdminRole('target-id', 'manager', 'creator-id', 'admin')
      ).rejects.toThrow('Only Super Admins can manage administrative accounts');
    });

    it('throws AppError.badRequest if modifying own administrative role', async () => {
      await expect(
        updateAdminRole('self-id', 'manager', 'self-id', 'super_admin')
      ).rejects.toThrow('You cannot modify your own administrative role');
    });

    it('throws AppError.badRequest if new role matches current role (no-op prevent)', async () => {
      const mockTarget = {
        _id: new Types.ObjectId(),
        role: 'manager',
        save: vi.fn(),
        session: vi.fn().mockReturnThis(),
      };

      vi.mocked(AdminModel.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockTarget),
      } as any);

      await expect(
        updateAdminRole(mockTarget._id.toString(), 'manager', 'requester-id', 'super_admin')
      ).rejects.toThrow('Role is already assigned');

      expect(auditLog).not.toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_ROLE_CHANGED',
        })
      );
    });

    it('throws AppError.badRequest if trying to downgrade the last active Super Admin', async () => {
      const mockTarget = {
        _id: new Types.ObjectId(),
        role: 'super_admin',
        isActive: true,
        save: vi.fn(),
        session: vi.fn().mockReturnThis(),
      };

      vi.mocked(AdminModel.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockTarget),
      } as any);

      vi.mocked(AdminModel.countDocuments).mockReturnValue({
        session: vi.fn().mockResolvedValue(1),
      } as any);

      await expect(
        updateAdminRole(mockTarget._id.toString(), 'admin', 'requester-id', 'super_admin')
      ).rejects.toThrow('Cannot downgrade the last active Super Admin account');
    });

    it('successfully changes role and logs ADMIN_ROLE_CHANGED audit log', async () => {
      const mockSave = vi.fn();
      const mockTarget = {
        _id: new Types.ObjectId(),
        role: 'support',
        email: 'support@example.com',
        save: mockSave,
        session: vi.fn().mockReturnThis(),
        toObject: vi.fn().mockReturnValue({ role: 'manager', email: 'support@example.com' }),
      };

      vi.mocked(AdminModel.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockTarget),
      } as any);

      const result = await updateAdminRole(mockTarget._id.toString(), 'manager', 'requester-id', 'super_admin');

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result!.role).toBe('manager');
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_ROLE_CHANGED',
          status: 'success',
          metadata: expect.objectContaining({
            oldRole: 'support',
            newRole: 'manager',
          }),
        })
      );
    });
  });

  describe('resetAdminPassword', () => {
    it('throws AppError.forbidden if requester is not super_admin', async () => {
      await expect(
        resetAdminPassword('target-id', { password: 'Password123!' }, 'creator-id', 'admin')
      ).rejects.toThrow('Only Super Admins can manage administrative accounts');
    });

    it('throws AppError.badRequest if trying to reset own password', async () => {
      await expect(
        resetAdminPassword('self-id', { password: 'Password123!' }, 'self-id', 'super_admin')
      ).rejects.toThrow('You cannot reset your own password using the administrator lifecycle API');
    });

    it('successfully resets password, increments passwordVersion, and logs audit event', async () => {
      const mockSave = vi.fn();
      const mockTarget = {
        _id: new Types.ObjectId(),
        email: 'admin@example.com',
        passwordHash: 'old-hash',
        passwordVersion: 0,
        save: mockSave,
        session: vi.fn().mockReturnThis(),
        toObject: vi.fn().mockReturnValue({ email: 'admin@example.com', passwordVersion: 1 }),
      };

      vi.mocked(AdminModel.findById).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockTarget),
      } as any);

      const result = await resetAdminPassword(mockTarget._id.toString(), { password: 'NewPassword123!' }, 'requester-id', 'super_admin');

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result!.passwordVersion).toBe(1);
      expect(mockTarget.passwordHash).not.toBe('old-hash');
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_PASSWORD_RESET',
          status: 'success',
        })
      );
    });
  });
});
