import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminEventGalleryService } from './event-gallery.service';
import { EventGallery } from '../../models/event-gallery.schema';
import { EventGallerySettings } from '../../models/event-gallery-settings.schema';
import { Event } from '../../models/event.schema';
import { safeDeleteImages } from './media-cleanup.service';
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
vi.mock('./media-cleanup.service', () => ({
  safeDeleteImages: vi.fn(),
}));

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

    it('should allow uploads even when gallery is already published', async () => {
      (EventGallerySettings.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ published: true }),
      });
      (EventGallery.find as any).mockReturnValue({
        distinct: vi.fn().mockResolvedValue([]),
      });
      (EventGallery.countDocuments as any).mockResolvedValue(1);
      (EventGallery.exists as any).mockResolvedValue(true);

      const mockInserted = [
        { _id: '2', publicId: 'p2', isCover: false, toObject: () => ({ isCover: false }) },
      ];
      (EventGallery.insertMany as any).mockResolvedValue(mockInserted);

      const items = await AdminEventGalleryService.addItems(
        eventId,
        {
          items: [{ url: 'url2', publicId: 'p2', mediaType: 'IMAGE' as any, assetProvider: 'cloudinary' }],
        },
        adminId
      );

      expect(items).toHaveLength(1);
    });

    it('should throw bad request when adding items exceeds 20 items cap', async () => {
      (EventGallery.find as any).mockReturnValue({
        distinct: vi.fn().mockResolvedValue([]),
      });
      (EventGallery.countDocuments as any).mockResolvedValue(19);

      await expect(
        AdminEventGalleryService.addItems(
          eventId,
          {
            items: [
              { url: 'url1', publicId: 'p1', mediaType: 'IMAGE' as any, assetProvider: 'cloudinary' },
              { url: 'url2', publicId: 'p2', mediaType: 'IMAGE' as any, assetProvider: 'cloudinary' },
            ],
          },
          adminId
        )
      ).rejects.toThrow('Event gallery limit reached (maximum 20 photos allowed)');
    });
  });

  describe('updateSettings', () => {
    it('should allow publishing and unpublishing gallery freely', async () => {
      const mockSettings = {
        published: true,
        save: vi.fn().mockResolvedValue(true),
        toObject: vi.fn().mockReturnValue({ published: false }),
      };
      (EventGallerySettings.findOne as any).mockResolvedValue(mockSettings);

      const result = await AdminEventGalleryService.updateSettings(eventId, { published: false }, adminId);

      expect(mockSettings.published).toBe(false);
      expect(mockSettings.save).toHaveBeenCalled();
      expect(result.published).toBe(false);
    });
  });

  describe('deleteItem', () => {
    it('should delete non-cover item and trigger safeDeleteImages', async () => {
      const itemId = 'item-1';
      (EventGallery.findOne as any).mockResolvedValue({
        _id: itemId,
        eventId,
        publicId: 'cloudinary-p1',
        isCover: false,
      });
      (EventGallery.deleteOne as any).mockResolvedValue({ deletedCount: 1 });

      const result = await AdminEventGalleryService.deleteItem(eventId, itemId, adminId);

      expect(EventGallery.deleteOne).toHaveBeenCalledWith({ _id: itemId, eventId });
      expect(safeDeleteImages).toHaveBeenCalledWith(['cloudinary-p1'], 'Event', 'delete');
      expect(result).toEqual({ success: true });
    });

    it('should delete cover item and automatically reassign cover to next item', async () => {
      const itemId = 'item-cover';
      const nextItem = {
        _id: 'item-2',
        isCover: false,
        save: vi.fn().mockResolvedValue(true),
      };

      (EventGallery.findOne as any).mockImplementation((query: any) => {
        if (query._id === itemId) {
          return Promise.resolve({
            _id: itemId,
            eventId,
            publicId: 'cloudinary-cover',
            isCover: true,
          });
        }
        return {
          sort: vi.fn().mockResolvedValue(nextItem),
        };
      });
      (EventGallery.deleteOne as any).mockResolvedValue({ deletedCount: 1 });

      const result = await AdminEventGalleryService.deleteItem(eventId, itemId, adminId);

      expect(EventGallery.deleteOne).toHaveBeenCalledWith({ _id: itemId, eventId });
      expect(safeDeleteImages).toHaveBeenCalledWith(['cloudinary-cover'], 'Event', 'delete');
      expect(nextItem.isCover).toBe(true);
      expect(nextItem.save).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should throw 404 when item does not exist or belongs to another event', async () => {
      (EventGallery.findOne as any).mockResolvedValue(null);

      await expect(
        AdminEventGalleryService.deleteItem(eventId, 'missing-item', adminId)
      ).rejects.toThrow('Gallery item');
    });
  });

  describe('setCoverItem', () => {
    it('should reset previous cover and set new cover on target item', async () => {
      const itemId = 'item-target';
      (EventGallery.findOne as any).mockResolvedValue({
        _id: itemId,
        eventId,
        isCover: false,
      });
      (EventGallery.updateMany as any).mockResolvedValue({ modifiedCount: 1 });
      (EventGallery.findByIdAndUpdate as any).mockResolvedValue({
        _id: itemId,
        isCover: true,
      });

      const result = await AdminEventGalleryService.setCoverItem(eventId, itemId, adminId);

      expect(EventGallery.updateMany).toHaveBeenCalledWith(
        { eventId, isCover: true },
        { isCover: false }
      );
      expect(EventGallery.findByIdAndUpdate).toHaveBeenCalledWith(itemId, { isCover: true });
      expect(result).toEqual({ success: true });
    });

    it('should throw 404 if item does not exist', async () => {
      (EventGallery.findOne as any).mockResolvedValue(null);

      await expect(
        AdminEventGalleryService.setCoverItem(eventId, 'non-existent', adminId)
      ).rejects.toThrow('Gallery item');
    });
  });

  describe('updateItem', () => {
    it('should update caption of existing item', async () => {
      const itemId = 'item-1';
      const mockDoc = {
        _id: itemId,
        eventId,
        caption: 'Old caption',
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({
          _id: itemId,
          eventId,
          caption: 'New exciting caption',
          mediaType: 'IMAGE',
          url: 'https://cloudinary.com/img.jpg',
          publicId: 'img_p1',
          sortOrder: 0,
          isCover: true,
          visibility: 'PUBLIC',
        }),
      };
      (EventGallery.findOne as any).mockResolvedValue(mockDoc);

      const result = await AdminEventGalleryService.updateItem(
        eventId,
        itemId,
        { caption: 'New exciting caption' },
        adminId
      );

      expect(mockDoc.caption).toBe('New exciting caption');
      expect(mockDoc.save).toHaveBeenCalled();
      expect(result.caption).toBe('New exciting caption');
    });
  });

  describe('reorderItems', () => {
    it('should update sortOrder for all specified item IDs', async () => {
      const itemIds = ['id-1', 'id-2', 'id-3'];
      (EventGallery.find as any).mockReturnValue({
        select: vi.fn().mockResolvedValue([
          { _id: 'id-1' },
          { _id: 'id-2' },
          { _id: 'id-3' },
        ]),
      });
      (EventGallery.bulkWrite as any).mockResolvedValue({ ok: 1 });

      const result = await AdminEventGalleryService.reorderItems(eventId, { itemIds }, adminId);

      expect(EventGallery.bulkWrite).toHaveBeenCalledWith([
        { updateOne: { filter: { _id: 'id-1', eventId }, update: { $set: { sortOrder: 0 } } } },
        { updateOne: { filter: { _id: 'id-2', eventId }, update: { $set: { sortOrder: 1 } } } },
        { updateOne: { filter: { _id: 'id-3', eventId }, update: { $set: { sortOrder: 2 } } } },
      ]);
      expect(result).toEqual({ success: true });
    });

    it('should reject reorder if any item ID does not belong to the event', async () => {
      const itemIds = ['id-1', 'id-foreign'];
      (EventGallery.find as any).mockReturnValue({
        select: vi.fn().mockResolvedValue([{ _id: 'id-1' }]),
      });

      await expect(
        AdminEventGalleryService.reorderItems(eventId, { itemIds }, adminId)
      ).rejects.toThrow('Invalid gallery item IDs in reorder request');
    });
  });
});
