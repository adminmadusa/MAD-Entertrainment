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

vi.mock('../../config/redis', () => ({
  getRedis: vi.fn(() => ({
    scan: vi.fn().mockResolvedValue(['0', []]),
    mget: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('../../models/event.schema', () => ({
  Event: {
    aggregate: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/event-gallery.schema', () => ({
  EventGallery: {
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('../../models/event-gallery-settings.schema', () => ({
  EventGallerySettings: {
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
  },
}));

import { EventStatus } from '@mad/shared';
import { Event } from '../../models/event.schema';
import { PublicEventService } from './event.service';

describe('PublicEventService.listEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries completed events with COMPLETED lifecycle only and newest-first sort order', async () => {
    let capturedPipeline: any[] = [];
    vi.mocked(Event.aggregate).mockImplementation((pipeline: any[]) => {
      capturedPipeline = pipeline;
      return {
        exec: vi.fn().mockResolvedValue([]),
      } as any;
    });

    await PublicEventService.listEvents({
      state: 'completed',
      limit: 6,
      page: 1,
      includeTotal: false,
    });

    expect(Event.aggregate).toHaveBeenCalled();

    // 1. Base match includes published and completed statuses
    const baseMatch = capturedPipeline.find((stage) => stage.$match && stage.$match.status);
    expect(baseMatch.$match.status).toEqual({
      $in: [EventStatus.PUBLISHED, EventStatus.COMPLETED],
    });

    // 2. Lifecycle filter matches strictly COMPLETED (LIVE is excluded)
    const lifecycleMatch = capturedPipeline.find(
      (stage) => stage.$match && stage.$match.lifecycle === 'COMPLETED'
    );
    expect(lifecycleMatch).toBeDefined();
    expect(lifecycleMatch.$match.lifecycle).toBe('COMPLETED');

    // 3. Sort stage orders completed events newest-first (startDate: -1)
    const sortStage = capturedPipeline.find((stage) => stage.$sort);
    expect(sortStage).toBeDefined();
    expect(sortStage.$sort).toEqual({ startDate: -1 });

    // 4. Limit stage respects 6 items
    const limitStage = capturedPipeline.find((stage) => stage.$limit === 6);
    expect(limitStage).toBeDefined();
  });

  it('queries active events with UPCOMING lifecycle and sortWeight ascending order', async () => {
    let capturedPipeline: any[] = [];
    vi.mocked(Event.aggregate).mockImplementation((pipeline: any[]) => {
      capturedPipeline = pipeline;
      return {
        exec: vi.fn().mockResolvedValue([]),
      } as any;
    });

    await PublicEventService.listEvents({
      state: 'active',
      limit: 12,
      page: 1,
      includeTotal: false,
    });

    expect(Event.aggregate).toHaveBeenCalled();

    // 1. Base match includes PUBLISHED status
    const baseMatch = capturedPipeline.find((stage) => stage.$match && stage.$match.status);
    expect(baseMatch.$match.status).toBe(EventStatus.PUBLISHED);

    // 2. Lifecycle filter matches UPCOMING
    const lifecycleMatch = capturedPipeline.find(
      (stage) => stage.$match && stage.$match.lifecycle === 'UPCOMING'
    );
    expect(lifecycleMatch).toBeDefined();
    expect(lifecycleMatch.$match.lifecycle).toBe('UPCOMING');

    // 3. Sort stage orders active events by sortWeight: 1, startDate: 1
    const sortStage = capturedPipeline.find((stage) => stage.$sort);
    expect(sortStage).toBeDefined();
    expect(sortStage.$sort).toEqual({ sortWeight: 1, startDate: 1 });
  });
});
