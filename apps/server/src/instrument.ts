import * as Sentry from '@sentry/node';

import { getEnv } from './config/env';

export function initializeSentry() {
  const env = getEnv();
  
  if (env.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: env.NODE_ENV,
  });
}
