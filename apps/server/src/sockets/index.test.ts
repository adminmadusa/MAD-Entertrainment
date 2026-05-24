import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSocketHandlers } from './index';

// Mock dependencies
vi.mock('../config/redis', () => ({
  getRedis: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
  })),
  isRedisConnected: vi.fn(() => true),
}));

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

// Provide a mock for `require('../config/redis')` within the socket handler
vi.mock('module', async (importOriginal) => {
  const actual = await importOriginal();
  return actual;
});

describe('Socket Handlers (Seat Locks)', () => {
  let mockSocket: any;
  let handlers: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};

    mockSocket = {
      id: 'socket-123',
      data: {
        sessionId: 'session-xyz',
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
    expect(mockSocket.on).toHaveBeenCalledWith('seat:lock', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('seat:unlock', expect.any(Function));
  });

  describe('seat:lock', () => {
    it('should reject lock if session ID does not match', async () => {
      registerSocketHandlers(mockSocket);
      const lockHandler = handlers['seat:lock'];

      await lockHandler({ eventId: 'evt-1', seatIds: ['A1'], sessionId: 'wrong-session' });

      expect(mockSocket.emit).toHaveBeenCalledWith('seat:lock:status', {
        success: false,
        seatIds: ['A1'],
        message: 'Unauthorized session'
      });
    });
  });

  describe('seat:unlock', () => {
    it('should reject unlock if session ID does not match', async () => {
      registerSocketHandlers(mockSocket);
      const unlockHandler = handlers['seat:unlock'];

      await unlockHandler({ eventId: 'evt-1', seatIds: ['A1'], sessionId: 'wrong-session' });

      expect(mockSocket.emit).toHaveBeenCalledWith('seat:unlock:status', {
        success: false,
        seatIds: ['A1'],
        message: 'Unauthorized session'
      });
    });
  });
});
