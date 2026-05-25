import { Router } from 'express';

import { isRedisConnected } from '../config/redis';

const router: Router = Router();

import mongoose from 'mongoose';

router.get('/', (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  const status = mongoState === 1 ? 'ok' : 'degraded';
  
  res.json({
    status,
    timestamp: new Date().toISOString(),
  });
});

export default router;
