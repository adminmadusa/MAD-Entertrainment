import 'express-async-errors';
import compression from 'compression';
import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { generateOpenApiDocument } from './config/openapi';
import { getEnv } from './config/env';
import { noStoreApiCache } from './middleware/cache.middleware';
import { correlationMiddleware } from './middleware/correlation.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { generalLimiter } from './middleware/rate.middleware';
import routes from './routes';
import { logger } from './utils/logger';

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
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false, // CSP is handled by Next.js
    })
  );

  // ─── CORS ──────────────────────────────────────────────────
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
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

  // ─── Compression ───────────────────────────────────────────
  app.use(compression());

  // ─── Body Parsers ──────────────────────────────────────────
  app.use(express.json({
    limit: '10mb',
    verify: (req: any, res, buf) => {
      if (req.originalUrl && req.originalUrl.includes('/webhook/')) {
        req.rawBody = buf;
      }
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
