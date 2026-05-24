import crypto from 'crypto';

import { RequestHandler } from 'express';
import { Logger } from 'pino';

import { logger } from '../utils/logger';
import { runWithContext } from '../utils/context';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      log?: Logger;
    }
  }
}

export const correlationMiddleware: RequestHandler = (req, res, next) => {
  const requestId = req.header('x-request-id') || req.header('x-correlation-id') || crypto.randomUUID();
  req.id = requestId;
  req.log = logger.child({ requestId });
  res.setHeader('x-request-id', requestId);

  runWithContext({ correlationId: requestId }, () => {
    next();
  });
};
