import { execSync } from 'child_process';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ─── Stable Build ID (prevents stale chunk mismatches) ─────
  generateBuildId: async () => {
    try {
      // Use git commit hash for stable, deterministic chunk IDs
      return execSync('git rev-parse HEAD').toString().trim();
    } catch {
      // Fallback if not in a git repo (e.g. Docker build with no .git)
      return `build-${Date.now()}`;
    }
  },

  // ─── Image Optimization ────────────────────────────────────
  images: {
    loader: 'custom',
    loaderFile: './src/utils/image-loader.ts',
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
    NEXT_PUBLIC_APP_NAME: 'MAD Entertainments',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // ─── Headers ──────────────────────────────────────────────
  async headers() {
    // ── Content Security Policy (SEC-001) ──────────────────
    //
    // NOTE: CSP and HSTS headers are applied in PRODUCTION only.
    // Next.js dev mode (next dev) requires 'unsafe-eval' for HMR and
    // React Refresh source maps. Applying a strict CSP in dev mode
    // blocks all client-side JS execution. The policy is identical
    // to what ships to production — only the delivery is gated.
    //
    // script-src:
    //   'self'              — Next.js page bundles and API routes
    //   'unsafe-inline'     — Required: Next.js framework hydration scripts are
    //                         injected as inline <script> elements. Nonce-based
    //                         approach requires middleware and is deferred to a
    //                         future hardening PR.
    //                         JSON-LD <script type="application/ld+json"> blocks
    //                         are data blocks (non-JS MIME), exempt from
    //                         script-src per CSP Level 3 spec — 'unsafe-inline'
    //                         here does not grant them additional trust.
    //   accounts.google.com — Google Identity Services SDK
    //   checkout.razorpay.com — Razorpay checkout SDK
    //
    // style-src:
    //   'self'              — Tailwind CSS bundled stylesheet
    //   'unsafe-inline'     — Required: 28 React style={{}} prop usages across
    //                         the app (including global-error.tsx which operates
    //                         outside the Tailwind class system by design)
    //
    // font-src:
    //   'self'              — next/font/google self-hosts fonts at build time;
    //                         no runtime request to fonts.googleapis.com
    //
    // img-src:
    //   'self'              — local public assets
    //   data:               — Next.js image optimisation internals
    //   blob:               — Next.js image optimisation internals
    //   res.cloudinary.com  — event/DJ image CDN
    //   images.unsplash.com — supplemental imagery
    //
    // connect-src:
    //   'self'              — /api/* proxy to backend (same origin)
    //   accounts.google.com — Google Identity token exchange
    //   api.razorpay.com    — Razorpay payment API
    //
    // frame-src:
    //   api.razorpay.com    — Razorpay checkout iframe
    //   accounts.google.com — Google Sign-In iframe
    //
    // object-src 'none'     — Disallows plugins (Flash, Java applets)
    // base-uri 'self'       — Prevents base tag injection attacks
    // form-action 'self'    — Prevents form hijacking
    const isDev = process.env.NODE_ENV === 'development';
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com https://checkout.razorpay.com https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com",
      "connect-src 'self' https://accounts.google.com https://api.razorpay.com https://api.stripe.com",
      "frame-src https://api.razorpay.com https://accounts.google.com https://js.stripe.com",
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
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          // SEC-001 — Content Security Policy (production only)
          // Omitted in dev: Next.js HMR requires 'unsafe-eval' which conflicts
          // with this policy. Production builds are pre-compiled and do not use eval.
          ...(!isDev
            ? [
                { key: 'Content-Security-Policy', value: csp },
                // SEC-002 — Strict Transport Security
                // max-age=31536000 (1 year), includeSubDomains enforces HTTPS on all subdomains.
                // preload is intentionally omitted — HSTS Preload List submission requires
                // explicit decision and is irreversible without browser vendor action.
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]
            : []),
        ],
      },
      {
        source: '/site.webmanifest',
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
        source: '/legal',
        destination: '/legal/privacy',
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

export default nextConfig;
