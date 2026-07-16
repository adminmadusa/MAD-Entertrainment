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

vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('@mad/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mad/shared')>();
  const sharedSource = await vi.importActual<typeof import('../../../../../packages/shared/src')>(
    '../../../../../packages/shared/src'
  );

  return {
    ...actual,
    EVENT_STATUS_TRANSITIONS: sharedSource.EVENT_STATUS_TRANSITIONS,
  };
});

import { EventStatus, HTTP_STATUS, EventMemoryPublicationState } from '@mad/shared';

import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Ticket } from '../../models/ticket.schema';
import { CacheService } from '../cache.service';
import * as eventService from './event.service';

vi.mock('../../models/event.schema', () => ({
  Event: Object.assign(vi.fn(function (this: any, data: any) {
    Object.assign(this, data);
    this.save = vi.fn().mockResolvedValue(this);
  }), {
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
  }),
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
    vi.mocked(Event.findOne).mockResolvedValue(null);
  });

  describe('createEvent - Initial Lifecycle Governance', () => {
    it('allows initial status published', async () => {
      const result = await eventService.createEvent({ status: EventStatus.PUBLISHED } as any);

      expect(result.status).toBe(EventStatus.PUBLISHED);
      expect(Event).toHaveBeenCalledWith({ status: EventStatus.PUBLISHED });
      expect(CacheService.delPattern).toHaveBeenCalledWith('events:*');
    });

    it.each([
      EventStatus.DRAFT,
      EventStatus.COMPLETED,
      EventStatus.CANCELLED,
      EventStatus.POSTPONED,
    ])('rejects initial status %s with conflict', async (status) => {
      try {
        await eventService.createEvent({ status } as any);
        throw new Error('Expected createEvent to reject');
      } catch (error) {
        expect(error).toMatchObject({
          message: 'Invalid initial event status',
          statusCode: HTTP_STATUS.CONFLICT,
        });
      }

      expect(Event).not.toHaveBeenCalled();
      expect(CacheService.delPattern).not.toHaveBeenCalled();
    });


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
          eventVersion: 1,
          ticketTiers: [
            { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 50, soldCount: 80, isActive: true },
          ],
        } as any)
      ).rejects.toThrow(
        'Cannot reduce capacity for tier "VIP Ticket" below its sold count. Sold: 80, Requested: 50'
      );
      expect(Event.findOneAndUpdate).not.toHaveBeenCalled();
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
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({
        ...existingEvent,
        ticketTiers: [
          { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 80, soldCount: 80, isActive: true },
        ],
      } as any);
      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await eventService.updateEvent('event-1', {
        eventVersion: 1,
        ticketTiers: [
          { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 80, soldCount: 80, isActive: true },
        ],
      } as any);

      expect(result).not.toBeNull();
      expect(Event.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'event-1', eventVersion: 1 },
        {
          $set: {
            ticketTiers: [
              { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 80, soldCount: 80, isActive: true },
            ],
          },
          $inc: { eventVersion: 1 },
        },
        { new: true }
      );
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
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue({
        ...existingEvent,
        ticketTiers: [
          { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 150, soldCount: 80, isActive: true },
        ],
      } as any);
      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await eventService.updateEvent('event-1', {
        eventVersion: 1,
        ticketTiers: [
          { tier: 'VIP', name: 'VIP Ticket', totalCapacity: 150, soldCount: 80, isActive: true },
        ],
      } as any);

      expect(result).not.toBeNull();
      expect(Event.findOneAndUpdate).toHaveBeenCalled();
    });

    it('rejects stale eventVersion conflicts without applying update side effects', async () => {
      const existingEvent = {
        _id: 'event-1',
        ticketTiers: [],
        eventVersion: 2,
      };

      vi.mocked(Event.findById).mockResolvedValue(existingEvent as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue(null);

      await expect(
        eventService.updateEvent('event-1', {
          eventVersion: 1,
          title: 'Stale Update',
        } as any)
      ).rejects.toThrow('Event has been modified by another process. Please refresh and try again.');

      expect(Event.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'event-1', eventVersion: 1 },
        {
          $set: { title: 'Stale Update' },
          $inc: { eventVersion: 1 },
        },
        { new: true }
      );
      expect(CacheService.delPattern).not.toHaveBeenCalled();
    });

    it('requires eventVersion for admin updates', async () => {
      const existingEvent = {
        _id: 'event-1',
        ticketTiers: [],
        eventVersion: 2,
      };

      vi.mocked(Event.findById).mockResolvedValue(existingEvent as any);

      await expect(
        eventService.updateEvent('event-1', {
          title: 'Missing Version',
        } as any)
      ).rejects.toThrow('Event version is required for update');

      expect(Event.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('updateEvent - Event Lifecycle Governance', () => {
    const mockSuccessfulStatusUpdate = (currentStatus: EventStatus, nextStatus: EventStatus) => {
      const existingEvent = {
        _id: 'event-1',
        status: currentStatus,
        ticketTiers: [],
        eventVersion: 1,
      } as any;
      const updatedEvent = {
        ...existingEvent,
        status: nextStatus,
      } as any;
      updatedEvent.toObject = () => updatedEvent;

      vi.mocked(Event.findById).mockResolvedValue(existingEvent);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue(updatedEvent);
      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);
    };

    it.each([
      [EventStatus.DRAFT, EventStatus.PUBLISHED],
      [EventStatus.DRAFT, EventStatus.CANCELLED],
      [EventStatus.PUBLISHED, EventStatus.POSTPONED],
      [EventStatus.PUBLISHED, EventStatus.COMPLETED],
      [EventStatus.PUBLISHED, EventStatus.CANCELLED],
      [EventStatus.POSTPONED, EventStatus.PUBLISHED],
      [EventStatus.POSTPONED, EventStatus.CANCELLED],
    ])('allows %s -> %s', async (currentStatus, nextStatus) => {
      mockSuccessfulStatusUpdate(currentStatus, nextStatus);

      const result = await eventService.updateEvent('event-1', {
        eventVersion: 1,
        status: nextStatus,
      } as any);

      expect(result.status).toBe(nextStatus);
      expect(Event.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'event-1', eventVersion: 1 },
        {
          $set: { status: nextStatus },
          $inc: { eventVersion: 1 },
        },
        { new: true }
      );
    });

    it.each([
      [EventStatus.COMPLETED, EventStatus.DRAFT],
      [EventStatus.COMPLETED, EventStatus.PUBLISHED],
      [EventStatus.CANCELLED, EventStatus.PUBLISHED],
      [EventStatus.CANCELLED, EventStatus.DRAFT],
      [EventStatus.PUBLISHED, EventStatus.DRAFT],
    ])('rejects %s -> %s with conflict', async (currentStatus, nextStatus) => {
      const existingEvent = {
        _id: 'event-1',
        status: currentStatus,
        ticketTiers: [],
        eventVersion: 1,
      };

      vi.mocked(Event.findById).mockResolvedValue(existingEvent as any);

      try {
        await eventService.updateEvent('event-1', {
          eventVersion: 1,
          status: nextStatus,
        } as any);
        throw new Error('Expected updateEvent to reject');
      } catch (error) {
        expect(error).toMatchObject({
          message: 'Invalid event status transition.',
          statusCode: HTTP_STATUS.CONFLICT,
        });
      }

      expect(Event.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('allows no-op status updates', async () => {
      mockSuccessfulStatusUpdate(EventStatus.PUBLISHED, EventStatus.PUBLISHED);

      const result = await eventService.updateEvent('event-1', {
        eventVersion: 1,
        status: EventStatus.PUBLISHED,
      } as any);

      expect(result.status).toBe(EventStatus.PUBLISHED);
      expect(Event.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('updateEvent - Cloudinary media cleanup hooks', () => {
    it('calls safeDeleteImages when bannerImage, posterImage are replaced', async () => {
      const existingEvent = {
        _id: 'event-1',
        bannerImage: { url: 'old-banner-url', publicId: 'old-banner' },
        posterImage: { url: 'old-poster-url', publicId: 'old-poster' },
        eventVersion: 1,
        toObject: () => ({}),
      };

      vi.mocked(Event.findById).mockResolvedValue(existingEvent as any);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue(existingEvent as any);
      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const { safeDeleteImages } = await import('./media-cleanup.service');

      await eventService.updateEvent('event-1', {
        eventVersion: 1,
        bannerImage: { url: 'new-banner-url', publicId: 'new-banner' },
        posterImage: { url: 'new-poster-url', publicId: 'new-poster' },
      } as any);

      expect(safeDeleteImages).toHaveBeenCalledWith(
        ['old-banner', 'old-poster'],
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
      };

      vi.mocked(Booking.exists).mockResolvedValue(null);
      vi.mocked(Event.findById).mockResolvedValue(existingEvent as any);
      vi.mocked(Event.findByIdAndUpdate).mockResolvedValue(existingEvent as any);

      const { safeDeleteImages } = await import('./media-cleanup.service');

      await eventService.deleteEvent('event-1');

      expect(safeDeleteImages).toHaveBeenCalledWith(
        ['banner', 'poster'],
        'Event',
        'delete'
      );
    });
  });

  describe('validateEventImagesPayload', () => {
    it('succeeds for valid payload (banner + poster)', () => {
      const banner = { publicId: 'banner', hash: 'hash-banner' };
      const poster = { publicId: 'poster', hash: 'hash-poster' };

      expect(() => eventService.validateEventImagesPayload(banner, poster)).not.toThrow();
    });

    it('throws bad request when duplicate publicId is present', () => {
      const banner = { publicId: 'banner', hash: 'hash-banner' };
      const poster = { publicId: 'banner', hash: 'hash-poster' }; // duplicate publicId

      expect(() => eventService.validateEventImagesPayload(banner, poster)).toThrow(
        'Duplicate image detected'
      );
    });

    it('throws bad request when duplicate hash is present', () => {
      const banner = { publicId: 'banner', hash: 'hash-1' };
      const poster = { publicId: 'poster', hash: 'hash-1' }; // duplicate hash

      expect(() => eventService.validateEventImagesPayload(banner, poster)).toThrow(
        'Duplicate image detected'
      );
    });
  });

  describe('createEvent / updateEvent integration with image validations', () => {
    it('throws bad request during createEvent if images are invalid', async () => {
      const invalidData = {
        bannerImage: { publicId: 'banner', hash: 'hash-1' },
        posterImage: { publicId: 'poster', hash: 'hash-1' }, // duplicate hash
      };

      await expect(eventService.createEvent(invalidData as any)).rejects.toThrow(
        'Duplicate image detected'
      );
    });

    it('throws bad request during updateEvent if merged images are invalid', async () => {
      const existingEvent = {
        _id: 'event-1',
        bannerImage: { publicId: 'banner', hash: 'hash-banner' },
        posterImage: { publicId: 'poster', hash: 'hash-poster' },
        eventVersion: 1,
        toObject: () => ({}),
      };

      vi.mocked(Event.findById).mockResolvedValue(existingEvent as any);

      await expect(
        eventService.updateEvent('event-1', {
          eventVersion: 1,
          posterImage: { url: 'p-url', publicId: 'p1', hash: 'hash-banner' }, // duplicate of existing banner hash
        } as any)
      ).rejects.toThrow('Duplicate image detected');
    });
  });

});
