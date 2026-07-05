import { describe, it, expect, vi, beforeEach } from 'vitest';

// Declare mock functions that will be hoisted
const { mockResources } = vi.hoisted(() => ({
  mockResources: vi.fn(),
}));

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    CLOUDINARY_CLOUD_NAME: 'test_cloud',
    CLOUDINARY_API_KEY: 'test_key',
    CLOUDINARY_API_SECRET: 'test_secret',
  })),
}));

vi.mock('../../config/cloudinary', () => ({
  cloudinary: {
    api: {
      resources: mockResources,
    },
  },
}));

vi.mock('../../models/event.schema', () => ({
  Event: {
    exists: vi.fn(),
  },
}));

vi.mock('./upload.service', () => ({
  UploadService: {
    deleteImage: vi.fn(),
  },
}));

import { Event } from '../../models/event.schema';
import { safeDeleteImages, cleanupTemporaryAssets } from './media-cleanup.service';
import { UploadService } from './upload.service';

describe('MediaCleanupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('safeDeleteImages', () => {
    it('filters out empty/falsy IDs and calls UploadService.deleteImage for each valid ID', async () => {
      vi.mocked(UploadService.deleteImage).mockResolvedValue(undefined);

      // Trigger fire-and-forget delete
      safeDeleteImages(['id-1', '', 'id-2', null as any], 'Event', 'update');

      // Wait a tiny bit since Promise.all runs in background
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(UploadService.deleteImage).toHaveBeenCalledTimes(2);
      expect(UploadService.deleteImage).toHaveBeenCalledWith('id-1');
      expect(UploadService.deleteImage).toHaveBeenCalledWith('id-2');
    });

    it('logs error but does not crash if deletion fails', async () => {
      vi.mocked(UploadService.deleteImage).mockRejectedValue(new Error('Cloudinary delete error'));

      safeDeleteImages(['id-fail'], 'Event', 'delete');

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not throw, just completes
      expect(UploadService.deleteImage).toHaveBeenCalledWith('id-fail');
    });
  });

  describe('cleanupTemporaryAssets', () => {
    it('sweeps temporary folder, deletes unreferenced old assets, and keeps referenced or new ones', async () => {
      const now = Date.now();
      const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000).toISOString();
      const thirtyHoursAgo = new Date(now - 30 * 60 * 60 * 1000).toISOString();

      const mockResponse = {
        resources: [
          {
            public_id: 'mad-entertrainment/events/temp/session1/hash_new',
            created_at: twelveHoursAgo, // New: should not be deleted
          },
          {
            public_id: 'mad-entertrainment/events/temp/session2/hash_referenced',
            created_at: thirtyHoursAgo, // Old, but referenced: should not be deleted
          },
          {
            public_id: 'mad-entertrainment/events/temp/session3/hash_unreferenced',
            created_at: thirtyHoursAgo, // Old, unreferenced: should be deleted
          },
        ],
      };

      mockResources.mockImplementation((options, callback) => {
        expect(options.prefix).toBe('mad-entertrainment/events/temp/');
        callback(null, mockResponse);
      });

      // Mock Event.exists
      vi.mocked(Event.exists).mockImplementation(async (query: any) => {
        const conditions = query.$or;
        const hasReferenced = conditions.some((c: any) =>
          c['bannerImage.publicId']?.includes('hash_referenced') ||
          c['posterImage.publicId']?.includes('hash_referenced') ||
          c['galleryImages.publicId']?.includes('hash_referenced')
        );
        return hasReferenced ? ({ _id: 'event-1' } as any) : null;
      });

      vi.mocked(UploadService.deleteImage).mockResolvedValue(undefined);

      const result = await cleanupTemporaryAssets();

      expect(result.checkedCount).toBe(3);
      expect(result.deletedCount).toBe(1);

      expect(UploadService.deleteImage).toHaveBeenCalledTimes(1);
      expect(UploadService.deleteImage).toHaveBeenCalledWith('mad-entertrainment/events/temp/session3/hash_unreferenced');
      expect(UploadService.deleteImage).not.toHaveBeenCalledWith('mad-entertrainment/events/temp/session2/hash_referenced');
      expect(UploadService.deleteImage).not.toHaveBeenCalledWith('mad-entertrainment/events/temp/session1/hash_new');
    });

    it('handles API errors gracefully by logging and returning zero stats', async () => {
      mockResources.mockImplementation((options, callback) => {
        callback(new Error('Cloudinary API is down'), null);
      });

      const result = await cleanupTemporaryAssets();

      expect(result.checkedCount).toBe(0);
      expect(result.deletedCount).toBe(0);
      expect(UploadService.deleteImage).not.toHaveBeenCalled();
    });
  });
});
