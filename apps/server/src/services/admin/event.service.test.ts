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

import * as eventService from './event.service';
import { EventStatus, HTTP_STATUS, EventMemoryPublicationState } from '@mad/shared';
import { Event } from '../../models/event.schema';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import { TicketProfile } from '../../models/ticket-profile.schema';
import { CacheService } from '../cache.service';
import { createEventSchema } from '../../validations/admin-content.validation';

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
    it.each([EventStatus.DRAFT, EventStatus.PUBLISHED])('allows initial status %s', async (status) => {
      const result = await eventService.createEvent({ status } as any);

      expect(result.status).toBe(status);
      expect(Event).toHaveBeenCalledWith({ status });
      expect(CacheService.delPattern).toHaveBeenCalledWith('events:*');
    });

    it.each([
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
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue(existingEvent as any);
      vi.mocked(Ticket.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const { safeDeleteImages } = await import('./media-cleanup.service');

      await eventService.updateEvent('event-1', {
        eventVersion: 1,
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

  describe('validateEventImagesPayload', () => {
    it('succeeds for valid payload (banner + poster + gallery count <= 15)', () => {
      const banner = { publicId: 'banner', hash: 'hash-banner' };
      const poster = { publicId: 'poster', hash: 'hash-poster' };
      const gallery = [{ publicId: 'g1', hash: 'hash-g1' }, { publicId: 'g2', hash: 'hash-g2' }];

      expect(() => eventService.validateEventImagesPayload(banner, poster, gallery)).not.toThrow();
    });

    it('throws bad request when total count > 15', () => {
      const banner = { publicId: 'banner', hash: 'hash-banner' };
      const poster = { publicId: 'poster', hash: 'hash-poster' };
      const gallery = Array.from({ length: 14 }, (_, i) => ({ publicId: `g-${i}`, hash: `hash-${i}` }));

      expect(() => eventService.validateEventImagesPayload(banner, poster, gallery)).toThrow(
        'Total event images cannot exceed 15'
      );
    });

    it('throws bad request when duplicate publicId is present', () => {
      const banner = { publicId: 'banner', hash: 'hash-banner' };
      const poster = { publicId: 'banner', hash: 'hash-poster' }; // duplicate publicId
      const gallery = [{ publicId: 'g1', hash: 'hash-g1' }];

      expect(() => eventService.validateEventImagesPayload(banner, poster, gallery)).toThrow(
        'Duplicate image detected'
      );
    });

    it('throws bad request when duplicate hash is present', () => {
      const banner = { publicId: 'banner', hash: 'hash-1' };
      const poster = { publicId: 'poster', hash: 'hash-poster' };
      const gallery = [{ publicId: 'g1', hash: 'hash-1' }]; // duplicate hash

      expect(() => eventService.validateEventImagesPayload(banner, poster, gallery)).toThrow(
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
        galleryImages: [],
        eventVersion: 1,
        toObject: () => ({}),
      };

      vi.mocked(Event.findById).mockResolvedValue(existingEvent as any);

      await expect(
        eventService.updateEvent('event-1', {
          eventVersion: 1,
          galleryImages: [{ url: 'g-url', publicId: 'g1', hash: 'hash-banner' }], // duplicate of existing banner hash
        } as any)
      ).rejects.toThrow('Duplicate image detected');
    });
  });


  // ─── Event Memories Test Suite ──────────────────────────────────────────────
  describe('updateEvent - Event Memories', () => {
    const makeExistingEvent = (overrides = {}) => ({
      _id: 'event-1',
      status: 'COMPLETED',
      ticketTiers: [],
      eventVersion: 1,
      memories: null,
      toObject: function () { return this; },
      ...overrides,
    });

    const makeUpdatedEvent = (existingEvent, extra = {}) => ({
      ...existingEvent,
      ...extra,
      toObject: function () { return this; },
    });

    const setupMocks = (existing, updated) => {
      vi.mocked(Event.findById).mockResolvedValue(existing);
      vi.mocked(Event.findOneAndUpdate).mockResolvedValue(updated);
      vi.mocked(Ticket.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    };

    it('stamps publishedAt on first publish (null to PUBLISHED)', async () => {
      const existing = makeExistingEvent({ memories: null });
      const memories = { publicationState: EventMemoryPublicationState.PUBLISHED, gallery: [] };
      const updated = makeUpdatedEvent(existing, { memories: { ...memories, publishedAt: new Date() } });
      setupMocks(existing, updated);
      await eventService.updateEvent('event-1', { eventVersion: 1, memories });
      const setArg = vi.mocked(Event.findOneAndUpdate).mock.calls[0][1].$set;
      expect(setArg.memories.publishedAt).toBeInstanceOf(Date);
    });

    it('preserves original publishedAt on re-publish (HIDDEN to PUBLISHED)', async () => {
      const originalDate = new Date('2025-01-01T00:00:00Z');
      const existing = makeExistingEvent({
        memories: { publicationState: EventMemoryPublicationState.HIDDEN, gallery: [], publishedAt: originalDate },
      });
      const memories = { publicationState: EventMemoryPublicationState.PUBLISHED, gallery: [] };
      const updated = makeUpdatedEvent(existing, { memories: { ...memories, publishedAt: originalDate } });
      setupMocks(existing, updated);
      await eventService.updateEvent('event-1', { eventVersion: 1, memories });
      const setArg = vi.mocked(Event.findOneAndUpdate).mock.calls[0][1].$set;
      expect(setArg.memories.publishedAt).toEqual(originalDate);
    });

    it('does NOT overwrite publishedAt when editing already-published memories', async () => {
      const existing = makeExistingEvent({
        memories: { publicationState: EventMemoryPublicationState.PUBLISHED, gallery: [], publishedAt: new Date('2025-01-01') },
      });
      const memories = { publicationState: EventMemoryPublicationState.PUBLISHED, gallery: [{ url: 'u', publicId: 'p', order: 0 }] };
      const updated = makeUpdatedEvent(existing, { memories });
      setupMocks(existing, updated);
      await eventService.updateEvent('event-1', { eventVersion: 1, memories });
      const setArg = vi.mocked(Event.findOneAndUpdate).mock.calls[0][1].$set;
      expect(setArg.memories.publishedAt).toBeUndefined();
    });

    it('removes memory gallery images dropped from the update payload', async () => {
      const existing = makeExistingEvent({
        memories: { publicationState: EventMemoryPublicationState.DRAFT, gallery: [
          { url: 'u1', publicId: 'keep', order: 0 },
          { url: 'u2', publicId: 'remove-me', order: 1 },
        ]},
      });
      const memories = { publicationState: EventMemoryPublicationState.DRAFT, gallery: [{ url: 'u1', publicId: 'keep', order: 0 }] };
      setupMocks(existing, makeUpdatedEvent(existing, { memories }));
      const { safeDeleteImages } = await import('./media-cleanup.service');
      await eventService.updateEvent('event-1', { eventVersion: 1, memories });
      expect(safeDeleteImages).toHaveBeenCalledWith(expect.arrayContaining(['remove-me']), 'Event', 'update');
    });

    it('does NOT delete gallery images when memories is absent from payload', async () => {
      const existing = makeExistingEvent({
        memories: { publicationState: EventMemoryPublicationState.PUBLISHED, gallery: [{ url: 'u', publicId: 'keep', order: 0 }] },
      });
      setupMocks(existing, makeUpdatedEvent(existing));
      const { safeDeleteImages } = await import('./media-cleanup.service');
      await eventService.updateEvent('event-1', { eventVersion: 1 });
      const allDeleted = vi.mocked(safeDeleteImages).mock.calls.flatMap((c) => c[0]);
      expect(allDeleted).not.toContain('keep');
    });

    it('Cloudinary cleanup runs AFTER the DB write succeeds', async () => {
      const callOrder = [];
      const existing = makeExistingEvent({
        memories: { publicationState: EventMemoryPublicationState.DRAFT, gallery: [{ url: 'u', publicId: 'old-img', order: 0 }] },
      });
      const memories = { publicationState: EventMemoryPublicationState.DRAFT, gallery: [] };
      const updated = makeUpdatedEvent(existing, { memories });
      vi.mocked(Event.findById).mockResolvedValue(existing);
      vi.mocked(Event.findOneAndUpdate).mockImplementation(async () => { callOrder.push('db-write'); return updated; });
      vi.mocked(Ticket.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
      const { safeDeleteImages } = await import('./media-cleanup.service');
      vi.mocked(safeDeleteImages).mockImplementation(() => { callOrder.push('cloudinary-delete'); });
      await eventService.updateEvent('event-1', { eventVersion: 1, memories });
      expect(callOrder.indexOf('db-write')).toBeLessThan(callOrder.indexOf('cloudinary-delete'));
    });

    it('emits event.memories.published audit action on first publish', async () => {
      const existing = makeExistingEvent({ memories: null });
      const memories = { publicationState: EventMemoryPublicationState.PUBLISHED, gallery: [] };
      setupMocks(existing, makeUpdatedEvent(existing, { memories: { ...memories, publishedAt: new Date() } }));
      const { auditLog } = await import('../../utils/audit');
      await eventService.updateEvent('event-1', { eventVersion: 1, memories });
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.memories.published' }));
    });

    it('emits event.memories.hidden audit action on PUBLISHED to HIDDEN', async () => {
      const existing = makeExistingEvent({
        memories: { publicationState: EventMemoryPublicationState.PUBLISHED, gallery: [], publishedAt: new Date() },
      });
      const memories = { publicationState: EventMemoryPublicationState.HIDDEN, gallery: [] };
      setupMocks(existing, makeUpdatedEvent(existing, { memories }));
      const { auditLog } = await import('../../utils/audit');
      await eventService.updateEvent('event-1', { eventVersion: 1, memories });
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.memories.hidden' }));
    });

    it('emits event.memories.updated for generic edits', async () => {
      const existing = makeExistingEvent({ memories: { publicationState: EventMemoryPublicationState.DRAFT, gallery: [] } });
      const memories = { publicationState: EventMemoryPublicationState.DRAFT, gallery: [], heading: 'Great night' };
      setupMocks(existing, makeUpdatedEvent(existing, { memories }));
      const { auditLog } = await import('../../utils/audit');
      await eventService.updateEvent('event-1', { eventVersion: 1, memories });
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.memories.updated' }));
    });

    it('does NOT call auditLog when memories is absent from payload', async () => {
      const existing = makeExistingEvent({
        memories: { publicationState: EventMemoryPublicationState.PUBLISHED, gallery: [], publishedAt: new Date() },
      });
      setupMocks(existing, makeUpdatedEvent(existing));
      const { auditLog } = await import('../../utils/audit');
      await eventService.updateEvent('event-1', { eventVersion: 1 });
      expect(auditLog).not.toHaveBeenCalled();
    });
  });
});
