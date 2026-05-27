import { Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import crypto from "crypto";

import {
  registerAdminSocketHandlers,
  registerSocketHandlers,
} from "../sockets";
import {
  verifyAdminToken,
  verifySessionToken,
  verifyUserToken,
  extractBearerToken,
} from "../utils/jwt";
import { logger } from "../utils/logger";
import { getAllowedOrigins } from "./env";

let io: SocketIOServer | undefined;

const telemetry = {
  emitsCount: {} as Record<string, number>,
  emitFailures: {} as Record<string, number>,
  skippedEmits: {} as Record<string, number>,
};

export interface SocketTelemetry {
  initialized: boolean;
  connectedClients: number;
  adminClients: number;
  emitsCount: Record<string, number>;
  emitFailures: Record<string, number>;
  skippedEmits: Record<string, number>;
}

export function getSocketTelemetry(): SocketTelemetry {
  const isInit = io !== undefined;
  let connectedClients = 0;
  let adminClients = 0;

  if (isInit && io) {
    connectedClients = io.of("/").sockets.size;
    adminClients = io.of("/admin").sockets.size;
  }

  return {
    initialized: isInit,
    connectedClients,
    adminClients,
    emitsCount: { ...telemetry.emitsCount },
    emitFailures: { ...telemetry.emitFailures },
    skippedEmits: { ...telemetry.skippedEmits },
  };
}

export function initSocketIO(httpServer: Server): SocketIOServer {
  if (io) return io;

  const allowedOrigins = getAllowedOrigins();
  io = new SocketIOServer(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    // Extract or generate connection correlation ID
    const correlationId =
      socket.handshake.auth?.correlationId ||
      socket.handshake.query?.correlationId ||
      socket.handshake.headers["x-correlation-id"] ||
      socket.handshake.headers["x-request-id"] ||
      `socket:conn:${crypto.randomUUID()}`;
    socket.data.correlationId = correlationId;

    // 1. Try to verify user token first
    const userToken =
      socket.handshake.auth?.token ||
      extractBearerToken(socket.handshake.headers["authorization"]);
    if (userToken) {
      try {
        socket.data.user = verifyUserToken(userToken);
      } catch (err) {
        logger.debug(
          { err, socketId: socket.id },
          "Socket user token validation failed",
        );
      }
    }

    // 2. Try session token second
    const sessionToken =
      socket.handshake.auth?.sessionToken ||
      socket.handshake.headers["x-session-id"];
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

  io.on("connection", registerSocketHandlers);

  const adminNs = io.of("/admin");
  adminNs.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error: Token missing"));
    try {
      socket.data.admin = verifyAdminToken(token);
      next();
    } catch (err) {
      logger.warn(
        { err, socketId: socket.id },
        "Admin socket authentication failed",
      );
      next(new Error("Authentication error: Invalid token"));
    }
  });
  adminNs.on("connection", registerAdminSocketHandlers);

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO is not initialized");
  return io;
}

export function emitToEvent(
  eventId: string,
  event: string,
  data: unknown,
  correlationId?: string,
): void {
  if (!io) {
    telemetry.skippedEmits[event] = (telemetry.skippedEmits[event] || 0) + 1;
    logger.warn(
      { event, eventId, correlationId },
      "Socket.IO is not initialized — skipping event emit",
    );
    return;
  }
  try {
    telemetry.emitsCount[event] = (telemetry.emitsCount[event] || 0) + 1;
    io.to(`event:${eventId}`).emit(event, data);
  } catch (err) {
    telemetry.emitFailures[event] = (telemetry.emitFailures[event] || 0) + 1;
    logger.error(
      { err, event, eventId, correlationId },
      "Failed to emit to event room",
    );
  }
}

export function emitToBooking(
  bookingId: string,
  event: string,
  data: unknown,
  correlationId?: string,
): void {
  if (!io) {
    telemetry.skippedEmits[event] = (telemetry.skippedEmits[event] || 0) + 1;
    logger.warn(
      { event, bookingId, correlationId },
      "Socket.IO is not initialized — skipping booking emit",
    );
    return;
  }
  try {
    telemetry.emitsCount[event] = (telemetry.emitsCount[event] || 0) + 1;
    io.to(`booking:${bookingId}`).emit(event, data);
  } catch (err) {
    telemetry.emitFailures[event] = (telemetry.emitFailures[event] || 0) + 1;
    logger.error(
      { err, event, bookingId, correlationId },
      "Failed to emit to booking room",
    );
  }
}

export function emitToAdmin(
  room: string,
  event: string,
  data: unknown,
  correlationId?: string,
): void {
  if (!io) {
    telemetry.skippedEmits[event] = (telemetry.skippedEmits[event] || 0) + 1;
    logger.warn(
      { event, room, correlationId },
      "Socket.IO is not initialized — skipping admin emit",
    );
    return;
  }
  try {
    telemetry.emitsCount[event] = (telemetry.emitsCount[event] || 0) + 1;
    io.of("/admin").to(`admin:${room}`).emit(event, data);
  } catch (err) {
    telemetry.emitFailures[event] = (telemetry.emitFailures[event] || 0) + 1;
    logger.error(
      { err, event, room, correlationId },
      "Failed to emit to admin namespace/room",
    );
  }
}
