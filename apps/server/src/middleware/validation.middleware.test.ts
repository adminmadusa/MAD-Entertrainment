import { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('../config/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'production',
    LOG_LEVEL: 'silent',
  })),
}));

import { validate } from './validation.middleware';

describe('validation middleware', () => {
  it('uses parsed output for valid body sanitization', async () => {
    const req = {
      body: {
        email: ' USER@Example.COM ',
        ignored: 'drop-me',
      },
      query: {},
      params: {},
    } as Request;
    const next = vi.fn();

    await validate(
      z.object({
        body: z.object({
          email: z.string().trim().toLowerCase(),
        }),
      })
    )(req, {} as Response, next);

    expect(req.body).toEqual({ email: 'user@example.com' });
    expect(next).toHaveBeenCalledWith();
  });

  it('uses parsed output for valid query sanitization', async () => {
    const req = {
      body: {},
      query: {
        page: '2',
        ignored: 'drop-me',
      },
      params: {},
    } as unknown as Request;
    const next = vi.fn();

    await validate(
      z.object({
        query: z.object({
          page: z.coerce.number().int().positive(),
        }),
      })
    )(req, {} as Response, next);

    expect(req.query).toEqual({ page: 2 });
    expect(next).toHaveBeenCalledWith();
  });

  it('uses parsed output for valid param sanitization', async () => {
    const req = {
      body: {},
      query: {},
      params: {
        id: ' abc123 ',
        ignored: 'drop-me',
      },
    } as unknown as Request;
    const next = vi.fn();

    await validate(
      z.object({
        params: z.object({
          id: z.string().trim().toUpperCase(),
        }),
      })
    )(req, {} as Response, next);

    expect(req.params).toEqual({ id: 'ABC123' });
    expect(next).toHaveBeenCalledWith();
  });

  it('preserves existing validation failure behavior', async () => {
    const req = {
      body: {
        email: 'not-an-email',
        ignored: 'unchanged-on-failure',
      },
      query: {},
      params: {},
    } as Request;
    const next = vi.fn();

    await validate(
      z.object({
        body: z.object({
          email: z.string().email('Invalid email address'),
        }),
      })
    )(req, {} as Response, next);

    expect(req.body).toEqual({
      email: 'not-an-email',
      ignored: 'unchanged-on-failure',
    });
    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.message).toBe('body.email: Invalid email address');
    expect(error.statusCode).toBe(400);
  });
});
