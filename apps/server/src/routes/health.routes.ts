import { Router } from 'express';
import mongoose from 'mongoose';

import { isRedisConnected } from '../config/redis';
import { verifyTransporter } from '../utils/email';

const router: Router = Router();

let cachedEmailStatus = false;
let lastEmailCheckTime = 0;
const EMAIL_CHECK_TTL = 60 * 1000; // 1 minute

let emailVerificationPromise: Promise<boolean> | null = null;

async function checkEmailHealth(): Promise<boolean> {
  const now = Date.now();
  
  if (now - lastEmailCheckTime > EMAIL_CHECK_TTL) {
    if (!emailVerificationPromise) {
      emailVerificationPromise = verifyTransporter()
        .then((status) => {
          cachedEmailStatus = status;
          lastEmailCheckTime = Date.now();
          return status;
        })
        .finally(() => {
          emailVerificationPromise = null;
        });
    }
    return emailVerificationPromise;
  }
  
  return cachedEmailStatus;
}

router.get('/', async (_req, res) => {
  const isMongoUp = mongoose.connection.readyState === 1;
  const isRedisUp = isRedisConnected();
  const isEmailUp = await checkEmailHealth();

  const isUnhealthy = !isMongoUp || !isRedisUp;
  const isDegraded = !isUnhealthy && !isEmailUp;

  const status = isUnhealthy ? 'unhealthy' : isDegraded ? 'degraded' : 'healthy';
  const statusCode = isUnhealthy ? 503 : 200;

  res.status(statusCode).json({
    status,
    database: isMongoUp ? 'up' : 'down',
    redis: isRedisUp ? 'up' : 'down',
    email: isEmailUp ? 'up' : 'down',
    timestamp: new Date().toISOString(),
  });
});

export default router;
