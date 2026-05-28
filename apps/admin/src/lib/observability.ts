/**
 * observability.ts
 *
 * Initializes Sentry for the admin Next.js app via the instrumentation hook
 * (see src/instrumentation.ts).
 *
 * Sentry is silently disabled when NEXT_PUBLIC_SENTRY_DSN is not set, so
 * local and staging environments without a DSN work without any changes.
 *
 * tracesSampleRate is intentionally low (5%) to stay within free-tier quotas.
 * Raise toward 1.0 only if you need full performance trace coverage.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // 5% of transactions traced — sufficient for alerting without quota burn.
    tracesSampleRate: 0.05,
  });
}

export default Sentry;
