"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = registerSocketHandlers;
exports.registerAdminSocketHandlers = registerAdminSocketHandlers;
const shared_1 = require("@mad/shared");
const redis_1 = require("../config/redis");
const seat_layout_schema_1 = require("../models/seat-layout.schema");
const logger_1 = require("../utils/logger");
// Helper to get Redis key for a seat lock
function getSeatLockKey(eventId, seatId) {
    return `mad:lock:event:${eventId}:seat:${seatId}`;
}
// Verify seat availability in MongoDB
async function verifySeatsAvailable(eventId, seatIds) {
    try {
        const layout = await seat_layout_schema_1.SeatLayout.findOne({ eventId });
        if (!layout)
            return false;
        for (const seatId of seatIds) {
            const seat = layout.seats.find((s) => s.seatId === seatId);
            if (!seat || seat.status !== shared_1.SeatStatus.AVAILABLE) {
                return false;
            }
        }
        return true;
    }
    catch (err) {
        logger_1.logger.error({ err, eventId, seatIds }, 'Failed to verify seats in database');
        return false;
    }
}
// Acquire locks in Redis
async function acquireLocks(eventId, seatIds, sessionId) {
    const redis = (0, redis_1.getRedis)();
    // 1. Check DB first
    const dbAvailable = await verifySeatsAvailable(eventId, seatIds);
    if (!dbAvailable)
        return false;
    // 2. Atomically acquire or refresh locks. This avoids check-then-set races
    // where two clients pass mget before either writes the lock.
    const keys = seatIds.map((id) => getSeatLockKey(eventId, id));
    if (keys.length === 0)
        return true;
    const acquiredKeys = [];
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
async function releaseLockKeys(keys, sessionId) {
    const redis = (0, redis_1.getRedis)();
    const released = [];
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
async function releaseLocks(eventId, seatIds, sessionId) {
    const keys = seatIds.map((id) => getSeatLockKey(eventId, id));
    if (keys.length === 0)
        return [];
    return releaseLockKeys(keys, sessionId);
}
async function filterSeatsStillReservedInDatabase(eventId, seatIds) {
    const layout = await seat_layout_schema_1.SeatLayout.findOne({ eventId }).lean();
    if (!layout)
        return seatIds;
    const unavailable = new Set(layout.seats
        .filter((seat) => seatIds.includes(seat.seatId) && seat.status !== shared_1.SeatStatus.AVAILABLE)
        .map((seat) => seat.seatId));
    return seatIds.filter((seatId) => !unavailable.has(seatId));
}
/**
 * Register event handlers for the public namespace connections
 */
function registerSocketHandlers(socket) {
    logger_1.logger.info({ socketId: socket.id }, '🔌 Socket connected');
    // Initialize socket connection session tracking
    if (!socket.data.lockedSeats) {
        socket.data.lockedSeats = new Set();
    }
    // Join event room for live seat updates
    socket.on('event:join', ({ eventId }) => {
        socket.join(`event:${eventId}`);
        logger_1.logger.debug({ socketId: socket.id, eventId }, 'Socket joined event room');
    });
    socket.on('event:leave', ({ eventId }) => {
        socket.leave(`event:${eventId}`);
    });
    // Seat locking handler
    socket.on('seat:lock', async ({ eventId, seatIds, sessionId }) => {
        if (socket.data.sessionId && socket.data.sessionId !== sessionId) {
            socket.emit('seat:lock:status', { success: false, seatIds, message: 'Unauthorized session' });
            logger_1.logger.warn({ socketId: socket.id, expectedSessionId: socket.data.sessionId, receivedSessionId: sessionId }, 'Unauthorized lock attempt');
            return;
        }
        socket.data.sessionId = sessionId;
        const { isRedisConnected } = require('../config/redis');
        let success = false;
        if (isRedisConnected()) {
            success = await acquireLocks(eventId, seatIds, sessionId);
        }
        else {
            logger_1.logger.warn('Redis disconnected. Falling back to MongoDB for seat validation (degraded mode).');
            success = await verifySeatsAvailable(eventId, seatIds);
        }
        if (success) {
            const lockedSet = socket.data.lockedSeats;
            for (const seatId of seatIds) {
                lockedSet.add(`${eventId}:${seatId}`);
            }
            socket.to(`event:${eventId}`).emit('seat:locked', { seatIds, sessionId });
            socket.emit('seat:lock:status', { success: true, seatIds });
            logger_1.logger.info({ socketId: socket.id, eventId, seatIds, sessionId }, 'Seat locks acquired');
        }
        else {
            socket.emit('seat:lock:status', { success: false, seatIds, message: 'Some seats are already locked or booked' });
            logger_1.logger.info({ socketId: socket.id, eventId, seatIds, sessionId }, 'Seat lock rejected');
        }
    });
    // Seat unlocking handler
    socket.on('seat:unlock', async ({ eventId, seatIds, sessionId }) => {
        if (socket.data.sessionId && socket.data.sessionId !== sessionId) {
            socket.emit('seat:unlock:status', { success: false, seatIds, message: 'Unauthorized session' });
            return;
        }
        const { isRedisConnected } = require('../config/redis');
        let releasedSeatIds = seatIds;
        if (isRedisConnected()) {
            const releasedKeys = await releaseLocks(eventId, seatIds, sessionId);
            releasedSeatIds = releasedKeys.map((key) => key.split(':').at(-1)).filter(Boolean);
        }
        const lockedSet = socket.data.lockedSeats;
        for (const seatId of releasedSeatIds) {
            lockedSet.delete(`${eventId}:${seatId}`);
        }
        if (releasedSeatIds.length > 0) {
            socket.to(`event:${eventId}`).emit('seat:unlocked', { seatIds: releasedSeatIds });
        }
        socket.emit('seat:unlock:status', { success: true, seatIds: releasedSeatIds });
        logger_1.logger.info({ socketId: socket.id, eventId, seatIds: releasedSeatIds, sessionId }, 'Seat locks released');
    });
    // Booking room
    socket.on('booking:join', ({ bookingId }) => {
        socket.join(`booking:${bookingId}`);
    });
    socket.on('disconnect', async (reason) => {
        logger_1.logger.debug({ socketId: socket.id, reason }, '🔌 Socket disconnected');
        const locks = socket.data.lockedSeats;
        if (locks && locks.size > 0) {
            const grouped = new Map();
            for (const lock of locks) {
                const [eventId, seatId] = lock.split(':');
                if (eventId && seatId) {
                    if (!grouped.has(eventId))
                        grouped.set(eventId, []);
                    grouped.get(eventId).push(seatId);
                }
            }
            for (const [eventId, seatIds] of grouped.entries()) {
                const sessionId = socket.data.sessionId || '';
                const releasedKeys = await releaseLocks(eventId, seatIds, sessionId);
                const releasedSeatIds = releasedKeys.map((key) => key.split(':').at(-1)).filter(Boolean);
                const safeToAnnounce = await filterSeatsStillReservedInDatabase(eventId, releasedSeatIds);
                if (safeToAnnounce.length > 0) {
                    socket.to(`event:${eventId}`).emit('seat:unlocked', { seatIds: safeToAnnounce });
                }
                logger_1.logger.info({ socketId: socket.id, eventId, seatIds: releasedSeatIds, announcedSeatIds: safeToAnnounce }, 'Released socket-owned locks on disconnect');
            }
            locks.clear();
        }
    });
}
/**
 * Register event handlers for the admin namespace connections
 */
function registerAdminSocketHandlers(socket) {
    logger_1.logger.info({ socketId: socket.id, adminId: socket.data.admin?.adminId }, '🔐 Admin socket connected');
    socket.on('admin:join', ({ room }) => {
        socket.join(`admin:${room}`);
    });
    socket.on('disconnect', () => {
        logger_1.logger.debug({ socketId: socket.id }, 'Admin socket disconnected');
    });
}
//# sourceMappingURL=index.js.map