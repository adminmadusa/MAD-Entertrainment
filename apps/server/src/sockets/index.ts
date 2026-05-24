import { SeatStatus } from '@mad/shared';
import { Socket } from 'socket.io';

import { getRedis } from '../config/redis';
import { SeatLayout } from '../models/seat-layout.schema';
import { logger } from '../utils/logger';

// Helper to get Redis key for a seat lock
function getSeatLockKey(eventId: string, seatId: string): string {
  return `mad:lock:event:${eventId}:seat:${seatId}`;
}

// Verify seat availability in MongoDB
async function verifySeatsAvailable(eventId: string, seatIds: string[]): Promise<boolean> {
  try {
    const layout = await SeatLayout.findOne({ eventId });
    if (!layout) return false;

    for (const seatId of seatIds) {
      const seat = layout.seats.find((s) => s.seatId === seatId);
      if (!seat || seat.status !== SeatStatus.AVAILABLE) {
        return false;
      }
    }
    return true;
  } catch (err) {
    logger.error({ err, eventId, seatIds }, 'Failed to verify seats in database');
    return false;
  }
}

// Acquire locks in Redis
async function acquireLocks(eventId: string, seatIds: string[], sessionId: string): Promise<boolean> {
  const redis = getRedis();

  // 1. Check DB first
  const dbAvailable = await verifySeatsAvailable(eventId, seatIds);
  if (!dbAvailable) return false;

  // 2. Atomically acquire or refresh locks. This avoids check-then-set races
  // where two clients pass mget before either writes the lock.
  const keys = seatIds.map((id) => getSeatLockKey(eventId, id));
  if (keys.length === 0) return true;

  const acquiredKeys: string[] = [];
  for (const key of keys) {
    const currentLock = await redis.get(key);
    if (currentLock === sessionId) {
      await redis.expire(key, 600);
      continue;
    }

    if (currentLock) {
      await releaseLockKeys(acquiredKeys, sessionId);
      return false;
    }

    const acquired = await redis.set(key, sessionId, 'EX', 600, 'NX');
    if (acquired !== 'OK') {
      await releaseLockKeys(acquiredKeys, sessionId);
      return false;
    }

    acquiredKeys.push(key);
  }

  return true;
}

async function releaseLockKeys(keys: string[], sessionId: string): Promise<string[]> {
  const redis = getRedis();
  const released: string[] = [];

  for (const key of keys) {
    const currentLock = await redis.get(key);
    if (currentLock === sessionId) {
      await redis.del(key);
      released.push(key);
    }
  }

  return released;
}

// Release locks in Redis, but only when still owned by this session.
async function releaseLocks(eventId: string, seatIds: string[], sessionId: string): Promise<string[]> {
  const keys = seatIds.map((id) => getSeatLockKey(eventId, id));
  if (keys.length === 0) return [];

  return releaseLockKeys(keys, sessionId);
}

async function filterSeatsStillReservedInDatabase(eventId: string, seatIds: string[]): Promise<string[]> {
  const layout = await SeatLayout.findOne({ eventId }).lean();
  if (!layout) return seatIds;

  const unavailable = new Set(
    layout.seats
      .filter((seat) => seatIds.includes(seat.seatId) && seat.status !== SeatStatus.AVAILABLE)
      .map((seat) => seat.seatId)
  );

  return seatIds.filter((seatId) => !unavailable.has(seatId));
}

/**
 * Register event handlers for the public namespace connections
 */
