import { RequestHandler } from 'express';

const NO_STORE_VALUE = 'no-store, no-cache, must-revalidate, proxy-revalidate';

export const noStoreApiCache: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', NO_STORE_VALUE);
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('X-Cache-Policy', 'api-no-store');
  res.setHeader('X-Cache-Debug', 'MISS; store=disabled');
  next();
};
