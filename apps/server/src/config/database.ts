import mongoose from 'mongoose';

import { logger } from '../utils/logger';

import { getEnv } from './env';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

let retryCount = 0;

const connectOptions: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 100,
  minPoolSize: 2,
  bufferCommands: false,
  autoIndex: process.env.NODE_ENV !== 'production',
};

export async function connectDatabase(): Promise<void> {
  const env = getEnv();
  const uri = env.MONGODB_URI;

  mongoose.connection.on('connected', () => {
    logger.info('✅ MongoDB connected successfully');
    retryCount = 0;
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, '❌ MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️  MongoDB disconnected');
  });

  await attemptConnect(uri);
}

async function attemptConnect(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri, connectOptions);
  } catch (err) {
    retryCount++;
    logger.error({ err, attempt: retryCount }, `MongoDB connection failed (attempt ${retryCount}/${MAX_RETRIES})`);

    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying MongoDB connection in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return attemptConnect(uri);
    } else {
      logger.error('Max MongoDB retry attempts reached. Exiting.');
      process.exit(1);
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export { mongoose };
