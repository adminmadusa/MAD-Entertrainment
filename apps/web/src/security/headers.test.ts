import { describe, it, expect, vi, beforeEach } from 'vitest';
import nextConfig from '../../next.config';

describe('Web Next.js Security Headers & CSP Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports base security headers for all routes in any environment', async () => {
    if (typeof nextConfig.headers !== 'function') {
      throw new Error('nextConfig.headers is not defined');
    }

    const headerConfigs = await nextConfig.headers();
    const globalHeaderConfig = headerConfigs.find((h: any) => h.source === '/(.*)');

    expect(globalHeaderConfig).toBeDefined();
    const headerMap = new Map(globalHeaderConfig?.headers.map((h: any) => [h.key, h.value]));

    // Critical clickjacking protection
    expect(headerMap.get('X-Frame-Options')).toBe('DENY');

    // MIME sniffing protection
    expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff');

    // Referrer policy
    expect(headerMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

    // Permissions policy restricts sensitive hardware
    const permissionsPolicy = headerMap.get('Permissions-Policy');
    expect(permissionsPolicy).toBeDefined();
    expect(permissionsPolicy).toContain('microphone=()');
    expect(permissionsPolicy).toContain('geolocation=(self)');
  });

  it('includes strict Content-Security-Policy and HSTS in production mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      if (typeof nextConfig.headers !== 'function') {
        throw new Error('nextConfig.headers is not defined');
      }

      const headerConfigs = await nextConfig.headers();
      const globalHeaderConfig = headerConfigs.find((h: any) => h.source === '/(.*)');
      const headerMap = new Map(globalHeaderConfig?.headers.map((h: any) => [h.key, h.value]));

      // HSTS 1-year with includeSubDomains
      const hsts = headerMap.get('Strict-Transport-Security');
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');

      // CSP Directives Verification
      const csp = headerMap.get('Content-Security-Policy');
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("https://res.cloudinary.com");
      expect(csp).toContain("https://accounts.google.com");
      expect(csp).toContain("https://api.razorpay.com");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
