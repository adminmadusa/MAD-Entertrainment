import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/redis', () => ({
  isRedisConnected: vi.fn(),
}));

vi.mock('../utils/email', () => ({
  isTransporterVerified: vi.fn(),
  verifyTransporter: vi.fn(),
}));

vi.mock('../utils/audit', () => ({
  auditLog: vi.fn(),
}));

import { isRedisConnected } from '../config/redis';
import { auditLog } from '../utils/audit';
import { isTransporterVerified, verifyTransporter } from '../utils/email';
import healthRoutes from './health.routes';

function getGetHandler(): (req: any, res: any) => void {
  const layer = healthRoutes.stack.find(
    (item: any) => item.route?.path === '/' && item.route?.methods?.get
  );
  if (!layer) throw new Error('GET / route not found in health router stack');
  return layer.route.stack[0].handle;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('Health Routes — GET /api/health', () => {
  const handler = getGetHandler();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with status healthy when mongo, redis, and email are ready', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
    vi.mocked(isRedisConnected).mockReturnValue(true);
    vi.mocked(isTransporterVerified).mockReturnValue(true);

    const res = createMockRes();
    await handler({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: 'healthy',
      database: 'up',
      redis: 'up',
      email: 'up',
    });
    expect(res.body.timestamp).toBeDefined();

    // Verify side-effect freedom: verifyTransporter and auditLog must NEVER be called
    expect(verifyTransporter).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('returns 200 with status degraded when email is down but mongo and redis are up', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
    vi.mocked(isRedisConnected).mockReturnValue(true);
    vi.mocked(isTransporterVerified).mockReturnValue(false);

    const res = createMockRes();
    await handler({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: 'degraded',
      database: 'up',
      redis: 'up',
      email: 'down',
    });
    expect(verifyTransporter).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('returns 503 with status unhealthy when MongoDB is disconnected', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);
    vi.mocked(isRedisConnected).mockReturnValue(true);
    vi.mocked(isTransporterVerified).mockReturnValue(true);

    const res = createMockRes();
    await handler({}, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({
      status: 'unhealthy',
      database: 'down',
      redis: 'up',
    });
    expect(verifyTransporter).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('returns 503 with status unhealthy when Redis is disconnected', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
    vi.mocked(isRedisConnected).mockReturnValue(false);
    vi.mocked(isTransporterVerified).mockReturnValue(true);

    const res = createMockRes();
    await handler({}, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({
      status: 'unhealthy',
      database: 'up',
      redis: 'down',
    });
    expect(verifyTransporter).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });
});
