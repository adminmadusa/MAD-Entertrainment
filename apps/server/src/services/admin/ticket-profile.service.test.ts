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

import * as ticketProfileService from './ticket-profile.service';
import { TicketProfile } from '../../models/ticket-profile.schema';
import { Event } from '../../models/event.schema';
import { Reservation } from '../../models/reservation.schema';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import { CacheService } from '../cache.service';
import { EventStatus } from '@mad/shared';

vi.mock('../../models/ticket-profile.schema', () => ({
  TicketProfile: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/event.schema', () => ({
  Event: {
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../../models/reservation.schema', () => ({
  Reservation: {
    exists: vi.fn(),
  },
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    exists: vi.fn(),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    exists: vi.fn(),
  },
}));

vi.mock('../cache.service', () => ({
  CacheService: {
    delPattern: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Ticket Profile Service Sync Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Event.find).mockResolvedValue([] as any);
    vi.mocked(Event.findOneAndUpdate).mockResolvedValue({ _id: 'event-1' } as any);
    vi.mocked(Reservation.exists).mockResolvedValue(null);
    vi.mocked(Booking.exists).mockResolvedValue(null);
    vi.mocked(Ticket.exists).mockResolvedValue(null);
    vi.mocked(TicketProfile.findByIdAndUpdate).mockResolvedValue({ _id: 'profile-1', isDeleted: true } as any);
  });

  const mockProfile = {
    _id: 'profile-1',
    groups: [
      {
        name: 'General',
        slug: 'general',
        tickets: [
          { tier: 'GOLD', name: 'Gold Tier', price: 100, totalCapacity: 100, isActive: true },
        ],
      },
    ],
  };

  const mockEvent = {
    _id: 'event-1',
    title: 'Event One',
    ticketProfileId: 'profile-1',
    ticketTiers: [
      { tier: 'GOLD', name: 'Gold Tier', price: 100, totalCapacity: 100, soldCount: 0, isActive: true },
      { tier: 'VIP', name: 'VIP Tier', price: 200, totalCapacity: 50, soldCount: 0, isActive: true },
    ],
    ticketOverrides: [],
    eventVersion: 1,
  };

  it('cannot remove tier with bookings', async () => {
    vi.mocked(TicketProfile.findById).mockResolvedValue(mockProfile as any);
    vi.mocked(Event.find).mockResolvedValue([mockEvent] as any);
    vi.mocked(Booking.exists).mockResolvedValue({ _id: 'booking-id' } as any);

    await expect(ticketProfileService.syncProfileEvents('profile-1')).rejects.toThrow(
      'Cannot remove active ticket tier "VIP" with active bookings.'
    );
    expect(Event.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('cannot remove tier with reservations', async () => {
    vi.mocked(TicketProfile.findById).mockResolvedValue(mockProfile as any);
    vi.mocked(Event.find).mockResolvedValue([mockEvent] as any);
    vi.mocked(Reservation.exists).mockResolvedValue({ _id: 'res-id' } as any);

    await expect(ticketProfileService.syncProfileEvents('profile-1')).rejects.toThrow(
      'Cannot remove active ticket tier "VIP" with active reservations.'
    );
    expect(Event.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('cannot remove tier with generated tickets', async () => {
    vi.mocked(TicketProfile.findById).mockResolvedValue(mockProfile as any);
    vi.mocked(Event.find).mockResolvedValue([mockEvent] as any);
    vi.mocked(Ticket.exists).mockResolvedValue({ _id: 'ticket-id' } as any);

    await expect(ticketProfileService.syncProfileEvents('profile-1')).rejects.toThrow(
      'Cannot remove active ticket tier "VIP" with generated tickets.'
    );
    expect(Event.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('can remove unused tier', async () => {
    vi.mocked(TicketProfile.findById).mockResolvedValue(mockProfile as any);
    vi.mocked(Event.find).mockResolvedValue([mockEvent] as any);
    vi.mocked(Reservation.exists).mockResolvedValue(null);
    vi.mocked(Booking.exists).mockResolvedValue(null);
    vi.mocked(Ticket.exists).mockResolvedValue(null);

    await ticketProfileService.syncProfileEvents('profile-1');

    expect(Event.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'event-1', eventVersion: 1 },
      {
        $set: expect.objectContaining({
          ticketTiers: expect.arrayContaining([
            expect.objectContaining({ tier: 'GOLD' }),
          ]),
          totalCapacity: 100,
        }),
        $inc: { eventVersion: 1 },
      },
      { new: true }
    );
  });

  it('increments eventVersion when sync succeeds with matching version', async () => {
    vi.mocked(TicketProfile.findById).mockResolvedValue(mockProfile as any);
    vi.mocked(Event.find).mockResolvedValue([mockEvent] as any);

    await ticketProfileService.syncProfileEvents('profile-1');

    expect(Event.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'event-1', eventVersion: 1 },
      expect.objectContaining({
        $inc: { eventVersion: 1 },
      }),
      { new: true }
    );
    expect(CacheService.delPattern).toHaveBeenCalledWith('events:*');
  });

  it('rejects sync when eventVersion is stale', async () => {
    vi.mocked(TicketProfile.findById).mockResolvedValue(mockProfile as any);
    vi.mocked(Event.find).mockResolvedValue([mockEvent] as any);
    vi.mocked(Event.findOneAndUpdate).mockResolvedValue(null);

    await expect(ticketProfileService.syncProfileEvents('profile-1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Event was modified while synchronizing ticket profiles. Please retry.',
    });

    expect(Event.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'event-1', eventVersion: 1 },
      expect.objectContaining({
        $set: expect.objectContaining({
          ticketTiers: expect.any(Array),
          totalCapacity: 100,
        }),
        $inc: { eventVersion: 1 },
      }),
      { new: true }
    );
    expect(CacheService.delPattern).not.toHaveBeenCalled();
  });

  it('updates all referenced events when versions match', async () => {
    const mockEvent2 = {
      ...mockEvent,
      _id: 'event-2',
      title: 'Event Two',
      eventVersion: 4,
    };

    vi.mocked(TicketProfile.findById).mockResolvedValue(mockProfile as any);
    vi.mocked(Event.find).mockResolvedValue([mockEvent, mockEvent2] as any);
    vi.mocked(Event.findOneAndUpdate)
      .mockResolvedValueOnce({ _id: 'event-1' } as any)
      .mockResolvedValueOnce({ _id: 'event-2' } as any);

    await ticketProfileService.syncProfileEvents('profile-1');

    expect(Event.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(Event.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      { _id: 'event-1', eventVersion: 1 },
      expect.objectContaining({ $inc: { eventVersion: 1 } }),
      { new: true }
    );
    expect(Event.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { _id: 'event-2', eventVersion: 4 },
      expect.objectContaining({ $inc: { eventVersion: 1 } }),
      { new: true }
    );
    expect(CacheService.delPattern).toHaveBeenCalledWith('events:*');
  });

  it('throws conflict and does not report success when a later event has a stale version', async () => {
    const mockEvent2 = {
      ...mockEvent,
      _id: 'event-2',
      title: 'Event Two',
      eventVersion: 4,
    };

    vi.mocked(TicketProfile.findById).mockResolvedValue(mockProfile as any);
    vi.mocked(Event.find).mockResolvedValue([mockEvent, mockEvent2] as any);
    vi.mocked(Event.findOneAndUpdate)
      .mockResolvedValueOnce({ _id: 'event-1' } as any)
      .mockResolvedValueOnce(null);

    await expect(ticketProfileService.syncProfileEvents('profile-1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Event was modified while synchronizing ticket profiles. Please retry.',
    });

    expect(Event.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(Event.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { _id: 'event-2', eventVersion: 4 },
      expect.objectContaining({ $inc: { eventVersion: 1 } }),
      { new: true }
    );
    expect(CacheService.delPattern).not.toHaveBeenCalled();
  });

  it('syncProfileEvents remains atomic when validation fails', async () => {
    const mockEvent2 = {
      _id: 'event-2',
      title: 'Event Two',
      ticketProfileId: 'profile-1',
      ticketTiers: [
        { tier: 'GOLD', name: 'Gold Tier', price: 100, totalCapacity: 100, soldCount: 0, isActive: true },
        { tier: 'VIP', name: 'VIP Tier', price: 200, totalCapacity: 50, soldCount: 0, isActive: true },
      ],
      ticketOverrides: [],
      eventVersion: 1,
    };

    vi.mocked(TicketProfile.findById).mockResolvedValue(mockProfile as any);
    vi.mocked(Event.find).mockResolvedValue([mockEvent, mockEvent2] as any);

    // Simulate booking exists on event 2 VIP tier
    vi.mocked(Booking.exists).mockImplementation(async (query: any) => {
      if (query.eventId === 'event-2' && query['tickets.tier'] === 'VIP') {
        return { _id: 'booking-id' } as any;
      }
      return null;
    });

    await expect(ticketProfileService.syncProfileEvents('profile-1')).rejects.toThrow(
      'Cannot remove active ticket tier "VIP" with active bookings.'
    );

    // Atomicity check: no Event update should be executed at all
    expect(Event.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('Ticket Profile Delete Reference Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Event.find).mockResolvedValue([] as any);
    vi.mocked(Reservation.exists).mockResolvedValue(null);
    vi.mocked(Booking.exists).mockResolvedValue(null);
    vi.mocked(Ticket.exists).mockResolvedValue(null);
    vi.mocked(TicketProfile.findByIdAndUpdate).mockResolvedValue({ _id: 'profile-1', isDeleted: true } as any);
  });

  const historicalEvent = {
    _id: 'event-1',
    title: 'Past Event',
    ticketProfileId: 'profile-1',
    status: 'completed',
    startDate: new Date('2025-01-01T00:00:00.000Z'),
    soldCount: 0,
    ticketTiers: [{ tier: 'GOLD', soldCount: 0 }],
  };

  it('deletes an unused profile with the existing soft-delete behavior', async () => {
    await expect(ticketProfileService.deleteTicketProfile('profile-1')).resolves.toEqual({
      _id: 'profile-1',
      isDeleted: true,
    });

    expect(Event.find).toHaveBeenCalledWith({
      ticketProfileId: 'profile-1',
      isDeleted: { $ne: true },
    });
    expect(TicketProfile.findByIdAndUpdate).toHaveBeenCalledWith(
      'profile-1',
      { isDeleted: true },
      { new: true }
    );
  });

  it.each([EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.POSTPONED])(
    'blocks delete when profile is referenced by a %s event',
    async (status) => {
      vi.mocked(Event.find).mockResolvedValue([
        {
          ...historicalEvent,
          status,
        },
      ] as any);

      await expect(ticketProfileService.deleteTicketProfile('profile-1')).rejects.toThrow(
        'Ticket Profile is referenced by active events and cannot be deleted'
      );
      expect(TicketProfile.findByIdAndUpdate).not.toHaveBeenCalled();
    }
  );


  it('blocks delete when profile is referenced by a future event', async () => {
    vi.mocked(Event.find).mockResolvedValue([
      {
        ...historicalEvent,
        status: 'completed',
        startDate: new Date('2099-01-01T00:00:00.000Z'),
      },
    ] as any);

    await expect(ticketProfileService.deleteTicketProfile('profile-1')).rejects.toThrow(
      'Ticket Profile is referenced by active events and cannot be deleted'
    );
    expect(TicketProfile.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('blocks delete when a referenced event has sold tickets', async () => {
    vi.mocked(Event.find).mockResolvedValue([
      {
        ...historicalEvent,
        soldCount: 1,
      },
    ] as any);

    await expect(ticketProfileService.deleteTicketProfile('profile-1')).rejects.toThrow(
      'Ticket Profile is referenced by active events and cannot be deleted'
    );
    expect(TicketProfile.findByIdAndUpdate).not.toHaveBeenCalled();
  });


  it.each(['draft', 'published', 'postponed'])(
    'blocks delete when profile is referenced by a %s event',
    async (status) => {
      vi.mocked(Event.find).mockResolvedValue([
        {
          ...historicalEvent,
          status,
        },
      ] as any);

      await expect(ticketProfileService.deleteTicketProfile('profile-1')).rejects.toThrow(
        'Ticket Profile is referenced by active events and cannot be deleted'
      );

      expect(TicketProfile.findByIdAndUpdate).not.toHaveBeenCalled();
    }
  );

  it('blocks delete when a referenced event has tier-level sold tickets', async () => {
    vi.mocked(Event.find).mockResolvedValue([
      {
        ...historicalEvent,
        ticketTiers: [{ tier: 'GOLD', soldCount: 1 }],
      },
    ] as any);

    await expect(ticketProfileService.deleteTicketProfile('profile-1')).rejects.toThrow(
      'Ticket Profile is referenced by active events and cannot be deleted'
    );
    expect(TicketProfile.findByIdAndUpdate).not.toHaveBeenCalled();
  });
  it('blocks delete when referenced historical events have bookings', async () => {
    vi.mocked(Event.find).mockResolvedValue([historicalEvent] as any);
    vi.mocked(Booking.exists).mockResolvedValue({ _id: 'booking-id' } as any);

    await expect(ticketProfileService.deleteTicketProfile('profile-1')).rejects.toThrow(
      'Ticket Profile is referenced by active events and cannot be deleted'
    );

    expect(Booking.exists).toHaveBeenCalledWith({
      eventId: { $in: ['event-1'] },
    });

    expect(TicketProfile.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('blocks delete when referenced historical events have reservations', async () => {
    vi.mocked(Event.find).mockResolvedValue([historicalEvent] as any);
    vi.mocked(Reservation.exists).mockResolvedValue({ _id: 'reservation-id' } as any);

    await expect(ticketProfileService.deleteTicketProfile('profile-1')).rejects.toThrow(
      'Ticket Profile is referenced by active events and cannot be deleted'
    );

    expect(Reservation.exists).toHaveBeenCalledWith({
      eventId: { $in: ['event-1'] },
    });

    expect(TicketProfile.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('blocks delete when referenced historical events have generated tickets', async () => {
    vi.mocked(Event.find).mockResolvedValue([historicalEvent] as any);
    vi.mocked(Ticket.exists).mockResolvedValue({ _id: 'ticket-id' } as any);

    await expect(ticketProfileService.deleteTicketProfile('profile-1')).rejects.toThrow(
      'Ticket Profile is referenced by active events and cannot be deleted'
    );

    expect(Ticket.exists).toHaveBeenCalledWith({
      eventId: { $in: ['event-1'] },
    });

    expect(TicketProfile.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('allows delete for historical references with no activity', async () => {
    vi.mocked(Event.find).mockResolvedValue([historicalEvent] as any);

    await ticketProfileService.deleteTicketProfile('profile-1');

    expect(Booking.exists).toHaveBeenCalledWith({
      eventId: { $in: ['event-1'] },
    });

    expect(Reservation.exists).toHaveBeenCalledWith({
      eventId: { $in: ['event-1'] },
    });

    expect(Ticket.exists).toHaveBeenCalledWith({
      eventId: { $in: ['event-1'] },
    });

    expect(TicketProfile.findByIdAndUpdate).toHaveBeenCalledWith(
      'profile-1',
      { isDeleted: true },
      { new: true }
    );
  });
});
