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

vi.mock('../../models/dj-operator.schema', () => ({
  DJOperator: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('./media-cleanup.service', () => ({
  safeDeleteImages: vi.fn(),
}));

vi.mock('../cache.service', () => ({
  CacheService: {
    delPattern: vi.fn().mockResolvedValue(undefined),
  },
}));

import * as djOperatorService from './dj-operator.service';
import { DJOperator } from '../../models/dj-operator.schema';
import { safeDeleteImages } from './media-cleanup.service';

describe('Admin DJ Operator Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateDJOperator - Cloudinary media cleanup hooks', () => {
    it('calls safeDeleteImages when profileImage is replaced', async () => {
      const existingDJ = {
        _id: 'dj-1',
        profileImage: { url: 'old-profile-url', publicId: 'old-profile' },
      };

      vi.mocked(DJOperator.findById).mockResolvedValue(existingDJ as any);
      vi.mocked(DJOperator.findByIdAndUpdate).mockResolvedValue(existingDJ as any);

      await djOperatorService.updateDJOperator('dj-1', {
        profileImage: { url: 'new-profile-url', publicId: 'new-profile' },
      } as any);

      expect(safeDeleteImages).toHaveBeenCalledWith(
        ['old-profile'],
        'DJOperator',
        'update'
      );
    });

    it('does not call safeDeleteImages when profileImage is same', async () => {
      const existingDJ = {
        _id: 'dj-1',
        profileImage: { url: 'profile-url', publicId: 'profile-1' },
      };

      vi.mocked(DJOperator.findById).mockResolvedValue(existingDJ as any);
      vi.mocked(DJOperator.findByIdAndUpdate).mockResolvedValue(existingDJ as any);

      await djOperatorService.updateDJOperator('dj-1', {
        profileImage: { url: 'profile-url', publicId: 'profile-1' },
      } as any);

      expect(safeDeleteImages).not.toHaveBeenCalled();
    });
  });

  describe('deleteDJOperator - Cloudinary media cleanup hooks', () => {
    it('collects and deletes profileImage publicId on soft-deletion', async () => {
      const existingDJ = {
        _id: 'dj-1',
        profileImage: { url: 'profile-url', publicId: 'profile-1' },
      };

      vi.mocked(DJOperator.findById).mockResolvedValue(existingDJ as any);
      vi.mocked(DJOperator.findByIdAndUpdate).mockResolvedValue(existingDJ as any);

      await djOperatorService.deleteDJOperator('dj-1');

      expect(safeDeleteImages).toHaveBeenCalledWith(
        ['profile-1'],
        'DJOperator',
        'delete'
      );
    });

    it('does not trigger safeDeleteImages if profileImage is missing', async () => {
      const existingDJ = {
        _id: 'dj-1',
      };

      vi.mocked(DJOperator.findById).mockResolvedValue(existingDJ as any);
      vi.mocked(DJOperator.findByIdAndUpdate).mockResolvedValue(existingDJ as any);

      await djOperatorService.deleteDJOperator('dj-1');

      expect(safeDeleteImages).not.toHaveBeenCalled();
    });
  });
});
