import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'testsecret',
    JWT_ADMIN_SECRET: 'testsecret',
    JWT_SESSION_SECRET: 'testsecret',
  })),
}));

import { ReservationService } from './reservation.service';
import { Reservation } from '../models/reservation.schema';
import { Event } from '../models/event.schema';
import { SeatLayout } from '../models/seat-layout.schema';
import { CacheService } from './cache.service';
import { emitToAdmin, emitToEvent } from '../config/socket';

vi.mock('../models/reservation.schema', () => ({
  Reservation: {
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../models/event.schema', () => ({
  Event: {
    findByIdAndUpdate: vi.fn().mockReturnValue({
      session: vi.fn().mockResolvedValue({}),
    }),
  },
}));

vi.mock('../models/seat-layout.schema', () => ({
  SeatLayout: {
    updateOne: vi.fn(),
  },
}));

vi.mock('./cache.service', () => ({
  CacheService: {
    delPattern: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../config/socket', () => ({
  emitToAdmin: vi.fn(),
  emitToEvent: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ReservationService.expireReservations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Event.findByIdAndUpdate).mockReturnValue({
      session: vi.fn().mockResolvedValue({}),
    } as any);
  });

  it('expireReservations should only update eligible statuses', async () => {
    const now = new Date();
    const staleReservations = [
      {
        _id: 'res-1',
        reservationId: 'RES1',
        eventId: 'event-1',
        status: 'reserved',
        quantity: 2,
        transitionLog: [],
        reservationVersion: 1,
      },
      {
        _id: 'res-2',
        reservationId: 'RES2',
        eventId: 'event-1',
        status: 'pending_payment',
        quantity: 1,
        transitionLog: [],
        reservationVersion: 1,
      },
    ];

    vi.mocked(Reservation.find).mockReturnValue({
      limit: vi.fn().mockResolvedValue(staleReservations),
    } as any);

    vi.mocked(Reservation.findOneAndUpdate)
      .mockResolvedValueOnce({
        ...staleReservations[0],
        status: 'expired',
        inventoryState: 'expired',
        reservationVersion: 2,
      } as any)
      .mockResolvedValueOnce({
        ...staleReservations[1],
        status: 'expired',
        inventoryState: 'expired',
        reservationVersion: 2,
      } as any);

    const expired = await ReservationService.expireReservations(now);

    expect(Reservation.find).toHaveBeenCalledWith({
      status: { $in: ['reserved', 'pending_payment'] },
      expiresAt: { $lte: now },
    });

    expect(Reservation.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(Reservation.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      { _id: 'res-1', status: 'reserved' },
      expect.any(Object),
      { new: true }
    );
    expect(Reservation.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { _id: 'res-2', status: 'pending_payment' },
      expect.any(Object),
      { new: true }
    );

    expect(expired).toHaveLength(2);
    expect(expired[0].status).toBe('expired');
    expect(expired[1].status).toBe('expired');
  });

  it('expireReservations should not overwrite concurrently confirmed reservation', async () => {
    const now = new Date();
    const staleReservations = [
      {
        _id: 'res-1',
        reservationId: 'RES1',
        eventId: 'event-1',
        status: 'reserved',
        quantity: 2,
        transitionLog: [],
        reservationVersion: 1,
      },
    ];

    vi.mocked(Reservation.find).mockReturnValue({
      limit: vi.fn().mockResolvedValue(staleReservations),
    } as any);

    // Simulate concurrent update by returning null (status changed in DB)
    vi.mocked(Reservation.findOneAndUpdate).mockResolvedValueOnce(null);

    const expired = await ReservationService.expireReservations(now);

    expect(expired).toHaveLength(0);
    expect(Event.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(emitToEvent).not.toHaveBeenCalled();
  });

  it('concurrent confirmation wins over expiration', async () => {
    const now = new Date();
    const staleReservations = [
      {
        _id: 'res-1',
        reservationId: 'RES1',
        eventId: 'event-1',
        status: 'reserved',
        quantity: 2,
        transitionLog: [],
        reservationVersion: 1,
      },
    ];

    vi.mocked(Reservation.find).mockReturnValue({
      limit: vi.fn().mockResolvedValue(staleReservations),
    } as any);

    // findOneAndUpdate returns null because status is no longer 'reserved'
    vi.mocked(Reservation.findOneAndUpdate).mockResolvedValueOnce(null);

    const expired = await ReservationService.expireReservations(now);

    expect(expired).toHaveLength(0);
    // Verified that reservation remains untouched (not returned as expired)
  });
});
