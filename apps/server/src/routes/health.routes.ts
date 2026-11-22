import { Router } from 'express';
import mongoose from 'mongoose';

import { isRedisConnected } from '../config/redis';
import { isTransporterVerified } from '../utils/email';

const router: Router = Router();

router.get('/', (_req, res) => {
  const isMongoUp = mongoose.connection.readyState === 1;
  const isRedisUp = isRedisConnected();
  const isEmailUp = isTransporterVerified();

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
