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

export const cdnCache = (maxAgeSeconds: number, sMaxAgeSeconds: number): RequestHandler => {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      return next();
    }
    
    const staleWhileRevalidate = Math.round(sMaxAgeSeconds * 0.2);
    res.setHeader(
      'Cache-Control',
      `public, max-age=${maxAgeSeconds}, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidate}`
    );
    res.setHeader('X-Cache-Policy', 'cdn-cache-enabled');
    next();
  };
};
