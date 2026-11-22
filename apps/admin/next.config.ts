import { execSync } from 'child_process';

import type { NextConfig } from 'next';

const cacheVersion = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return String(Date.now());
  }
})();

/**
 * Resolves the destination URL for Next.js API proxy rewrites.
 * Guarantees that the destination always preserves the `/api` prefix, regardless
 * of whether `NEXT_PUBLIC_API_URL` is configured with `/api`, without `/api`,
 * with trailing slashes, or omitted entirely.
 */
export function resolveApiRewriteDestination(
  rawApiUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL,
  fallback = 'http://localhost:3001/api'
): string {
  const target = (rawApiUrl && rawApiUrl.trim()) || fallback;
  const sanitizedBase = target.replace(/\/+$/, '').replace(/\/api$/, '');
  return `${sanitizedBase}/api/:path*`;
}

const nextConfig: NextConfig = {
  // ─── Stable Build ID (prevents stale chunk mismatches) ─────
  generateBuildId: async () => {
    try {
      return execSync('git rev-parse HEAD').toString().trim();
    } catch {
      return `build-${Date.now()}`;
    }
  },

  // ─── Image Optimization ────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },

  // ─── Performance ───────────────────────────────────────────
  compress: true,
  poweredByHeader: false,

  // ─── Environment Variables ─────────────────────────────────
  env: {
    NEXT_PUBLIC_APP_NAME: 'MAD Entertrainment Admin',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
    NEXT_PUBLIC_CACHE_VERSION: cacheVersion,
  },

  // ─── Headers ──────────────────────────────────────────────
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(self)',
          },
          ...(!isDev
            ? [
                { key: 'Content-Security-Policy', value: csp },
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]
            : []),
        ],
      },
      {
        source: '/:path(manifest.json)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        // Cache static assets
        source: '/(.*)\\.(ico|png|jpg|jpeg|svg|gif|webp|avif|woff2|woff|ttf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // ─── Redirects ─────────────────────────────────────────────
  async redirects() {
    return [
      {
        source: '/analytics',
        destination: '/dashboard?tab=analytics',
        permanent: true,
      },
    ];
  },

  // ─── Rewrites (API Proxy) ──────────────────────────────────
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Preserve /api prefix regardless of whether NEXT_PUBLIC_API_URL includes it
        destination: resolveApiRewriteDestination(),
      },
    ];
  },

  // ─── Webpack ───────────────────────────────────────────────
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable disk caching in dev mode to prevent ENOENT errors
      config.cache = { type: 'memory' };
    }
    // Suppress OpenTelemetry dynamic require warnings during server builds
    if (!config.ignoreWarnings) {
      config.ignoreWarnings = [];
    }
    config.ignoreWarnings.push({ module: /opentelemetry/ });
    return config;
  },

  // ─── Transpile Shared Package ──────────────────────────────
  transpilePackages: ['@mad/shared', '@mad/ui', '@mad/types', '@mad/validations'],
};

export default nextConfig;
