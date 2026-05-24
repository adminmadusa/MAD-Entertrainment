import 'dotenv/config';
import { validateEnv, getEnv } from './config/env';

// Validate env variables first
validateEnv();

import http from 'http';

import { createApp } from './app';
import { initCloudinary } from './config/cloudinary';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initRazorpay } from './config/razorpay';
import { getRedis, waitForRedisReady, disconnectRedis } from './config/redis';
import { initializeSentry } from './instrument';
initializeSentry();

import { initSocketIO, getIO } from './config/socket';
import { initStripe } from './config/stripe';
import { logger } from './utils/logger';
import { startConsistencyWorker, stopConsistencyWorker } from './workers/consistency.worker';
import { startAllWorkers, stopAllWorkers } from './workers';
import { seedAdmin } from './utils/seed-admin';

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
  
  // Connect Redis and await connection readiness
  try {
    getRedis();
    await waitForRedisReady();
  } catch (err) {
    logger.warn({ err }, 'Redis connection failed during bootstrap. Starting in degraded mode.');
  }
  
  initCloudinary();
  initRazorpay();
  initStripe();

  // ─── Create HTTP Server ────────────────────────────────────
  const app = createApp();
  const httpServer = http.createServer(app);

  // ─── Initialize Socket.IO ──────────────────────────────────
  initSocketIO(httpServer);
  startConsistencyWorker();
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

    httpServer.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        getIO().close();
        logger.info('Socket.IO connections closed');
      } catch (err) {
        // Socket may not be fully initialized or already closed
      }

      stopConsistencyWorker();
      await stopAllWorkers();
      await disconnectDatabase();
      await disconnectRedis();
      logger.info('✅ Graceful shutdown complete');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('⚠️  Forceful shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

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
