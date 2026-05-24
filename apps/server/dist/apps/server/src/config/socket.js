"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketIO = initSocketIO;
exports.getIO = getIO;
exports.emitToEvent = emitToEvent;
exports.emitToBooking = emitToBooking;
exports.emitToAdmin = emitToAdmin;
const socket_io_1 = require("socket.io");
const sockets_1 = require("../sockets");
const jwt_1 = require("../utils/jwt");
const logger_1 = require("../utils/logger");
const env_1 = require("./env");
let io = null;
function initSocketIO(httpServer) {
    if (io) {
        logger_1.logger.info('⚠️ Socket.IO already initialized, returning existing instance');
        return io;
    }
    const env = (0, env_1.getEnv)();
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
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
    io.on('connection', sockets_1.registerSocketHandlers);
    // ─── Admin Namespace ─────────────────────────────────────
    const adminNs = io.of('/admin');
    adminNs.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            logger_1.logger.warn({ socketId: socket.id }, '🔐 Admin socket connection blocked: Token missing');
            return next(new Error('Authentication error: Token missing'));
        }
        try {
            const decoded = (0, jwt_1.verifyAdminToken)(token);
            socket.data.admin = decoded;
            next();
        }
        catch (err) {
            logger_1.logger.warn({ socketId: socket.id, err: err.message }, '🔐 Admin socket connection blocked: Invalid token');
            return next(new Error('Authentication error: Invalid token'));
        }
    });
    adminNs.on('connection', sockets_1.registerAdminSocketHandlers);
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