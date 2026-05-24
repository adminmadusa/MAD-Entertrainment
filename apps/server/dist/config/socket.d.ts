import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
export declare function initSocketIO(httpServer: HTTPServer): SocketIOServer;
export declare function getIO(): SocketIOServer;
/**
 * Emit to all clients in an event room
 */
export declare function emitToEvent(eventId: string, event: string, data: unknown): void;
/**
 * Emit to a specific booking room (e.g. payment confirmed)
 */
export declare function emitToBooking(bookingId: string, event: string, data: unknown): void;
/**
 * Emit to admin namespace
 */
export declare function emitToAdmin(room: string, event: string, data: unknown): void;
//# sourceMappingURL=socket.d.ts.map