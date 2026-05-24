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
let io;
function initSocketIO(httpServer) {
    if (io)
        return io;
    const allowedOrigins = (0, env_1.getEnv)().ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
    io = new socket_io_1.Server(httpServer, {
        cors: { origin: allowedOrigins, credentials: true },
        pingTimeout: 60000,
        pingInterval: 25000,
    });
    io.use((socket, next) => {
        const sessionToken = socket.handshake.auth?.sessionToken || socket.handshake.headers['x-session-id'];
        if (sessionToken) {
            try {
                socket.data.sessionId = (0, jwt_1.verifySessionToken)(sessionToken);
            }
            catch (err) {
                socket.data.sessionId = socket.id;
            }
        }
        else {
            socket.data.sessionId = socket.id;
        }
        next();
    });
    io.on('connection', sockets_1.registerSocketHandlers);
    const adminNs = io.of('/admin');
    adminNs.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next(new Error('Authentication error: Token missing'));
        try {
            socket.data.admin = (0, jwt_1.verifyAdminToken)(token);
            next();
        }
        catch (err) {
            logger_1.logger.warn({ err, socketId: socket.id }, 'Admin socket authentication failed');
            next(new Error('Authentication error: Invalid token'));
        }
    });
    adminNs.on('connection', sockets_1.registerAdminSocketHandlers);
    return io;
}
function getIO() {
    if (!io)
        throw new Error('Socket.IO is not initialized');
    return io;
}
function emitToEvent(eventId, event, data) {
    getIO().to(`event:${eventId}`).emit(event, data);
}
function emitToBooking(bookingId, event, data) {
    getIO().to(`booking:${bookingId}`).emit(event, data);
}
function emitToAdmin(room, event, data) {
    getIO().of('/admin').to(`admin:${room}`).emit(event, data);
}
//# sourceMappingURL=socket.js.map