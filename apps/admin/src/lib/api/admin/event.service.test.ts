import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminGetEvents } from './event.service';
import { adminApiClient } from '@/lib/api/client';

// Mock the admin API client
vi.mock('@/lib/api/client', () => ({
  adminApiClient: {
    get: vi.fn(),
  },
}));

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
