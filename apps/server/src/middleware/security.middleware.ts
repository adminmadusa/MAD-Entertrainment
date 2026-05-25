import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Blocks known scrapers, vulnerability scanners, and headless testing agents
 * in production environments. Bypasses in development and testing.
 */
export function botMitigation(req: Request, res: Response, next: NextFunction) {
  const env = getEnv();
  // Bypass in development and test environments to not interfere with local runs or tests
  if (env.NODE_ENV === 'test' || env.NODE_ENV === 'development') {
    return next();
  }

  const userAgent = req.headers['user-agent'];
  if (!userAgent) {
    logger.warn({ ip: req.ip, path: req.path }, 'Blocked request with missing User-Agent header');
    return res.status(403).json({
      success: false,
      message: 'Access denied: User-Agent header is required',
    });
  }

  const suspiciousAgents = [
    /curl/i,
    /wget/i,
    /python/i,
    /nikto/i,
    /sqlmap/i,
    /nmap/i,
    /headless/i,
    /selenium/i,
    /playwright/i,
  ];

  const isSuspicious = suspiciousAgents.some((regex) => regex.test(userAgent));
  if (isSuspicious) {
    logger.warn({ userAgent, ip: req.ip, path: req.path }, 'Blocked suspicious user-agent');
    return res.status(403).json({
      success: false,
      message: 'Access denied: Automated requests are blocked',
    });
  }

  next();
}
