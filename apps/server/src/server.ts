import { validateEnv, getEnv } from './config/env';

import 'dotenv/config';

// Validate env variables first
validateEnv();

import http from 'http';

import { createApp } from './app';
import './config/cloudinary';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initRazorpay } from './config/razorpay';
import { getRedis, waitForRedisReady, disconnectRedis } from './config/redis';
import { initRateLimiters } from './middleware/rate.middleware';
import { initializeSentry } from './instrument';
initializeSentry();

import { initSocketIO, getIO } from './config/socket';
import { initStripe } from './config/stripe';
import { logger } from './utils/logger';
import { startConsistencyWorker, stopConsistencyWorker } from './workers/consistency.worker';
import { startEventLifecycleWorker, stopEventLifecycleWorker } from './workers/event-lifecycle.worker';
import { startAllWorkers, stopAllWorkers } from './workers';
import { seedAdmin } from './utils/seed-admin';
import { seedCategoriesAndTiers } from './utils/seed-categories-tiers';

const env = getEnv();
const PORT = env.PORT;

let isBootstrapping = false;

async function bootstrap(): Promise<void> {
  if (isBootstrapping) return;
  isBootstrapping = true;

  // ─── Initialize Services ───────────────────────────────────
  await connectDatabase();

  // Seed initial admin user if needed
  await seedAdmin();

  // Seed default categories and tiers if needed
  await seedCategoriesAndTiers();

  // Connect Redis and await connection readiness
  try {
    getRedis();
    await waitForRedisReady();
  } catch (err) {
    logger.warn({ err }, 'Redis connection failed during bootstrap. Starting in degraded mode.');
  }

  // Initialize rate limiters (falls back to memory if Redis is unavailable)
  initRateLimiters();

  initRazorpay();
  initStripe();

  // Verify SMTP Transporter pool connection
  const { verifyTransporter, validateSmtpConfig } = await import('./utils/email.js');
  validateSmtpConfig();
  await verifyTransporter();

  // ─── Create HTTP Server ────────────────────────────────────
  const app = createApp();
  const httpServer = http.createServer(app);

  // ─── Initialize Socket.IO ──────────────────────────────────
  initSocketIO(httpServer);
  startConsistencyWorker();
  startEventLifecycleWorker();
  startAllWorkers();

  // ─── Start Listening ───────────────────────────────────────
  httpServer.listen(PORT, () => {
    logger.info(`🚀 MAD Entertrainment API running on http://localhost:${PORT}`);
    logger.info(`📡 WebSocket server ready on ws://localhost:${PORT}`);
    logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`);
    logger.info(`🌍 Environment: ${env.NODE_ENV}`);
  });

  // ─── Graceful Shutdown ────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`📴 Received ${signal}. Starting graceful shutdown...`);

    // Close Socket.IO FIRST so all persistent WS connections are released
    // before we ask httpServer.close() to drain. If Socket.IO is closed inside
    // the httpServer.close() callback it can never fire because Socket.IO
    // itself is what keeps the HTTP server from draining.
    try {
      getIO().close();
      logger.info('Socket.IO connections closed');
    } catch (_err) {
      // Not yet initialized or already closed — safe to ignore
    }

    httpServer.close(async () => {
      logger.info('HTTP server closed');

      stopConsistencyWorker();
      stopEventLifecycleWorker();
      await stopAllWorkers();
      await disconnectDatabase();
      await disconnectRedis();
      logger.info('✅ Graceful shutdown complete');
      process.exit(0);
    });

    // Force exit after 10 seconds. unref() ensures this timer does NOT hold
    // the event loop alive if everything else already exited cleanly.
    const forceExit = setTimeout(() => {
      logger.error('⚠️  Forceful shutdown after timeout');
      process.exit(1);
    }, 10000);
    forceExit.unref();
  };

  process.on('SIGTERM', () =>
    shutdown('SIGTERM').catch((err) => {
      logger.fatal({ err }, '❌ Unhandled error during SIGTERM shutdown');
      process.exit(1);
    })
  );
  process.on('SIGINT', () =>
    shutdown('SIGINT').catch((err) => {
      logger.fatal({ err }, '❌ Unhandled error during SIGINT shutdown');
      process.exit(1);
    })
  );

  // ─── Unhandled Rejections ─────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, '❌ Unhandled Promise Rejection');
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, '❌ Uncaught Exception');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, '❌ Failed to start server');
  process.exit(1);
});
