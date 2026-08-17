import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminEventGalleryService } from './event-gallery.service';
import { EventGallery } from '../../models/event-gallery.schema';
import { EventGallerySettings } from '../../models/event-gallery-settings.schema';
import { Event } from '../../models/event.schema';
import { Types } from 'mongoose';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn().mockReturnValue({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'super-secret-jwt-key-for-users-12345',
    JWT_ADMIN_SECRET: 'super-secret-jwt-key-for-admin-12345',
    JWT_SESSION_SECRET: 'super-secret-jwt-key-for-session-12345',
  })
}));

vi.mock('../../models/event-gallery.schema');
vi.mock('../../models/event-gallery-settings.schema');
vi.mock('../../models/event.schema');

describe('AdminEventGalleryService', () => {
  const eventId = new Types.ObjectId().toString();
  const adminId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();

    (Event.findById as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: eventId,
          status: 'published',
          startDate: new Date('2026-07-10T12:00:00.000Z'),
          endDate: new Date('2026-07-10T16:00:00.000Z'),
          bookingEndDate: new Date('2026-07-10T12:00:00.000Z'),
        })
      })
    });

    // Default: gallery not yet published
    (EventGallerySettings.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });
  });

  describe('addItems', () => {
    it('should add items and assign cover to the first item if gallery is empty', async () => {
      (EventGallery.find as any).mockReturnValue({
        distinct: vi.fn().mockResolvedValue([])
      });
      (EventGallery.countDocuments as any).mockResolvedValue(0);
      (EventGallery.exists as any).mockResolvedValue(false);

      const mockInserted = [
        { _id: '1', publicId: 'p1', isCover: true, toObject: () => ({ isCover: true }) },
        { _id: '2', publicId: 'p2', isCover: false, toObject: () => ({ isCover: false }) }
      ];
      (EventGallery.insertMany as any).mockResolvedValue(mockInserted);

      const items = await AdminEventGalleryService.addItems(eventId, {
        items: [
          { url: 'url1', publicId: 'p1', mediaType: 'IMAGE' as any, assetProvider: 'cloudinary' },
          { url: 'url2', publicId: 'p2', mediaType: 'IMAGE' as any, assetProvider: 'cloudinary' }
        ]
      }, adminId);

      expect(EventGallery.insertMany).toHaveBeenCalledWith([
        expect.objectContaining({ publicId: 'p1', isCover: true, sortOrder: 0 }),
        expect.objectContaining({ publicId: 'p2', isCover: false, sortOrder: 1 })
      ]);
      expect(items).toHaveLength(2);
    });

    it('should reject uploads if the gallery is already published (hard lock)', async () => {
      (EventGallerySettings.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ published: true }),
      });

      await expect(
        AdminEventGalleryService.addItems(eventId, {
          items: [{ url: 'url1', publicId: 'p1', mediaType: 'IMAGE' as any, assetProvider: 'cloudinary' }]
        }, adminId)
      ).rejects.toThrow('Modifications are locked: Gallery is already published');
    });
  });

  describe('updateSettings', () => {
    it('should reject publish toggle if gallery is already published (one-way lock)', async () => {
      (EventGallerySettings.findOne as any).mockResolvedValue({
        published: true,
        save: vi.fn(),
      });

      await expect(
        AdminEventGalleryService.updateSettings(eventId, { published: true }, adminId)
      ).rejects.toThrow('Gallery is already published and cannot be modified');
    });
  });
});
