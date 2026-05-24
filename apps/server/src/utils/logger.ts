import pino from 'pino';

import { getEnv } from '../config/env';
import { getCorrelationId } from './context';

const env = getEnv();
const isDev = env.NODE_ENV !== 'production';

export const logger = pino(
  {
    level: env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    base: { service: 'mad-server' },
    timestamp: pino.stdTimeFunctions.isoTime,
    mixin() {
      const correlationId = getCorrelationId();
      return correlationId ? { correlationId } : {};
    },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  },
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname,service',
          messageFormat: '{msg}',
        },
      })
    : pino.destination({ sync: false })
);
