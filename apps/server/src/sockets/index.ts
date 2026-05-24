import { SeatStatus } from '@mad/shared';
import { Types } from 'mongoose';
import { Socket } from 'socket.io';
import crypto from 'crypto';

import { getRedis } from '../config/redis';
import { Booking } from '../models/booking.schema';
import { SeatLayout } from '../models/seat-layout.schema';
import { logger } from '../utils/logger';
import { runWithContext } from '../utils/context';
import { auditLog } from '../utils/audit';
import {
  socketEventJoinSchema,
  socketBookingJoinSchema,
  socketSeatActionSchema,
} from '../validations/payment.validation';

// Helper to get Redis key for a seat lock
function getSeatLockKey(eventId: string, seatId: string): string {
  return `mad:lock:event:${eventId}:seat:${seatId}`;
}

// Verify seat availability in MongoDB
async function verifySeatsAvailable(eventId: string, seatIds: string[]): Promise<boolean> {
  try {
    const layout = await SeatLayout.findOne({ eventId }).select('seats.seatId seats.status').lean();
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
  const layout = await SeatLayout.findOne({ eventId }).select('seats.seatId seats.status').lean();
  if (!layout) return seatIds;

  const unavailable = new Set(
    layout.seats
      .filter((seat) => seatIds.includes(seat.seatId) && seat.status !== SeatStatus.AVAILABLE)
      .map((seat) => seat.seatId)
  );

  return seatIds.filter((seatId) => !unavailable.has(seatId));
}

// Connection rate limiter mapping for socket events
const socketRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkSocketRateLimit(socketId: string, action: string, limit: number, windowMs: number): boolean {
  const key = `${socketId}:${action}`;
  const now = Date.now();
  const current = socketRateLimits.get(key);

  if (!current || now > current.resetAt) {
    socketRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  return true;
}

/**
 * Register event handlers for the public namespace connections
 */
function withSocketContext(
  socket: Socket,
  eventName: string,
  listener: (...args: any[]) => void | Promise<void>
): (...args: any[]) => void {
  return (...args: any[]) => {
    const parentId = socket.data.correlationId || `socket:conn:${crypto.randomUUID()}`;
    const correlationId = `${parentId}:${eventName}:${crypto.randomUUID().slice(0, 8)}`;
    const traceContext = {
      correlationId,
      socketId: socket.id,
      sessionId: socket.data.sessionId,
      userId: socket.data.user?.sub,
    };
    runWithContext(traceContext, () => {
      listener(...args);
    });
  };
}

function withAdminSocketContext(
  socket: Socket,
  eventName: string,
  listener: (...args: any[]) => void | Promise<void>
): (...args: any[]) => void {
  return (...args: any[]) => {
    const parentId = socket.data.correlationId || `socket:conn:${crypto.randomUUID()}`;
    const correlationId = `${parentId}:${eventName}:${crypto.randomUUID().slice(0, 8)}`;
    const traceContext = {
      correlationId,
      socketId: socket.id,
      adminId: socket.data.admin?.adminId,
    };
    runWithContext(traceContext, () => {
      listener(...args);
    });
  };
}

/**
 * Register event handlers for the public namespace connections
 */
export function registerSocketHandlers(socket: Socket): void {
  auditLog({
    action: 'SOCKET_CONNECTED',
    actor: socket.data.user?.sub
      ? { type: 'user', id: socket.data.user.sub }
      : { type: 'guest', id: socket.data.sessionId },
    status: 'success',
    metadata: { socketId: socket.id, sessionId: socket.data.sessionId },
    description: `Websocket connection established for session ${socket.data.sessionId}`,
  });

  // Initialize socket connection session tracking
  if (!socket.data.lockedSeats) {
    socket.data.lockedSeats = new Set<string>();
  }

  // Join event room for live seat updates
  socket.on('event:join', withSocketContext(socket, 'event:join', async (payload: unknown) => {
    const parseResult = socketEventJoinSchema.safeParse(payload);
    if (!parseResult.success) {
      socket.emit('event:join:status', { success: false, message: 'Invalid payload format' });
      socket.emit('error', {
        code: 'BAD_REQUEST',
        message: 'Invalid payload format',
      });
      return;
    }
    const { eventId } = parseResult.data;

    // Prevent event room joining rate limit abuse (max 20 joins/minute)
    if (!checkSocketRateLimit(socket.id, 'event:join', 20, 60000)) {
      socket.emit('event:join:status', { success: false, eventId, message: 'Rate limit exceeded' });
      socket.emit('error', {
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded',
      });
      return;
    }

    try {
      const { Event } = require('../models/event.schema');
      const exists = await Event.exists({ _id: eventId });
      if (!exists) {
        socket.emit('event:join:status', { success: false, eventId, message: 'Event not found' });
        auditLog({
          action: 'EVENT_ROOM_JOIN_FAILED',
          status: 'failure',
          metadata: { eventId, socketId: socket.id, reason: 'Event not found' },
          description: `Failed to join event room event:${eventId}: Event not found`
        });
        return;
      }

      socket.join(`event:${eventId}`);
      socket.emit('event:join:status', { success: true, eventId });
      auditLog({
        action: 'EVENT_ROOM_JOINED',
        status: 'success',
        metadata: { eventId, socketId: socket.id },
        description: `Joined event room event:${eventId}`
      });
    } catch (err) {
      logger.error({ err, eventId }, 'Failed to join event room');
      socket.emit('event:join:status', { success: false, eventId, message: 'Internal server error' });
      auditLog({
        action: 'EVENT_ROOM_JOIN_FAILED',
        status: 'failure',
        metadata: { eventId, socketId: socket.id, error: err instanceof Error ? err.message : String(err) },
        description: `Failed to join event room event:${eventId}`
      });
    }
  }));

  socket.on('event:leave', withSocketContext(socket, 'event:leave', ({ eventId }: { eventId: string }) => {
    if (Types.ObjectId.isValid(eventId)) {
      socket.leave(`event:${eventId}`);
      auditLog({
        action: 'EVENT_ROOM_LEFT',
        status: 'success',
        metadata: { eventId, socketId: socket.id },
        description: `Left event room event:${eventId}`
      });
    }
  }));

  // Seat locking handler
  socket.on(
    'seat:lock',
    withSocketContext(socket, 'seat:lock', async (payload: unknown) => {
      const parseResult = socketSeatActionSchema.safeParse(payload);
      if (!parseResult.success) {
        socket.emit('seat:lock:status', { success: false, message: 'Invalid payload format' });
        socket.emit('error', {
          code: 'BAD_REQUEST',
          message: 'Invalid payload format',
        });
        return;
      }
      const { eventId, seatIds, sessionId } = parseResult.data;

      // Prevent seat locking flooding abuse (max 30 locks/minute)
      if (!checkSocketRateLimit(socket.id, 'seat:lock', 30, 60000)) {
        socket.emit('seat:lock:status', { success: false, seatIds: [], message: 'Rate limit exceeded' });
        socket.emit('error', {
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded for seat locking',
        });
        return;
      }

      if (socket.data.sessionId && socket.data.sessionId !== sessionId) {
        socket.emit('seat:lock:status', { success: false, seatIds, message: 'Unauthorized session' });
        logger.warn({ socketId: socket.id, expectedSessionId: socket.data.sessionId, receivedSessionId: sessionId }, 'Unauthorized lock attempt');
        auditLog({
          action: 'SEAT_LOCK_REJECTED',
          status: 'failure',
          metadata: { eventId, seatIds, sessionId, reason: 'Unauthorized session' },
          description: `Rejected seat locks for seats: ${seatIds.join(', ')} due to session mismatch`
        });
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
        auditLog({
          action: 'SEAT_LOCK_ACQUIRED',
          status: 'success',
          metadata: { eventId, seatIds, sessionId },
          description: `Acquired seat locks for seats: ${seatIds.join(', ')}`
        });
      } else {
        socket.emit('seat:lock:status', { success: false, seatIds, message: 'Some seats are already locked or booked' });
        auditLog({
          action: 'SEAT_LOCK_REJECTED',
          status: 'failure',
          metadata: { eventId, seatIds, sessionId, reason: 'Already locked or booked' },
          description: `Rejected seat locks for seats: ${seatIds.join(', ')}`
        });
      }
    })
  );

  // Seat unlocking handler
  socket.on(
    'seat:unlock',
    withSocketContext(socket, 'seat:unlock', async (payload: unknown) => {
      const parseResult = socketSeatActionSchema.safeParse(payload);
      if (!parseResult.success) {
        socket.emit('seat:unlock:status', { success: false, message: 'Invalid payload format' });
        socket.emit('error', {
          code: 'BAD_REQUEST',
          message: 'Invalid payload format',
        });
        return;
      }
      const { eventId, seatIds, sessionId } = parseResult.data;

      // Prevent seat unlocking flooding abuse (max 30 unlocks/minute)
      if (!checkSocketRateLimit(socket.id, 'seat:unlock', 30, 60000)) {
        socket.emit('seat:unlock:status', { success: false, seatIds: [], message: 'Rate limit exceeded' });
        socket.emit('error', {
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded for seat unlocking',
        });
        return;
      }

      if (socket.data.sessionId && socket.data.sessionId !== sessionId) {
        socket.emit('seat:unlock:status', { success: false, seatIds, message: 'Unauthorized session' });
        auditLog({
          action: 'SEAT_UNLOCK_REJECTED',
          status: 'failure',
          metadata: { eventId, seatIds, sessionId, reason: 'Unauthorized session' },
          description: `Rejected seat unlock for seats: ${seatIds.join(', ')} due to session mismatch`
        });
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
      auditLog({
        action: 'SEAT_LOCK_RELEASED',
        status: 'success',
        metadata: { eventId, seatIds: releasedSeatIds, sessionId },
        description: `Released seat locks for seats: ${releasedSeatIds.join(', ')}`
      });
    })
  );

  // Booking room
  socket.on('booking:join', withSocketContext(socket, 'booking:join', async (payload: unknown) => {
    const parseResult = socketBookingJoinSchema.safeParse(payload);
    if (!parseResult.success) {
      socket.emit('booking:join:status', { success: false, message: 'Invalid payload format' });
      socket.emit('error', {
        code: 'BAD_REQUEST',
        message: 'Invalid payload format',
      });
      return;
    }
    const { bookingId } = parseResult.data;

    // Prevent room enumeration / discovery rate limit abuse (max 10 joins/minute)
    if (!checkSocketRateLimit(socket.id, 'booking:join', 10, 60000)) {
      socket.emit('booking:join:status', { success: false, bookingId, message: 'Rate limit exceeded' });
      socket.emit('error', {
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded',
      });
      return;
    }

    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        socket.emit('booking:join:status', { success: false, bookingId, message: 'Booking not found' });
        auditLog({
          action: 'BOOKING_ROOM_JOIN_FAILED',
          status: 'failure',
          metadata: { bookingId, socketId: socket.id, reason: 'Booking not found' },
          description: `Failed to join booking room booking:${bookingId}: Booking not found`
        });
        return;
      }

      const reqUserId = socket.data.user?.sub;
      const reqSessionId = socket.data.sessionId;

      const isUserOwner = !!booking.userId && !!reqUserId && booking.userId.toString() === reqUserId;
      const isGuestOwner = !!booking.sessionId && !!reqSessionId && booking.sessionId === reqSessionId;

      if (!isUserOwner && !isGuestOwner) {
        socket.emit('booking:join:status', { success: false, bookingId, message: 'Forbidden: You do not own this booking' });
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: 'Unauthorized room access',
        });
        logger.warn({ socketId: socket.id, bookingId, reqUserId, reqSessionId }, 'Unauthorized booking room join attempt blocked');
        auditLog({
          action: 'BOOKING_ROOM_JOIN_BLOCKED',
          status: 'failure',
          metadata: { bookingId, socketId: socket.id, reqUserId, reqSessionId },
          description: `Blocked unauthorized join to booking room booking:${bookingId}`
        });
        return;
      }

      socket.join(`booking:${bookingId}`);
      socket.emit('booking:join:status', { success: true, bookingId });
      auditLog({
        action: 'BOOKING_ROOM_JOINED',
        status: 'success',
        metadata: { bookingId, socketId: socket.id },
        description: `Joined booking room booking:${bookingId}`
      });
    } catch (err) {
      logger.error({ err, bookingId }, 'Failed to join booking room');
      socket.emit('booking:join:status', { success: false, bookingId, message: 'Internal server error' });
      auditLog({
        action: 'BOOKING_ROOM_JOIN_FAILED',
        status: 'failure',
        metadata: { bookingId, socketId: socket.id, error: err instanceof Error ? err.message : String(err) },
        description: `Failed to join booking room booking:${bookingId}`
      });
    }
  }));

  socket.on('disconnect', withSocketContext(socket, 'disconnect', async (reason) => {
    // Clean up connection rate limiting mapping entries for this socket connection
    for (const key of socketRateLimits.keys()) {
      if (key.startsWith(`${socket.id}:`)) {
        socketRateLimits.delete(key);
      }
    }

    const locks = socket.data.lockedSeats as Set<string> | undefined;
    const releasedList: { eventId: string; seatIds: string[] }[] = [];
    
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
        releasedList.push({ eventId, seatIds: releasedSeatIds });
        logger.info(
          { socketId: socket.id, eventId, seatIds: releasedSeatIds, announcedSeatIds: safeToAnnounce },
          'Released socket-owned locks on disconnect'
        );
      }
      locks.clear();
    }

    auditLog({
      action: 'SOCKET_DISCONNECTED',
      actor: socket.data.user?.sub
        ? { type: 'user', id: socket.data.user.sub }
        : { type: 'guest', id: socket.data.sessionId },
      status: 'success',
      metadata: { socketId: socket.id, reason, releasedSeatLocks: releasedList },
      description: `Websocket disconnected: ${reason}`
    });
  }));
}

