import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminEventGalleryService } from './event-gallery.service';
import { EventGallery, MediaVisibility } from '../../models/event-gallery.schema';
import { Event } from '../../models/event.schema';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

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

// Mock mongoose transactions
vi.spyOn(mongoose, 'startSession').mockResolvedValue({
  startTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  abortTransaction: vi.fn(),
  endSession: vi.fn(),
} as any);

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
  });

  describe('updateItem', () => {
    it('should update caption and visibility', async () => {
      const mockItem = {
        _id: '1',
        caption: 'old',
        visibility: MediaVisibility.PUBLIC,
        save: vi.fn().mockResolvedValue(true),
        toObject: function() { return this; }
      };

      (EventGallery.findOne as any).mockResolvedValue(mockItem);

      await AdminEventGalleryService.updateItem(eventId, '1', {
        caption: 'new',
        visibility: MediaVisibility.PRIVATE
      });

      expect(mockItem.caption).toBe('new');
      expect(mockItem.visibility).toBe(MediaVisibility.PRIVATE);
      expect(mockItem.save).toHaveBeenCalled();
    });
  });

  describe('setCover', () => {
    it('should unset previous cover and set new cover', async () => {
      const mockNewCover = {
        _id: '2',
        isCover: false,
        save: vi.fn().mockResolvedValue(true),
        toObject: function() { return this; }
      };
      
      const mockSession = {
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        abortTransaction: vi.fn(),
        endSession: vi.fn(),
      };
      (mongoose.startSession as any).mockResolvedValue(mockSession);

      (EventGallery.findOne as any).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockNewCover)
      });

      (EventGallery.updateMany as any).mockReturnValue({
        session: vi.fn().mockResolvedValue({ modifiedCount: 1 })
      });

      await AdminEventGalleryService.setCover(eventId, '2');

      expect(EventGallery.updateMany).toHaveBeenCalledWith(
        { eventId, isCover: true },
        { $set: { isCover: false } }
      );
      expect(mockNewCover.isCover).toBe(true);
      expect(mockNewCover.save).toHaveBeenCalledWith({ session: mockSession });
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });
  });
});
