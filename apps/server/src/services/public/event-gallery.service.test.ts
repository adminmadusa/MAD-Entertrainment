import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

import { PublicEventGalleryService } from './event-gallery.service';
import { EventGallerySettings } from '../../models/event-gallery-settings.schema';
import { EventGallery, MediaVisibility } from '../../models/event-gallery.schema';
import { Event } from '../../models/event.schema';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn().mockReturnValue({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'super-secret-jwt-key-for-users-12345',
    JWT_ADMIN_SECRET: 'super-secret-jwt-key-for-admin-12345',
    JWT_SESSION_SECRET: 'super-secret-jwt-key-for-session-12345',
  }),
}));

vi.mock('../../models/event-gallery.schema');
vi.mock('../../models/event-gallery-settings.schema');
vi.mock('../../models/event.schema');

describe('PublicEventGalleryService', () => {
  const eventId = new Types.ObjectId().toString();
  const eventSlug = 'summer-soundwave-2026';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws 404 when event is not found', async () => {
    (Event.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    });

    await expect(PublicEventGalleryService.getGallery(eventSlug)).rejects.toThrow('Event not found');
  });

  it('throws 404 when gallery settings do not exist', async () => {
    (Event.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: eventId, title: 'Summer Soundwave' }),
      }),
    });

    (EventGallerySettings.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });

    await expect(PublicEventGalleryService.getGallery(eventSlug)).rejects.toThrow('Gallery is not published');
  });

  it('throws 404 when gallery is not published', async () => {
    (Event.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: eventId, title: 'Summer Soundwave' }),
      }),
    });

    (EventGallerySettings.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ published: false }),
    });

    await expect(PublicEventGalleryService.getGallery(eventSlug)).rejects.toThrow('Gallery is not published');
  });

  it('returns both items and gallery arrays when published', async () => {
    (Event.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: eventId, title: 'Summer Soundwave' }),
      }),
    });

    (EventGallerySettings.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        heading: 'Memories',
        thankYouMessage: 'Thanks for coming!',
        published: true,
      }),
    });

    const mockGallery = [
      {
        _id: new Types.ObjectId(),
        mediaType: 'IMAGE',
        url: 'https://example.com/p1.jpg',
        thumbnail: 'https://example.com/p1-thumb.jpg',
        caption: 'Opening set',
        isCover: true,
        sortOrder: 0,
      },
      {
        _id: new Types.ObjectId(),
        mediaType: 'IMAGE',
        url: 'https://example.com/p2.jpg',
        thumbnail: 'https://example.com/p2-thumb.jpg',
        caption: 'Crowd cheer',
        isCover: false,
        sortOrder: 1,
      },
    ];

    (EventGallery.find as any).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockGallery),
      }),
    });

    const result = await PublicEventGalleryService.getGallery(eventSlug);

    expect(EventGallery.find).toHaveBeenCalledWith({
      eventId,
      visibility: MediaVisibility.PUBLIC,
    });
    expect(result.event.title).toBe('Summer Soundwave');
    expect(result.settings.published).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.gallery).toHaveLength(2);
    expect(result.items[0].caption).toBe('Opening set');
    expect(result.items[0].isCover).toBe(true);
  });
});
