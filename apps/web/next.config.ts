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
    NEXT_PUBLIC_APP_NAME: 'MAD Entertrainment',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // ─── Headers ──────────────────────────────────────────────
  async headers() {
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
