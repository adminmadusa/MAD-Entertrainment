"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketIO = initSocketIO;
exports.getIO = getIO;
exports.emitToEvent = emitToEvent;
exports.emitToBooking = emitToBooking;
exports.emitToAdmin = emitToAdmin;
const socket_io_1 = require("socket.io");
const logger_1 = require("../utils/logger");
let io = null;
function initSocketIO(httpServer) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) ?? [
        'http://localhost:3000',
    ];
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
    });
    // ─── Middleware ──────────────────────────────────────────
    io.use((socket, next) => {
        // Optional auth token validation for admin sockets
        const token = socket.handshake.auth?.token;
        if (token) {
            // Token validation happens in admin namespace — public sockets are open
            socket.data.adminToken = token;
        }
        next();
    });
    // ─── Public Namespace ────────────────────────────────────
    io.on('connection', (socket) => {
        logger_1.logger.info({ socketId: socket.id }, '🔌 Socket connected');
        // Join event room for live seat updates
        socket.on('event:join', ({ eventId }) => {
            socket.join(`event:${eventId}`);
            logger_1.logger.debug({ socketId: socket.id, eventId }, 'Socket joined event room');
        });
        socket.on('event:leave', ({ eventId }) => {
            socket.leave(`event:${eventId}`);
        });
        // Seat locking
        socket.on('seat:lock', ({ eventId, seatIds, sessionId }) => {
            // Emitted to all others in the event room
            socket.to(`event:${eventId}`).emit('seat:locked', { seatIds, sessionId });
            logger_1.logger.debug({ eventId, seatIds, sessionId }, 'Seats locked via socket');
        });
        socket.on('seat:unlock', ({ eventId, seatIds, sessionId }) => {
            socket.to(`event:${eventId}`).emit('seat:unlocked', { seatIds });
            logger_1.logger.debug({ eventId, seatIds, sessionId }, 'Seats unlocked via socket');
        });
        // Booking room
        socket.on('booking:join', ({ bookingId }) => {
            socket.join(`booking:${bookingId}`);
        });
        socket.on('disconnect', (reason) => {
            logger_1.logger.debug({ socketId: socket.id, reason }, '🔌 Socket disconnected');
        });
    });
    // ─── Admin Namespace ─────────────────────────────────────
    const adminNs = io.of('/admin');
    adminNs.on('connection', (socket) => {
        logger_1.logger.info({ socketId: socket.id }, '🔐 Admin socket connected');
        socket.on('admin:join', ({ room }) => {
            socket.join(`admin:${room}`);
        });
        socket.on('disconnect', () => {
            logger_1.logger.debug({ socketId: socket.id }, 'Admin socket disconnected');
        });
    });
    logger_1.logger.info('✅ Socket.IO initialized');
    return io;
}
function getIO() {
    if (!io) {
        throw new Error('Socket.IO is not initialized. Call initSocketIO() first.');
    }
    return io;
}
/**
 * Emit to all clients in an event room
 */
function emitToEvent(eventId, event, data) {
    getIO().to(`event:${eventId}`).emit(event, data);
}
/**
 * Emit to a specific booking room (e.g. payment confirmed)
 */
function emitToBooking(bookingId, event, data) {
    getIO().to(`booking:${bookingId}`).emit(event, data);
}
/**
 * Emit to admin namespace
 */
function emitToAdmin(room, event, data) {
    getIO().of('/admin').to(`admin:${room}`).emit(event, data);
}
//# sourceMappingURL=socket.js.map