import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import Module from 'module';
import { registerSocketHandlers } from './index';
import { SeatLayout } from '../models/seat-layout.schema';
import { auditLog } from '../utils/audit';

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  expire: vi.fn(),
  isRedisConnected: vi.fn(() => true),
};

const mockEventModel = {
  exists: vi.fn(),
};

// Mock dependencies for ESM imports
vi.mock('../config/redis', () => ({
  getRedis: vi.fn(() => mockRedis),
  isRedisConnected: vi.fn(() => mockRedis.isRedisConnected()),
}));

vi.mock('../models/event.schema', () => ({
  Event: mockEventModel,
}));

// Intercept dynamic require calls in the production code under test
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === '../config/redis') {
    return {
      getRedis: () => mockRedis,
      isRedisConnected: () => mockRedis.isRedisConnected(),
    };
  }
  if (id === '../models/event.schema') {
    return {
      Event: mockEventModel,
    };
  }
  return originalRequire.apply(this, arguments as any);
};

afterAll(() => {
  Module.prototype.require = originalRequire;
});

vi.mock('../models/seat-layout.schema', () => ({
  SeatLayout: {
    findOne: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../utils/audit', () => ({
  auditLog: vi.fn(),
}));

describe('Socket Handlers (Public Namespace)', () => {
  let mockSocket: any;
  let handlers: Record<string, Function>;
  let socketId: string;
  const eventId = '507f1f77bcf86cd799439011';
  const seatIds = ['A1'];
  const sessionId = '123e4567-e89b-12d3-a456-426614174000';
  const validLockPayload = { eventId, seatIds, sessionId };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockRedis.get.mockReset();
    mockRedis.set.mockReset();
    mockRedis.del.mockReset();
    mockRedis.expire.mockReset();
    mockRedis.isRedisConnected.mockReset();
    mockEventModel.exists.mockReset();
    
    // Default behaviors
    mockRedis.isRedisConnected.mockReturnValue(true);

    handlers = {};
    socketId = `socket-${Math.random().toString(36).slice(2)}`;

    mockSocket = {
      id: socketId,
      data: {
        sessionId: sessionId,
        lockedSeats: new Set<string>(),
      },
      on: vi.fn((event, handler) => {
        handlers[event] = handler;
      }),
      emit: vi.fn(),
      to: vi.fn().mockReturnThis(),
      join: vi.fn(),
      leave: vi.fn(),
    };
  });

  it('should register expected events', () => {
    registerSocketHandlers(mockSocket);
    expect(mockSocket.on).toHaveBeenCalledWith('event:join', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('event:leave', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('seat:lock', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('seat:unlock', expect.any(Function));
  });

  describe('event:join', () => {
    it('should reject join if payload format is invalid', async () => {
      registerSocketHandlers(mockSocket);
      const joinHandler = handlers['event:join'];

      await joinHandler({}); // empty payload

      expect(mockSocket.emit).toHaveBeenCalledWith('event:join:status', {
        success: false,
        message: 'Invalid payload format',
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'BAD_REQUEST',
        message: 'Invalid payload format',
      });
    });

    it('should reject join if event does not exist in database', async () => {
      registerSocketHandlers(mockSocket);
      const joinHandler = handlers['event:join'];

      mockEventModel.exists.mockResolvedValue(null);

      await joinHandler({ eventId });

      await vi.waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('event:join:status', {
          success: false,
          eventId,
          message: 'Event not found',
        });
        expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
          action: 'EVENT_ROOM_JOIN_FAILED',
          status: 'failure',
        }));
      });
    });

    it('should successfully join event room if event exists', async () => {
      registerSocketHandlers(mockSocket);
      const joinHandler = handlers['event:join'];

      mockEventModel.exists.mockResolvedValue({ _id: eventId });

      await joinHandler({ eventId });

      await vi.waitFor(() => {
        expect(mockSocket.join).toHaveBeenCalledWith(`event:${eventId}`);
        expect(mockSocket.emit).toHaveBeenCalledWith('event:join:status', {
          success: true,
          eventId,
        });
        expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
          action: 'EVENT_ROOM_JOINED',
          status: 'success',
        }));
      });
    });

    it('should handle database errors gracefully', async () => {
      registerSocketHandlers(mockSocket);
      const joinHandler = handlers['event:join'];

      mockEventModel.exists.mockRejectedValue(new Error('DB Connection Error'));

      await joinHandler({ eventId });

      await vi.waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('event:join:status', {
          success: false,
          eventId,
          message: 'Internal server error',
        });
        expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
          action: 'EVENT_ROOM_JOIN_FAILED',
          status: 'failure',
        }));
      });
    });
  });

  describe('event:leave', () => {
    it('should leave event room for valid eventId', () => {
      registerSocketHandlers(mockSocket);
      const leaveHandler = handlers['event:leave'];

      leaveHandler({ eventId });

      expect(mockSocket.leave).toHaveBeenCalledWith(`event:${eventId}`);
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'EVENT_ROOM_LEFT',
        status: 'success',
      }));
    });

    it('should ignore leaving event room for invalid eventId format', () => {
      registerSocketHandlers(mockSocket);
      const leaveHandler = handlers['event:leave'];

      leaveHandler({ eventId: 'invalid-id' });

      expect(mockSocket.leave).not.toHaveBeenCalled();
    });
  });

  describe('seat:lock', () => {
    it('should reject lock if payload format is invalid', async () => {
      registerSocketHandlers(mockSocket);
      const lockHandler = handlers['seat:lock'];

      await lockHandler({});

      expect(mockSocket.emit).toHaveBeenCalledWith('seat:lock:status', {
        success: false,
        message: 'Invalid payload format',
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'BAD_REQUEST',
        message: 'Invalid payload format',
      });
    });

    it('should successfully acquire lock in Redis if seats are available', async () => {
      registerSocketHandlers(mockSocket);
      const lockHandler = handlers['seat:lock'];

      // Mock DB: verifySeatsAvailable check
      vi.mocked(SeatLayout.findOne).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          seats: [{ seatId: 'A1', status: 'available' }],
        }),
      } as any);

      // Mock Redis: no lock exists, sets lock successfully
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      await lockHandler(validLockPayload);

      await vi.waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('seat:lock:status', {
          success: true,
          seatIds: ['A1'],
        });
        expect(mockSocket.to).toHaveBeenCalledWith(`event:${eventId}`);
        expect(mockSocket.data.lockedSeats.has(`${eventId}:A1`)).toBe(true);
        expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
          action: 'SEAT_LOCK_ACQUIRED',
          status: 'success',
        }));
      });
    });

    it('should refresh lock if already locked by the same session', async () => {
      registerSocketHandlers(mockSocket);
      const lockHandler = handlers['seat:lock'];

      vi.mocked(SeatLayout.findOne).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          seats: [{ seatId: 'A1', status: 'available' }],
        }),
      } as any);

      // Mock Redis: lock already owned by this session
      mockRedis.get.mockResolvedValue(sessionId);

      await lockHandler(validLockPayload);

      await vi.waitFor(() => {
        expect(mockRedis.expire).toHaveBeenCalledWith(`mad:lock:event:${eventId}:seat:A1`, 600);
        expect(mockSocket.emit).toHaveBeenCalledWith('seat:lock:status', {
          success: true,
          seatIds: ['A1'],
        });
      });
    });

    it('should fail to lock if seat is already locked in Redis by another session', async () => {
      registerSocketHandlers(mockSocket);
      const lockHandler = handlers['seat:lock'];

      vi.mocked(SeatLayout.findOne).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          seats: [{ seatId: 'A1', status: 'available' }],
        }),
      } as any);

      // Mock Redis: lock already owned by another session
      mockRedis.get.mockResolvedValue('another-session-uuid');

      await lockHandler(validLockPayload);

      await vi.waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('seat:lock:status', {
          success: false,
          seatIds: ['A1'],
          message: 'Some seats are already locked or booked',
        });
        expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
          action: 'SEAT_LOCK_REJECTED',
          status: 'failure',
        }));
      });
    });

    it('should fail to lock if seats are not AVAILABLE in database', async () => {
      registerSocketHandlers(mockSocket);
      const lockHandler = handlers['seat:lock'];

      // Mock DB: seat is BOOKED
      vi.mocked(SeatLayout.findOne).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          seats: [{ seatId: 'A1', status: 'booked' }],
        }),
      } as any);

      await lockHandler(validLockPayload);

      await vi.waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('seat:lock:status', {
          success: false,
          seatIds: ['A1'],
          message: 'Some seats are already locked or booked',
        });
      });
    });

    it('should fall back to database validation if Redis is disconnected', async () => {
      registerSocketHandlers(mockSocket);
      const lockHandler = handlers['seat:lock'];

      mockRedis.isRedisConnected.mockReturnValue(false);

      vi.mocked(SeatLayout.findOne).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          seats: [{ seatId: 'A1', status: 'available' }],
        }),
      } as any);

      await lockHandler(validLockPayload);

      await vi.waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('seat:lock:status', {
          success: true,
          seatIds: ['A1'],
        });
        expect(mockRedis.get).not.toHaveBeenCalled(); // Redis not used
      });
    });
  });

  describe('seat:unlock', () => {
    it('should reject unlock if payload format is invalid', async () => {
      registerSocketHandlers(mockSocket);
      const unlockHandler = handlers['seat:unlock'];

      await unlockHandler({});

      expect(mockSocket.emit).toHaveBeenCalledWith('seat:unlock:status', {
        success: false,
        message: 'Invalid payload format',
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'BAD_REQUEST',
        message: 'Invalid payload format',
      });
    });

    it('should successfully unlock in Redis and emit unlock status', async () => {
      registerSocketHandlers(mockSocket);
      const unlockHandler = handlers['seat:unlock'];

      // Setup socket to have A1 locked
      mockSocket.data.lockedSeats.add(`${eventId}:A1`);

      // Mock Redis: lock is owned by this session, deletes lock successfully
      mockRedis.get.mockResolvedValue(sessionId);

      await unlockHandler(validLockPayload);

      await vi.waitFor(() => {
        expect(mockRedis.del).toHaveBeenCalledWith(`mad:lock:event:${eventId}:seat:A1`);
        expect(mockSocket.data.lockedSeats.has(`${eventId}:A1`)).toBe(false);
        expect(mockSocket.emit).toHaveBeenCalledWith('seat:unlock:status', {
          success: true,
          seatIds: ['A1'],
        });
        expect(mockSocket.to).toHaveBeenCalledWith(`event:${eventId}`);
        expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
          action: 'SEAT_LOCK_RELEASED',
          status: 'success',
        }));
      });
    });

    it('should skip redis delete if lock is owned by another session', async () => {
      registerSocketHandlers(mockSocket);
      const unlockHandler = handlers['seat:unlock'];

      mockSocket.data.lockedSeats.add(`${eventId}:A1`);

      // Mock Redis: owned by another session
      mockRedis.get.mockResolvedValue('another-session-uuid');

      await unlockHandler(validLockPayload);

      await vi.waitFor(() => {
        expect(mockRedis.del).not.toHaveBeenCalled();
        expect(mockSocket.data.lockedSeats.has(`${eventId}:A1`)).toBe(true); // remains locked locally
      });
    });

    it('should fall back to degraded mode unlock (not calling Redis) if Redis disconnected', async () => {
      registerSocketHandlers(mockSocket);
      const unlockHandler = handlers['seat:unlock'];

      mockSocket.data.lockedSeats.add(`${eventId}:A1`);

      mockRedis.isRedisConnected.mockReturnValue(false);

      await unlockHandler(validLockPayload);

      await vi.waitFor(() => {
        expect(mockSocket.data.lockedSeats.has(`${eventId}:A1`)).toBe(false); // cleared locally anyway
        expect(mockSocket.emit).toHaveBeenCalledWith('seat:unlock:status', {
          success: true,
          seatIds: ['A1'],
        });
        expect(mockRedis.get).not.toHaveBeenCalled();
      });
    });
  });

  describe('session mismatch rejection', () => {
    it('should reject seat:lock if session ID mismatch occurs', async () => {
      registerSocketHandlers(mockSocket);
      const lockHandler = handlers['seat:lock'];

      mockSocket.data.sessionId = '123e4567-e89b-12d3-a456-426614174000';

      const payload = {
        eventId: '507f1f77bcf86cd799439011',
        seatIds: ['A1'],
        sessionId: '987f6543-e21b-12d3-a456-426614174999', // mismatch
      };

      await lockHandler(payload);

      expect(mockSocket.emit).toHaveBeenCalledWith('seat:lock:status', {
        success: false,
        seatIds: ['A1'],
        message: 'Unauthorized session',
      });
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SEAT_LOCK_REJECTED',
        status: 'failure',
        metadata: expect.objectContaining({ reason: 'Unauthorized session' }),
      }));
    });

    it('should reject seat:unlock if session ID mismatch occurs', async () => {
      registerSocketHandlers(mockSocket);
      const unlockHandler = handlers['seat:unlock'];

      mockSocket.data.sessionId = '123e4567-e89b-12d3-a456-426614174000';

      const payload = {
        eventId: '507f1f77bcf86cd799439011',
        seatIds: ['A1'],
        sessionId: '987f6543-e21b-12d3-a456-426614174999', // mismatch
      };

      await unlockHandler(payload);

      expect(mockSocket.emit).toHaveBeenCalledWith('seat:unlock:status', {
        success: false,
        seatIds: ['A1'],
        message: 'Unauthorized session',
      });
      expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SEAT_UNLOCK_REJECTED',
        status: 'failure',
        metadata: expect.objectContaining({ reason: 'Unauthorized session' }),
      }));
    });
  });

  describe('socket rate limiting', () => {
    it('should rate limit event:join after 20 attempts', async () => {
      mockSocket.id = 'rate-limit-socket-join';
      registerSocketHandlers(mockSocket);
      const joinHandler = handlers['event:join'];

      mockEventModel.exists.mockResolvedValue({ _id: eventId });

      for (let i = 0; i < 20; i++) {
        await joinHandler({ eventId });
      }

      expect(mockSocket.emit).not.toHaveBeenCalledWith('event:join:status', expect.objectContaining({ message: 'Rate limit exceeded' }));

      await joinHandler({ eventId });

      expect(mockSocket.emit).toHaveBeenCalledWith('event:join:status', {
        success: false,
        eventId,
        message: 'Rate limit exceeded',
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded',
      });
    });

    it('should rate limit seat:lock after 30 attempts', async () => {
      mockSocket.id = 'rate-limit-socket-lock';
      registerSocketHandlers(mockSocket);
      const lockHandler = handlers['seat:lock'];

      vi.mocked(SeatLayout.findOne).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          seats: [{ seatId: 'A1', status: 'available' }],
        }),
      } as any);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      for (let i = 0; i < 30; i++) {
        await lockHandler(validLockPayload);
      }

      expect(mockSocket.emit).not.toHaveBeenCalledWith('seat:lock:status', expect.objectContaining({ message: 'Rate limit exceeded for seat locking' }));

      await lockHandler(validLockPayload);

      expect(mockSocket.emit).toHaveBeenCalledWith('seat:lock:status', {
        success: false,
        seatIds: [],
        message: 'Rate limit exceeded',
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded for seat locking',
      });
    });

    it('should rate limit seat:unlock after 30 attempts', async () => {
      mockSocket.id = 'rate-limit-socket-unlock';
      registerSocketHandlers(mockSocket);
      const unlockHandler = handlers['seat:unlock'];

      mockRedis.get.mockResolvedValue(sessionId);

      for (let i = 0; i < 30; i++) {
        await unlockHandler(validLockPayload);
      }

      expect(mockSocket.emit).not.toHaveBeenCalledWith('seat:unlock:status', expect.objectContaining({ message: 'Rate limit exceeded for seat unlocking' }));

      await unlockHandler(validLockPayload);

      expect(mockSocket.emit).toHaveBeenCalledWith('seat:unlock:status', {
        success: false,
        seatIds: [],
        message: 'Rate limit exceeded',
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded for seat unlocking',
      });
    });
  });
});
