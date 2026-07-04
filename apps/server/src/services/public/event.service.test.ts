// Set environment variables synchronously before any imports are resolved dynamically
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test_jwt_secret_with_32_characters_long_minimum';
process.env.JWT_ADMIN_SECRET = 'test_jwt_secret_with_32_characters_long_minimum';
process.env.JWT_SESSION_SECRET = 'test_jwt_secret_with_32_characters_long_minimum';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.PORT = '8080';
process.env.NODE_ENV = 'test';

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { EventStatus, EventMemoryPublicationState } from '@mad/shared';

// We dynamically import these modules in beforeAll to prevent Vitest hoisting from running imports before environment variables are set
let PublicEventService: any;
let Event: any;
let auditLog: any;

// Mock mongoose model Event
vi.mock('../../models/event.schema', () => ({
  Event: {
    findOne: vi.fn(),
  },
}));

// Mock auditLog utility
vi.mock('../../utils/audit', () => ({
  auditLog: vi.fn(),
}));

describe('PublicEventService - Secure Preview Infrastructure', () => {
  const adminSecret = 'test_jwt_secret_with_32_characters_long_minimum';

  beforeAll(async () => {
    // Dynamically load service and model after env vars are set
    const serviceMod = await import('./event.service');
    PublicEventService = serviceMod.PublicEventService;

    const eventMod = await import('../../models/event.schema');
    Event = eventMod.Event;

    const auditMod = await import('../../utils/audit');
    auditLog = auditMod.auditLog;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeMockEvent = (overrides = {}) => ({
    _id: 'event-id-123',
    title: 'Test Completed Event',
    slug: 'test-completed-event',
    status: EventStatus.COMPLETED,
    isDeleted: false,
    memories: {
      publicationState: EventMemoryPublicationState.DRAFT,
      heading: 'Draft Memories Heading',
      thankYouMessage: 'Thanks for coming!',
      highlights: ['Fun', 'Music'],
      gallery: [{ url: 'u1', publicId: 'p1', order: 0 }],
    },
    ...overrides,
  });

  const generateToken = (payload = {}, secret = adminSecret, options = { expiresIn: '15m' }) => {
    return jwt.sign(
      {
        eventId: 'event-id-123',
        adminId: 'admin-1',
        issuedAt: Date.now(),
        expiresAt: Date.now() + 15 * 60 * 1000,
        ...payload,
      },
      secret,
      options
    );
  };

  it('allows draft memories when a valid preview token is supplied', async () => {
    const event = makeMockEvent();
    vi.mocked(Event.findOne).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(event),
    } as any);

    const token = generateToken();
    const result = await PublicEventService.getEventBySlug('test-completed-event', token);

    // Verify memories are not suppressed
    expect(result.memories).not.toBeNull();
    expect(result.memories?.heading).toBe('Draft Memories Heading');

    // Verify event.memories.preview.accessed audit log generated
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'event.memories.preview.accessed',
        status: 'success',
        metadata: expect.objectContaining({
          eventId: 'event-id-123',
          adminId: 'admin-1',
        }),
      })
    );
  });

  it('suppresses memories if no preview token is supplied for draft memories', async () => {
    const event = makeMockEvent();
    vi.mocked(Event.findOne).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(event),
    } as any);

    const result = await PublicEventService.getEventBySlug('test-completed-event');

    // Verify memories are suppressed
    expect(result.memories).toBeNull();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('does NOT suppress memories for published state even without preview token', async () => {
    const event = makeMockEvent({
      memories: {
        publicationState: EventMemoryPublicationState.PUBLISHED,
        heading: 'Published Heading',
        gallery: [],
      },
    });
    vi.mocked(Event.findOne).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(event),
    } as any);

    const result = await PublicEventService.getEventBySlug('test-completed-event');

    expect(result.memories).not.toBeNull();
    expect(result.memories?.heading).toBe('Published Heading');
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('rejects preview token with invalid signature', async () => {
    const event = makeMockEvent();
    vi.mocked(Event.findOne).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(event),
    } as any);

    const badToken = generateToken({}, 'different_secret_signature_key');
    const result = await PublicEventService.getEventBySlug('test-completed-event', badToken);

    // Should reject and fallback to public suppression
    expect(result.memories).toBeNull();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('rejects expired preview tokens', async () => {
    const event = makeMockEvent();
    vi.mocked(Event.findOne).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(event),
    } as any);

    const expiredToken = generateToken({}, adminSecret, { expiresIn: '-1s' });
    const result = await PublicEventService.getEventBySlug('test-completed-event', expiredToken);

    // Should reject and suppress memories
    expect(result.memories).toBeNull();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('rejects token at boundary if already expired', async () => {
    const event = makeMockEvent();
    vi.mocked(Event.findOne).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(event),
    } as any);

    const expiredToken = jwt.sign(
      {
        eventId: 'event-id-123',
        adminId: 'admin-1',
        exp: Math.floor(Date.now() / 1000) - 5, // 5 seconds in past
      },
      adminSecret
    );
    const result = await PublicEventService.getEventBySlug('test-completed-event', expiredToken);

    expect(result.memories).toBeNull();
  });

  it('rejects preview token if event ID in token does not match queried event ID', async () => {
    const event = makeMockEvent({ _id: 'event-id-123' });
    vi.mocked(Event.findOne).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(event),
    } as any);

    // Token generated for event-id-999
    const wrongToken = generateToken({ eventId: 'event-id-999' });
    const result = await PublicEventService.getEventBySlug('test-completed-event', wrongToken);

    // Suppressed because of mismatched event ID
    expect(result.memories).toBeNull();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('handles token for deleted event by returning not found', async () => {
    vi.mocked(Event.findOne).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    } as any);

    const token = generateToken();
    await expect(
      PublicEventService.getEventBySlug('deleted-event', token)
    ).rejects.toThrow('Event not found');

    expect(auditLog).not.toHaveBeenCalled();
  });

  it('allows preview token for non-completed events (Preparation Mode)', async () => {
    const event = makeMockEvent({
      status: EventStatus.PUBLISHED, // Event is still published (live), not completed yet
    });
    vi.mocked(Event.findOne).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(event),
    } as any);

    const token = generateToken();
    const result = await PublicEventService.getEventBySlug('test-live-event', token);

    // Valid preview token allows previewing draft memories of a live event
    expect(result.memories).not.toBeNull();
    expect(result.memories?.heading).toBe('Draft Memories Heading');
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'event.memories.preview.accessed',
        status: 'success',
      })
    );
  });
});