export function registerSocketHandlers(socket: Socket): void {
  logger.info({ socketId: socket.id }, '🔌 Socket connected');

  // Initialize socket connection session tracking
  if (!socket.data.lockedSeats) {
    socket.data.lockedSeats = new Set<string>();
  }

  // Join event room for live seat updates
  socket.on('event:join', ({ eventId }: { eventId: string }) => {
    socket.join(`event:${eventId}`);
    logger.debug({ socketId: socket.id, eventId }, 'Socket joined event room');
  });

  socket.on('event:leave', ({ eventId }: { eventId: string }) => {
    socket.leave(`event:${eventId}`);
  });

  // Seat locking handler
  socket.on(
    'seat:lock',
    async ({ eventId, seatIds, sessionId }: { eventId: string; seatIds: string[]; sessionId: string }) => {
      if (socket.data.sessionId && socket.data.sessionId !== sessionId) {
        socket.emit('seat:lock:status', { success: false, seatIds, message: 'Unauthorized session' });
        logger.warn({ socketId: socket.id, expectedSessionId: socket.data.sessionId, receivedSessionId: sessionId }, 'Unauthorized lock attempt');
        return;
      }
      socket.data.sessionId = sessionId;
      
      const { isRedisConnected } = require('../config/redis');
      let success = false;
      
      if (isRedisConnected()) {
        success = await acquireLocks(eventId, seatIds, sessionId);
      } else {
        logger.warn('Redis disconnected. Falling back to MongoDB for seat validation (degraded mode).');
        success = await verifySeatsAvailable(eventId, seatIds);
      }

      if (success) {
        const lockedSet = socket.data.lockedSeats as Set<string>;
        for (const seatId of seatIds) {
          lockedSet.add(`${eventId}:${seatId}`);
        }
        socket.to(`event:${eventId}`).emit('seat:locked', { seatIds, sessionId });
        socket.emit('seat:lock:status', { success: true, seatIds });
        logger.info({ socketId: socket.id, eventId, seatIds, sessionId }, 'Seat locks acquired');
      } else {
        socket.emit('seat:lock:status', { success: false, seatIds, message: 'Some seats are already locked or booked' });
        logger.info({ socketId: socket.id, eventId, seatIds, sessionId }, 'Seat lock rejected');
      }
    }
  );

  // Seat unlocking handler
  socket.on(
    'seat:unlock',
    async ({ eventId, seatIds, sessionId }: { eventId: string; seatIds: string[]; sessionId: string }) => {
      if (socket.data.sessionId && socket.data.sessionId !== sessionId) {
        socket.emit('seat:unlock:status', { success: false, seatIds, message: 'Unauthorized session' });
        return;
      }

      const { isRedisConnected } = require('../config/redis');
      let releasedSeatIds: string[] = seatIds;
      
      if (isRedisConnected()) {
        const releasedKeys = await releaseLocks(eventId, seatIds, sessionId);
        releasedSeatIds = releasedKeys.map((key) => key.split(':').at(-1)).filter(Boolean) as string[];
      }

      const lockedSet = socket.data.lockedSeats as Set<string>;
      for (const seatId of releasedSeatIds) {
        lockedSet.delete(`${eventId}:${seatId}`);
      }

      if (releasedSeatIds.length > 0) {
        socket.to(`event:${eventId}`).emit('seat:unlocked', { seatIds: releasedSeatIds });
      }
      socket.emit('seat:unlock:status', { success: true, seatIds: releasedSeatIds });
      logger.info({ socketId: socket.id, eventId, seatIds: releasedSeatIds, sessionId }, 'Seat locks released');
    }
  );

  // Booking room
  socket.on('booking:join', ({ bookingId }: { bookingId: string }) => {
    socket.join(`booking:${bookingId}`);
  });

  socket.on('disconnect', async (reason) => {
    logger.debug({ socketId: socket.id, reason }, '🔌 Socket disconnected');

    const locks = socket.data.lockedSeats as Set<string> | undefined;
    if (locks && locks.size > 0) {
      const grouped = new Map<string, string[]>();
      for (const lock of locks) {
        const [eventId, seatId] = lock.split(':');
        if (eventId && seatId) {
          if (!grouped.has(eventId)) grouped.set(eventId, []);
          grouped.get(eventId)!.push(seatId);
        }
      }

      for (const [eventId, seatIds] of grouped.entries()) {
        const sessionId = socket.data.sessionId || '';
        const releasedKeys = await releaseLocks(eventId, seatIds, sessionId);
        const releasedSeatIds = releasedKeys.map((key) => key.split(':').at(-1)).filter(Boolean) as string[];
        const safeToAnnounce = await filterSeatsStillReservedInDatabase(eventId, releasedSeatIds);
        if (safeToAnnounce.length > 0) {
          socket.to(`event:${eventId}`).emit('seat:unlocked', { seatIds: safeToAnnounce });
        }
        logger.info(
          { socketId: socket.id, eventId, seatIds: releasedSeatIds, announcedSeatIds: safeToAnnounce },
          'Released socket-owned locks on disconnect'
        );
      }
      locks.clear();
    }
  });
}

/**
 * Register event handlers for the admin namespace connections
 */
export function registerAdminSocketHandlers(socket: Socket): void {
  logger.info({ socketId: socket.id, adminId: socket.data.admin?.adminId }, '🔐 Admin socket connected');

  socket.on('admin:join', ({ room }: { room: string }) => {
    socket.join(`admin:${room}`);
  });

  socket.on('disconnect', () => {
    logger.debug({ socketId: socket.id }, 'Admin socket disconnected');
  });
}
