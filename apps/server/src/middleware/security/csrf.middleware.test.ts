import { Request, Response, NextFunction } from 'express';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { csrfProtection } from './csrf.middleware';

const mockNext = vi.fn() as unknown as NextFunction;

const buildReq = (
  cookieToken?: string,
  headerToken?: string,
  method = 'POST'
): Partial<Request> => ({
  method,
  cookies: cookieToken !== undefined ? { 'XSRF-TOKEN': cookieToken } : {},
  headers: headerToken !== undefined ? { 'x-xsrf-token': headerToken } : {},
});

const buildRes = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('csrfProtection middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Positive Cases ──────────────────────────────────────────────────────

  it('passes when cookie and header tokens match', () => {
    const token = 'valid-csrf-token-abc123';
    const req = buildReq(token, token);
    const res = buildRes();

    csrfProtection(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes safe methods (GET) without requiring CSRF tokens', () => {
    const req = buildReq(undefined, undefined, 'GET');
    const res = buildRes();

    csrfProtection(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('passes safe methods (HEAD) without requiring CSRF tokens', () => {
    const req = buildReq(undefined, undefined, 'HEAD');
    const res = buildRes();

    csrfProtection(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('accepts x-csrf-token header as an alias for x-xsrf-token', () => {
    const token = 'csrf-alias-token';
    const req = { ...buildReq(token, undefined), headers: { 'x-csrf-token': token } } as Partial<Request>;
    const res = buildRes();

    csrfProtection(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  // ── Negative Cases ──────────────────────────────────────────────────────

  it('returns 403 with CSRF_TOKEN_INVALID when header is missing', () => {
    const req = buildReq('valid-token', undefined);
    const res = buildRes();

    csrfProtection(req as Request, res as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'CSRF_TOKEN_INVALID' }),
    }));
  });

  it('returns 403 when cookie is missing', () => {
    const req = buildReq(undefined, 'some-header-token');
    const res = buildRes();

    csrfProtection(req as Request, res as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when tokens do not match', () => {
    const req = buildReq('cookie-token', 'different-header-token');
    const res = buildRes();

    csrfProtection(req as Request, res as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when cookie is empty string', () => {
    const req = buildReq('', 'some-token');
    const res = buildRes();

    csrfProtection(req as Request, res as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when tampered token (partial match)', () => {
    const req = buildReq('valid-token', 'valid-token-tampered');
    const res = buildRes();

    csrfProtection(req as Request, res as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
