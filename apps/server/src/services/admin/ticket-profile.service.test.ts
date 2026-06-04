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
    vi.mocked(Reservation.exists).mockResolvedValue(null);
    vi.mocked(Booking.exists).mockResolvedValue(null);
    vi.mocked(Ticket.exists).mockResolvedValue(null);
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
    expect(Event.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('cannot remove tier with reservations', async () => {
    vi.mocked(TicketProfile.findById).mockResolvedValue(mockProfile as any);
    vi.mocked(Event.find).mockResolvedValue([mockEvent] as any);
    vi.mocked(Reservation.exists).mockResolvedValue({ _id: 'res-id' } as any);

    await expect(ticketProfileService.syncProfileEvents('profile-1')).rejects.toThrow(
      'Cannot remove active ticket tier "VIP" with active reservations.'
    );
    expect(Event.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('cannot remove tier with generated tickets', async () => {
    vi.mocked(TicketProfile.findById).mockResolvedValue(mockProfile as any);
    vi.mocked(Event.find).mockResolvedValue([mockEvent] as any);
    vi.mocked(Ticket.exists).mockResolvedValue({ _id: 'ticket-id' } as any);

    await expect(ticketProfileService.syncProfileEvents('profile-1')).rejects.toThrow(
      'Cannot remove active ticket tier "VIP" with generated tickets.'
    );
    expect(Event.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('can remove unused tier', async () => {
    vi.mocked(TicketProfile.findById).mockResolvedValue(mockProfile as any);
    vi.mocked(Event.find).mockResolvedValue([mockEvent] as any);
    vi.mocked(Reservation.exists).mockResolvedValue(null);
    vi.mocked(Booking.exists).mockResolvedValue(null);
    vi.mocked(Ticket.exists).mockResolvedValue(null);

    await ticketProfileService.syncProfileEvents('profile-1');

    expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(
      'event-1',
      expect.objectContaining({
        ticketTiers: expect.arrayContaining([
          expect.objectContaining({ tier: 'GOLD' }),
        ]),
      })
    );
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
    expect(Event.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
