import { describe, it, expect, vi, beforeEach } from 'vitest';

import { adminApiClient } from '@/lib/api/client';
import { EventStatus } from '@mad/shared';

import { adminCreateEvent, adminGetEvent, adminGetEvents, adminUpdateEvent, type AdminEvent } from './event.service';

// Mock the admin API client
vi.mock('@/lib/api/client', () => ({
  adminApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const eventFixture: AdminEvent = {
  _id: 'event-1',
  title: 'MAD Night',
  slug: 'mad-night',
  description: 'Main event',
  category: 'concert',
  status: EventStatus.DRAFT,
  venue: 'Warehouse',
  startDate: '2026-06-01T00:00:00.000Z',
  ticketTiers: [],
  totalCapacity: 100,
  eventVersion: 1,
  isFeatured: false,
  createdAt: '2026-05-01T00:00:00.000Z',
};

describe('adminGetEvents query serialization regression tests (MAD-EVENTS-008)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Case 1: page: 1, limit: 15, search: "", status: "" -> Expected URL: ?page=1&limit=15', async () => {
    vi.mocked(adminApiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          events: [],
          pagination: { page: 1, limit: 15, total: 0, totalPages: 1 },
        },
      },
    });

    await adminGetEvents({ page: 1, limit: 15, search: '', status: '' });

    expect(adminApiClient.get).toHaveBeenCalledWith('/admin/events?page=1&limit=15');
  });

  it('Case 2: page: 1, limit: 15, status: "published" -> Expected URL: ?page=1&limit=15&status=published', async () => {
    vi.mocked(adminApiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          events: [],
          pagination: { page: 1, limit: 15, total: 0, totalPages: 1 },
        },
      },
    });

    await adminGetEvents({ page: 1, limit: 15, status: 'published' });

    expect(adminApiClient.get).toHaveBeenCalledWith('/admin/events?page=1&limit=15&status=published');
  });

  it('Case 3: page: 1, limit: 15, search: "2026" -> Expected URL: ?page=1&limit=15&search=2026', async () => {
    vi.mocked(adminApiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          events: [],
          pagination: { page: 1, limit: 15, total: 0, totalPages: 1 },
        },
      },
    });

    await adminGetEvents({ page: 1, limit: 15, search: '2026' });

    expect(adminApiClient.get).toHaveBeenCalledWith('/admin/events?page=1&limit=15&search=2026');
  });

  it('Case 4: page: 1, limit: 15, search: "2026", status: "completed" -> Expected URL: ?page=1&limit=15&search=2026&status=completed', async () => {
    vi.mocked(adminApiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          events: [],
          pagination: { page: 1, limit: 15, total: 0, totalPages: 1 },
        },
      },
    });

    await adminGetEvents({ page: 1, limit: 15, search: '2026', status: 'completed' });

    expect(adminApiClient.get).toHaveBeenCalledWith('/admin/events?page=1&limit=15&search=2026&status=completed');
  });
});

describe('admin event contract compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unwraps wrapped get event responses from the production backend contract', async () => {
    vi.mocked(adminApiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: { event: eventFixture },
      },
    });

    await expect(adminGetEvent('event-1')).resolves.toEqual(eventFixture);
  });

  it('unwraps wrapped create event responses from the production backend contract', async () => {
    vi.mocked(adminApiClient.post).mockResolvedValue({
      data: {
        success: true,
        data: { event: eventFixture },
      },
    });

    await expect(adminCreateEvent({ title: 'MAD Night' })).resolves.toEqual(eventFixture);
  });

  it('unwraps wrapped update event responses from the production backend contract', async () => {
    vi.mocked(adminApiClient.put).mockResolvedValue({
      data: {
        success: true,
        data: { event: eventFixture },
      },
    });

    await expect(adminUpdateEvent('event-1', { title: 'MAD Night', eventVersion: 1 })).resolves.toEqual(eventFixture);
    expect(adminApiClient.put).toHaveBeenCalledWith('/admin/events/event-1', {
      title: 'MAD Night',
      eventVersion: 1,
    });
  });
});
