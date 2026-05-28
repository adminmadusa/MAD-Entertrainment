/**
 * sentry.server.config.ts
 *
 * Initializes Sentry error tracking for Next.js server-side code (RSC,
 * API routes, server actions, middleware).
 * This file is automatically loaded by @sentry/nextjs.
 *
 * Sentry is silently disabled when NEXT_PUBLIC_SENTRY_DSN is not set.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.05,
  });
}
