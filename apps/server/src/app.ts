import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { getEnv } from './config/env';
import { generateOpenApiDocument } from './config/openapi';
import { noStoreApiCache } from './middleware/cache.middleware';
import { correlationMiddleware } from './middleware/correlation.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { generalLimiter } from './middleware/rate.middleware';
import { botMitigation } from './middleware/security.middleware';
import routes from './routes';
import { logger } from './utils/logger';
import { isOriginAllowed } from './utils/origin-validator';

import 'express-async-errors';
import './models';

export function createApp(): Application {
  const app = express();
  const env = getEnv();

  // ─── Trust Proxy (for Vercel/Railway/Render) ─────────────
  app.set('trust proxy', 1);

  // ─── Request Correlation ──────────────────────────────────
  app.use(correlationMiddleware);

  // ─── Security Headers ─────────────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: true,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      referrerPolicy: { policy: 'same-origin' },
    })
  );

  // ─── Cookies ──────────────────────────────────────────────
  app.use(cookieParser(env.JWT_SECRET));

  // ─── Bot Mitigation ───────────────────────────────────────
  app.use(botMitigation);

  // ─── CORS ──────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: Origin ${origin} not allowed`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Request-ID',
        'x-session-id',
        'Cache-Control',
        'Pragma',
      ],
    })
  );

  // ─── Compression (BREACH mitigation) ──────────────────────
  app.use(
    compression({
      filter: (req, res) => {
        const contentType = res.getHeader('Content-Type');
        if (contentType && typeof contentType === 'string' && contentType.includes('text/event-stream')) {
          return false;
        }
        if (req.headers.authorization || req.headers.cookie) {
          return false;
        }
        return compression.filter(req, res);
      },
    })
  );

  // ─── Body Parsers (Payload size hardening) ────────────────
  app.use(express.json({
    limit: '100kb',
    verify: (req: any, _res, buf) => {
      if (req.originalUrl && req.originalUrl.includes('/webhook/')) {
        req.rawBody = buf;
      }
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // ─── Request Logging ──────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(
      morgan((tokens, req, res) => {
        const method = tokens.method(req, res);
        const url = tokens.url(req, res);
        const status = tokens.status(req, res);
        const responseTime = tokens['response-time'](req, res);

        const log = req.log || logger;
        log.info(`${method} ${url} ${status} - ${responseTime} ms`);
        return null;
      }, {
        skip: (req) => req.path === '/api/health',
      })
    );
  }

  // ─── API Cache Policy ─────────────────────────────────────
  app.use('/api', noStoreApiCache);

  // ─── General Rate Limiter ─────────────────────────────────
  app.use('/api', generalLimiter as any);

  // ─── API Docs ─────────────────────────────────────────────
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(generateOpenApiDocument()));

  // ─── API Routes ───────────────────────────────────────────
  app.use('/api', routes);

  // ─── 404 Handler ──────────────────────────────────────────
  app.use(notFoundHandler);

  // ─── Global Error Handler ─────────────────────────────────
  app.use(errorHandler);

  return app;
}
