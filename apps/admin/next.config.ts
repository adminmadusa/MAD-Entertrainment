import { execSync } from 'child_process';

import withPWAInit from '@ducanh2912/next-pwa';
import type { NextConfig } from 'next';

const cacheVersion = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return String(Date.now());
  }
})();

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  // Do NOT extend default runtime caching — we define all routes explicitly
  // to avoid duplicate route conflicts that cause no-response errors.
  extendDefaultRuntimeCaching: false,
  fallbacks: {
    // When a page navigation fails (network error, stale chunk, offline),
    // serve the cached app shell at "/" instead of throwing no-response.
    document: '/',
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // ── API calls: never cache, always network ──────────────────────────
      {
        urlPattern: /^\/api\/.*/i,
        handler: 'NetworkOnly',
        method: 'GET',
        options: { cacheName: 'api-get' },
      },
      {
        urlPattern: /^\/api\/.*/i,
        handler: 'NetworkOnly',
        method: 'POST',
        options: { cacheName: 'api-post' },
      },
      {
        urlPattern: /^\/api\/.*/i,
        handler: 'NetworkOnly',
        method: 'PUT',
        options: { cacheName: 'api-put' },
      },
      {
        urlPattern: /^\/api\/.*/i,
        handler: 'NetworkOnly',
        method: 'DELETE',
        options: { cacheName: 'api-delete' },
      },
      // ── Next.js RSC prefetch requests ────────────────────────────────────
      {
        urlPattern: ({ request, url, sameOrigin }: { request: Request; url: URL; sameOrigin: boolean }) =>
          request.headers.get('RSC') === '1' &&
          request.headers.get('Next-Router-Prefetch') === '1' &&
          sameOrigin &&
          !url.pathname.startsWith('/api/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages-rsc-prefetch',
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
      // ── Next.js RSC navigation requests ─────────────────────────────────
      {
        urlPattern: ({ request, url, sameOrigin }: { request: Request; url: URL; sameOrigin: boolean }) =>
          request.headers.get('RSC') === '1' &&
          sameOrigin &&
          !url.pathname.startsWith('/api/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages-rsc',
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
      // ── HTML page navigations ─────────────────────────────────────────────
      // networkTimeoutSeconds: 10 means if network doesn't respond in 10s,
      // fall back to cache. Combined with fallbacks.document above, this
      // prevents the no-response throw on navigation failures.
      {
        urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
          sameOrigin && !url.pathname.startsWith('/api/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
      // ── Next.js static JS chunks ──────────────────────────────────────────
      {
        urlPattern: /\/_next\/static.+\.js$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static-js',
          expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
      // ── Next.js image optimisation ────────────────────────────────────────
      {
        urlPattern: /\/_next\/image\?url=.+$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'next-image',
          expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
      // ── Next.js data routes ───────────────────────────────────────────────
      {
        urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'next-data',
          expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
      // ── Google Fonts stylesheets ──────────────────────────────────────────
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'google-fonts-stylesheets',
          expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
      // ── Google Fonts web font files ───────────────────────────────────────
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-webfonts',
          expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
      // ── Static images ─────────────────────────────────────────────────────
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-images',
          expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      // ── Static fonts ──────────────────────────────────────────────────────
      {
        urlPattern: /\.(?:eot|otf|ttf|woff|woff2)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-fonts',
          expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
      // ── Static CSS ────────────────────────────────────────────────────────
      {
        urlPattern: /\.(?:css|less)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-styles',
          expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
    ],
  },
});

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
        source: '/:path(sw.js|workbox-.*.js|swe-worker-.*.js|manifest.json)',
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
        // Proxy to the actual backend if NEXT_PUBLIC_API_URL is configured, else fallback to local
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/:path*`,
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

export default withPWA(nextConfig);
