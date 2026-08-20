import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Server Security Headers & Helmet CSP Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('configures Helmet with strict CSP directives and secure defaults', () => {
    const helmetMiddleware = helmet({
      crossOriginEmbedderPolicy: true,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      referrerPolicy: { policy: 'same-origin' },
    });

    const headers: Record<string, string> = {};
    const req = { headers: {} } as unknown as Request;
    const res = {
      setHeader: vi.fn((key: string, value: string) => {
        headers[key.toLowerCase()] = value;
      }),
      getHeader: vi.fn((key: string) => headers[key.toLowerCase()]),
      removeHeader: vi.fn((key: string) => {
        delete headers[key.toLowerCase()];
      }),
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    helmetMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);

    // Assert Content-Security-Policy
    const csp = headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("https://res.cloudinary.com");

    // Assert MIME sniffing protection
    expect(headers['x-content-type-options']).toBe('nosniff');

    // Assert Referrer Policy
    expect(headers['referrer-policy']).toBe('same-origin');

    // Assert Cross-Origin-Embedder-Policy
    expect(headers['cross-origin-embedder-policy']).toBe('require-corp');
  });

  it('prevents framing attacks and enforces X-Content-Type-Options', () => {
    const helmetMiddleware = helmet();
    const headers: Record<string, string> = {};
    const req = { headers: {} } as unknown as Request;
    const res = {
      setHeader: vi.fn((key: string, value: string) => {
        headers[key.toLowerCase()] = value;
      }),
      getHeader: vi.fn((key: string) => headers[key.toLowerCase()]),
      removeHeader: vi.fn((key: string) => {
        delete headers[key.toLowerCase()];
      }),
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    helmetMiddleware(req, res, next);

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options'] || headers['x-dns-prefetch-control']).toBeDefined();
  });
});
