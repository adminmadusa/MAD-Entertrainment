import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { registerAdminSocketHandlers, registerSocketHandlers } from '../sockets';
import { verifyAdminToken, verifySessionToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { getEnv } from './env';

let io: SocketIOServer | undefined;

export function initSocketIO(httpServer: Server): SocketIOServer {
  if (io) return io;

  const allowedOrigins = getEnv().ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
  io = new SocketIOServer(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    const sessionToken = socket.handshake.auth?.sessionToken || socket.handshake.headers['x-session-id'];
    if (sessionToken) {
      try {
        socket.data.sessionId = verifySessionToken(sessionToken);
      } catch (err) {
        socket.data.sessionId = socket.id;
      }
    } else {
      socket.data.sessionId = socket.id;
    }
    next();
  });

  io.on('connection', registerSocketHandlers);

  const adminNs = io.of('/admin');
  adminNs.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: Token missing'));
    try {
      socket.data.admin = verifyAdminToken(token);
      next();
    } catch (err) {
      logger.warn({ err, socketId: socket.id }, 'Admin socket authentication failed');
      next(new Error('Authentication error: Invalid token'));
    }
  });
  adminNs.on('connection', registerAdminSocketHandlers);

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO is not initialized');
  return io;
}

export function emitToEvent(eventId: string, event: string, data: unknown): void {
  getIO().to(`event:${eventId}`).emit(event, data);
}

export function emitToBooking(bookingId: string, event: string, data: unknown): void {
  getIO().to(`booking:${bookingId}`).emit(event, data);
}

export function emitToAdmin(room: string, event: string, data: unknown): void {
  getIO().of('/admin').to(`admin:${room}`).emit(event, data);
}
