import { describe, it, expect, vi, beforeEach } from 'vitest';
import nextConfig, { resolveApiRewriteDestination } from '../../next.config';

interface HeaderItem {
  key: string;
  value: string;
}

interface HeaderRouteConfig {
  source: string;
  headers: HeaderItem[];
}

describe('Admin Next.js Security Headers & CSP Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports base security headers and restricts framing in all environments', async () => {
    if (typeof nextConfig.headers !== 'function') {
      throw new Error('nextConfig.headers is not defined');
    }

    const headerConfigs = (await nextConfig.headers()) as HeaderRouteConfig[];
    const globalHeaderConfig = headerConfigs.find((h) => h.source === '/(.*)');

    expect(globalHeaderConfig).toBeDefined();
    const headerMap = new Map(globalHeaderConfig?.headers.map((h) => [h.key, h.value]));

    // Critical clickjacking protection
    expect(headerMap.get('X-Frame-Options')).toBe('DENY');

    // MIME sniffing protection
    expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff');

    // Referrer policy
    expect(headerMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

    // Permissions policy allows camera for ticket scanning but blocks microphone
    const permissionsPolicy = headerMap.get('Permissions-Policy');
    expect(permissionsPolicy).toBeDefined();
    expect(permissionsPolicy).toContain('camera=(self)');
    expect(permissionsPolicy).toContain('microphone=()');
  });

  it('includes strict Admin Content-Security-Policy and HSTS in production mode', async () => {
    const envObj = process.env as Record<string, string | undefined>;
    const originalEnv = envObj.NODE_ENV;
    try {
      envObj.NODE_ENV = 'production';

      if (typeof nextConfig.headers !== 'function') {
        throw new Error('nextConfig.headers is not defined');
      }

      const headerConfigs = (await nextConfig.headers()) as HeaderRouteConfig[];
      const globalHeaderConfig = headerConfigs.find((h) => h.source === '/(.*)');
      const headerMap = new Map(globalHeaderConfig?.headers.map((h) => [h.key, h.value]));

      // HSTS 1-year
      const hsts = headerMap.get('Strict-Transport-Security');
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');

      // Admin CSP Directives Verification
      const csp = headerMap.get('Content-Security-Policy');
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("https://res.cloudinary.com");
    } finally {
      envObj.NODE_ENV = originalEnv;
    }
  });

  it('configures API proxy rewrites to preserve /api prefix', async () => {
    if (typeof nextConfig.rewrites !== 'function') {
      throw new Error('nextConfig.rewrites is not defined');
    }

    const rewriteResult = await nextConfig.rewrites();
    const rewrites = Array.isArray(rewriteResult)
      ? rewriteResult
      : (rewriteResult as { beforeFiles?: Array<{ source: string; destination: string }> }).beforeFiles ?? [];
    const apiRewrite = rewrites.find((r: { source: string }) => r.source === '/api/:path*');

    expect(apiRewrite).toBeDefined();
    expect(apiRewrite.destination).toMatch(/\/api\/:path\*$/);
  });

  describe('resolveApiRewriteDestination', () => {
    it('handles API base URL without /api prefix', () => {
      expect(resolveApiRewriteDestination('https://api.madentertainments.net')).toBe('https://api.madentertainments.net/api/:path*');
    });

    it('handles API base URL with /api prefix without duplicating', () => {
      expect(resolveApiRewriteDestination('https://api.madentertainments.net/api')).toBe('https://api.madentertainments.net/api/:path*');
    });

    it('handles API base URL with /api/ trailing slash', () => {
      expect(resolveApiRewriteDestination('https://api.madentertainments.net/api/')).toBe('https://api.madentertainments.net/api/:path*');
    });

    it('handles API base URL with trailing slash but no /api', () => {
      expect(resolveApiRewriteDestination('https://api.madentertainments.net/')).toBe('https://api.madentertainments.net/api/:path*');
    });

    it('handles localhost without /api prefix', () => {
      expect(resolveApiRewriteDestination('http://localhost:3001')).toBe('http://localhost:3001/api/:path*');
    });

    it('handles localhost with /api prefix', () => {
      expect(resolveApiRewriteDestination('http://localhost:3001/api')).toBe('http://localhost:3001/api/:path*');
    });

    it('falls back to default development URL when rawApiUrl is undefined', () => {
      expect(resolveApiRewriteDestination(undefined)).toBe('http://localhost:3001/api/:path*');
    });

    it('falls back to default development URL when rawApiUrl is empty or whitespace', () => {
      expect(resolveApiRewriteDestination('   ')).toBe('http://localhost:3001/api/:path*');
    });

    it('trims whitespace and handles custom fallback URLs', () => {
      expect(resolveApiRewriteDestination('  https://api.madentertainments.net/api   ')).toBe('https://api.madentertainments.net/api/:path*');
      expect(resolveApiRewriteDestination(undefined, 'http://127.0.0.1:5001/api')).toBe('http://127.0.0.1:5001/api/:path*');
    });
  });
});
