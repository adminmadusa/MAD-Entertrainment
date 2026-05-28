import mongoose from "mongoose";
import { Router } from "express";

import { isRedisConnected } from "../config/redis";
import { getEnv } from "../config/env";

const router: Router = Router();

/**
 * GET /api/health
 *
 * Probes MongoDB and Redis connectivity and returns a structured health
 * report. Used by Render (healthCheckPath) to determine whether an instance
 * is ready to receive traffic.
 *
 * Response codes:
 *   200 OK       — all required services are reachable
 *   503 Service Unavailable — one or more required services are degraded
 *
 * The `redis` field reflects an optional service: its absence degrades
 * rate-limiting to per-instance in-memory mode but does not block bookings.
 * MongoDB unavailability is treated as a hard failure.
 */
router.get("/", (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = isRedisConnected();

  // MongoDB is required; Redis is optional but reported for transparency.
  const isHealthy = mongoOk;

  const env = getEnv();

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    services: {
      mongo: mongoOk ? "ok" : "down",
      redis: redisOk ? "ok" : "unavailable",
    },
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version ?? "unknown",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

export default router;
