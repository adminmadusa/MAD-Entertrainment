import { Request, Response, NextFunction } from 'express';

import { CacheService } from '../../services/cache.service';
import { PublicEventService } from '../../services/public/event.service';
import { logger } from '../../utils/logger';
import { sendSuccess } from '../../utils/response';

type PublicEventListResult = Awaited<ReturnType<typeof PublicEventService.listEvents>>;
type PublicEventDetailResult = Awaited<ReturnType<typeof PublicEventService.getEventBySlug>>;

export async function listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 12);
    const includeTotal = req.query.includeTotal !== 'false';

    const cacheKey = `events:list:${category || 'all'}:${status || 'all'}:${search || 'none'}:${page}:${limit}:${includeTotal}`;
    const startTime = performance.now();

    const cached = await CacheService.get<PublicEventListResult>(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      logger.info({ durationMs: duration.toFixed(0) }, '[events:cache-hit]');
      sendSuccess(res, cached, 'Events list retrieved (cached)');
      return;
    }

    const queryStartTime = performance.now();
    const result = await PublicEventService.listEvents({ category, status, search, page, limit, includeTotal });
    const queryDuration = performance.now() - queryStartTime;

    // Cache for 60 seconds (1 minute)
    await CacheService.set(cacheKey, result, 60);

    const totalDuration = performance.now() - startTime;
    logger.info({ queryDurationMs: queryDuration.toFixed(0), totalDurationMs: totalDuration.toFixed(0) }, '[events:query]');

    sendSuccess(res, result, 'Events list retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getEventBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const slug = req.params.slug;
    const previewToken = req.query.preview as string;

    if (previewToken) {
      // Preview request: bypass cache completely
      const event = await PublicEventService.getEventBySlug(slug, previewToken);
      sendSuccess(res, event, 'Event details retrieved (preview)');
      return;
    }

    const cacheKey = `events:detail:slug:${slug}`;
    const startTime = performance.now();

    const cached = await CacheService.get<PublicEventDetailResult>(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      logger.info({ durationMs: duration.toFixed(0) }, '[events:detail:cache-hit]');
      sendSuccess(res, cached, 'Event details retrieved (cached)');
      return;
    }

    const queryStartTime = performance.now();
    const event = await PublicEventService.getEventBySlug(slug);
    const queryDuration = performance.now() - queryStartTime;

    // Cache for 300 seconds (5 minutes)
    await CacheService.set(cacheKey, event, 300);

    const totalDuration = performance.now() - startTime;
    logger.info({ queryDurationMs: queryDuration.toFixed(0), totalDurationMs: totalDuration.toFixed(0) }, '[events:detail:query]');

    sendSuccess(res, event, 'Event details retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getEventSeatLayout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const eventId = req.params.eventId;

    // Live seats changing frequently - query directly
    const layout = await PublicEventService.getEventSeatLayout(eventId);
    sendSuccess(res, layout, 'Seat layout retrieved');
  } catch (err) {
    next(err);
  }
}
