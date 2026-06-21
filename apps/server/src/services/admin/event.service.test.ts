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

vi.mock('./media-cleanup.service', () => ({
  safeDeleteImages: vi.fn(),
}));

import * as eventService from './event.service';
import { Event } from '../../models/event.schema';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import { TicketProfile } from '../../models/ticket-profile.schema';
import { CacheService } from '../cache.service';

vi.mock('../../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    exists: vi.fn(),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    find: vi.fn(),
  },
}));

vi.mock('../../models/ticket-profile.schema', () => ({
  TicketProfile: {
    findById: vi.fn(),
  },
}));

vi.mock('../cache.service', () => ({
  CacheService: {
    delPattern: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Admin Event Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteEvent', () => {
    it('cannot delete event with existing bookings', async () => {
      vi.mocked(Booking.exists).mockResolvedValue({ _id: 'booking-id' } as any);

      await expect(eventService.deleteEvent('event-1')).rejects.toThrow(
        'Cannot delete event with existing bookings'
      );
      expect(Event.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('cannot delete event with confirmed bookings', async () => {
      // Any booking, regardless of status, blocks deletion (Option A)
      vi.mocked(Booking.exists).mockResolvedValue({ _id: 'booking-id' } as any);

      await expect(eventService.deleteEvent('event-1')).rejects.toThrow(
        'Cannot delete event with existing bookings'
      );
    });

    it('cannot delete event with paid bookings', async () => {
      vi.mocked(Booking.exists).mockResolvedValue({ _id: 'booking-id' } as any);

      await expect(eventService.deleteEvent('event-1')).rejects.toThrow(
        'Cannot delete event with existing bookings'
      );
    });

    it('can delete unused draft event', async () => {
      vi.mocked(Booking.exists).mockResolvedValue(null);
      vi.mocked(Event.findById).mockResolvedValue({ _id: 'event-1' } as any);
      vi.mocked(Event.findByIdAndUpdate).mockResolvedValue({ _id: 'event-1', isDeleted: true } as any);

      const result = await eventService.deleteEvent('event-1');
      expect(result).not.toBeNull();
      expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(
        'event-1',
        { isDeleted: true, deletedAt: expect.any(Date) },
        { new: true }
      );
    });
  });

  describe('updateEvent - Capacity Floor Protection', () => {
    it('cannot reduce capacity below sold count', async () => {
      const existingEvent = {
        _id: 'event-1',
        ticketTiers: [
          { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 100, soldCount: 80, isActive: true },
        ],
        eventVersion: 1,
      };

      vi.mocked(Event.findById).mockResolvedValue(existingEvent as any);

      await expect(
        eventService.updateEvent('event-1', {
          ticketTiers: [
            { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 50, soldCount: 80, isActive: true },
          ],
        } as any)
      ).rejects.toThrow(
        'Cannot reduce capacity for tier "VIP Ticket" below its sold count. Sold: 80, Requested: 50'
      );
      expect(Event.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('can reduce capacity to exactly sold count', async () => {
      const existingEvent = {
        _id: 'event-1',
        ticketTiers: [
          { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 100, soldCount: 80, isActive: true },
        ],
        eventVersion: 1,
        toObject: () => existingEvent,
      };

      vi.mocked(Event.findById).mockResolvedValue(existingEvent as any);
      vi.mocked(Event.findByIdAndUpdate).mockResolvedValue({
        ...existingEvent,
        ticketTiers: [
          { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 80, soldCount: 80, isActive: true },
        ],
      } as any);
      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await eventService.updateEvent('event-1', {
        ticketTiers: [
          { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 80, soldCount: 80, isActive: true },
        ],
      } as any);

      expect(result).not.toBeNull();
      expect(Event.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('can increase capacity above sold count', async () => {
      const existingEvent = {
        _id: 'event-1',
        ticketTiers: [
          { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 100, soldCount: 80, isActive: true },
        ],
        eventVersion: 1,
        toObject: () => existingEvent,
      };

      vi.mocked(Event.findById).mockResolvedValue(existingEvent as any);
      vi.mocked(Event.findByIdAndUpdate).mockResolvedValue({
        ...existingEvent,
        ticketTiers: [
          { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 150, soldCount: 80, isActive: true },
        ],
      } as any);
      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await eventService.updateEvent('event-1', {
        ticketTiers: [
          { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 150, soldCount: 80, isActive: true },
        ],
      } as any);

      expect(result).not.toBeNull();
      expect(Event.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('deduplicateGallery', () => {
    it('deduplicates gallery images by publicId and preserves original order', () => {
      const gallery = [
        { url: 'url1', publicId: 'id1' },
        { url: 'url2', publicId: 'id2' },
        { url: 'url3', publicId: 'id1' }, // Duplicate
      ];
      const result = eventService.deduplicateGallery(gallery);
      expect(result).toEqual([
        { url: 'url1', publicId: 'id1' },
        { url: 'url2', publicId: 'id2' },
      ]);
    });

    it('returns undefined if gallery is not provided', () => {
      expect(eventService.deduplicateGallery(undefined)).toBeUndefined();
    });
  });

  describe('updateEvent - Cloudinary media cleanup hooks', () => {
    it('calls safeDeleteImages when bannerImage, posterImage are replaced or gallery images are removed', async () => {
      const existingEvent = {
        _id: 'event-1',
        bannerImage: { url: 'old-banner-url', publicId: 'old-banner' },
        posterImage: { url: 'old-poster-url', publicId: 'old-poster' },
        galleryImages: [
          { url: 'url1', publicId: 'id1' },
          { url: 'url2', publicId: 'id2' },
        ],
        eventVersion: 1,
        toObject: () => ({}),
      };

      vi.mocked(Event.findById).mockResolvedValue(existingEvent as any);
      vi.mocked(Event.findByIdAndUpdate).mockResolvedValue(existingEvent as any);
      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const { safeDeleteImages } = await import('./media-cleanup.service');

      await eventService.updateEvent('event-1', {
        bannerImage: { url: 'new-banner-url', publicId: 'new-banner' },
        posterImage: { url: 'new-poster-url', publicId: 'new-poster' },
        galleryImages: [
          { url: 'url1', publicId: 'id1' }, // kept
          // id2 removed
        ],
      } as any);

      expect(safeDeleteImages).toHaveBeenCalledWith(
        ['old-banner', 'old-poster', 'id2'],
        'Event',
        'update'
      );
    });
  });

  describe('deleteEvent - Cloudinary media cleanup hooks', () => {
    it('collects and deletes all media assets on soft-deletion', async () => {
      const existingEvent = {
        _id: 'event-1',
        bannerImage: { url: 'banner-url', publicId: 'banner' },
        posterImage: { url: 'poster-url', publicId: 'poster' },
        galleryImages: [
          { url: 'url1', publicId: 'id1' },
          { url: 'url2', publicId: 'id2' },
        ],
      };

      vi.mocked(Booking.exists).mockResolvedValue(null);
      vi.mocked(Event.findById).mockResolvedValue(existingEvent as any);
      vi.mocked(Event.findByIdAndUpdate).mockResolvedValue(existingEvent as any);

      const { safeDeleteImages } = await import('./media-cleanup.service');

      await eventService.deleteEvent('event-1');

      expect(safeDeleteImages).toHaveBeenCalledWith(
        ['banner', 'poster', 'id1', 'id2'],
        'Event',
        'delete'
      );
    });
  });
});
