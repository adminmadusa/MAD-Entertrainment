import { Router } from 'express';

import { isRedisConnected } from '../config/redis';

const router: Router = Router();

import mongoose from 'mongoose';

router.get('/', (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  const dbStatus = mongoState === 1 ? 'connected' : 'disconnected';
  
  res.json({
    success: true,
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    redisConnected: isRedisConnected(),
    mongoConnected: dbStatus === 'connected',
    mongoConnectionState: mongoState,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
});

export default router;
