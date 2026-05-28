/**
 * sentry.client.config.ts
 *
 * Initializes Sentry error tracking in the browser.
 * This file is automatically loaded by @sentry/nextjs for client-side code.
 *
 * Sentry is silently disabled when NEXT_PUBLIC_SENTRY_DSN is not set, so
 * local development without a DSN works without any changes.
 *
 * Sampling is intentionally low (5%) to stay within free-tier quotas.
 * Raise tracesSampleRate toward 1.0 only if you need full trace coverage.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",

    // 5% of transactions are traced — sufficient for performance insight
    // without exhausting Sentry quota.
    tracesSampleRate: 0.05,

    // Do not capture replays by default — enable if you need session recording.
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,

    // Silence noisy browser extensions and third-party script errors.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
    ],
  });
}