/**
 * Register event handlers for the admin namespace connections
 */
export function registerAdminSocketHandlers(socket: Socket): void {
  auditLog({
    action: 'ADMIN_SOCKET_CONNECTED',
    actor: { type: 'admin', id: socket.data.admin?.adminId },
    status: 'success',
    metadata: { socketId: socket.id, adminId: socket.data.admin?.adminId },
    description: `Admin websocket connection established`
  });

  socket.on('admin:join', withAdminSocketContext(socket, 'admin:join', ({ room }: { room: string }) => {
    if (!socket.data.admin || !socket.data.admin.role) {
      logger.warn({ socketId: socket.id }, 'Unauthorized admin:join attempt (missing credentials)');
      socket.emit('admin:join:status', { success: false, room, message: 'Unauthorized' });
      socket.emit('error', {
        code: 'FORBIDDEN',
        message: 'Unauthorized room access',
      });
      auditLog({
        action: 'ADMIN_ROOM_JOIN_BLOCKED',
        status: 'failure',
        metadata: { room, socketId: socket.id },
        description: `Blocked unauthorized join to admin room admin:${room} (missing credentials)`
      });
      return;
    }

    const allowedRooms = ['bookings', 'analytics'];
    if (!allowedRooms.includes(room)) {
      logger.warn({ socketId: socket.id, room, admin: socket.data.admin }, 'Forbidden admin:join attempt for unauthorized room');
      socket.emit('admin:join:status', { success: false, room, message: 'Forbidden room' });
      socket.emit('error', {
        code: 'FORBIDDEN',
        message: 'Unauthorized room access',
      });
      auditLog({
        action: 'ADMIN_ROOM_JOIN_BLOCKED',
        actor: { type: 'admin', id: socket.data.admin.adminId },
        status: 'failure',
        metadata: { room, socketId: socket.id },
        description: `Blocked unauthorized join to forbidden admin room admin:${room}`
      });
      return;
    }

    socket.join(`admin:${room}`);
    socket.emit('admin:join:status', { success: true, room });
    auditLog({
      action: 'ADMIN_ROOM_JOINED',
      actor: { type: 'admin', id: socket.data.admin.adminId },
      status: 'success',
      metadata: { room, socketId: socket.id },
      description: `Admin successfully joined room admin:${room}`
    });
  }));

  socket.on('disconnect', withAdminSocketContext(socket, 'disconnect', () => {
    auditLog({
      action: 'ADMIN_SOCKET_DISCONNECTED',
      actor: { type: 'admin', id: socket.data.admin?.adminId },
      status: 'success',
      metadata: { socketId: socket.id },
      description: `Admin websocket disconnected`
    });
  }));
}
