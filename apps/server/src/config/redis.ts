import Redis from "ioredis";

import { logger } from "../utils/logger";
import { getEnv } from "./env";

let redisClient: Redis | undefined;

export function getRedis(): Redis {
  if (redisClient) return redisClient;

  const url = getEnv().REDIS_URL;
  if (!url) {
    throw new Error(
      "REDIS_URL is required before Redis-backed operations can run",
    );
  }

  redisClient = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 200, 2000);
    },
  });

  redisClient.on("ready", () => logger.info("Redis ready"));
  redisClient.on("error", (err) => logger.error({ err }, "Redis error"));
  redisClient.on("close", () => logger.warn("Redis connection closed"));

  return redisClient;
}

export async function waitForRedisReady(): Promise<void> {
  const client = getRedis();
  if (client.status === "ready") return;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      client.off("ready", onReady);
      client.off("error", onError);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    client.once("ready", onReady);
    client.once("error", onError);
  });
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient) return;
  await redisClient.quit();
  redisClient = undefined;
}

export function isRedisConnected(): boolean {
  return redisClient?.status === "ready";
}
