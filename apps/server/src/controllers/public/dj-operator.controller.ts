import { Request, Response, NextFunction } from 'express';
import { PublicDJOperatorService } from '../../services/public/dj-operator.service';
import { CacheService } from '../../services/cache.service';
import { sendSuccess } from '../../utils/response';

export async function listDJOperators(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 12);
    const includeTotal = req.query.includeTotal !== 'false';

    const cacheKey = `dj-operators:list:${search || 'none'}:${page}:${limit}:${includeTotal}`;
    const startTime = performance.now();

    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      console.log(`[dj-operators:cache-hit] ${duration.toFixed(0)}ms`);
      sendSuccess(res, cached, 'DJ Operators retrieved (cached)');
      return;
    }

    const queryStartTime = performance.now();
    const result = await PublicDJOperatorService.listDJOperators({ search, page, limit, includeTotal });
    const queryDuration = performance.now() - queryStartTime;

    await CacheService.set(cacheKey, result, 120);

    const totalDuration = performance.now() - startTime;
    console.log(`[dj-operators:query] ${queryDuration.toFixed(0)}ms | total: ${totalDuration.toFixed(0)}ms`);

    sendSuccess(res, result, 'DJ Operators retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getDJOperatorBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { slug } = req.params;
    const cacheKey = `dj-operators:detail:${slug}`;
    const startTime = performance.now();

    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      console.log(`[dj-operators:detail:cache-hit] ${duration.toFixed(0)}ms`);
      sendSuccess(res, cached, 'DJ Operator retrieved (cached)');
      return;
    }

    const queryStartTime = performance.now();
    const djOperator = await PublicDJOperatorService.getDJOperatorBySlug(slug);
    const queryDuration = performance.now() - queryStartTime;

    await CacheService.set(cacheKey, djOperator, 300);

    const totalDuration = performance.now() - startTime;
    console.log(`[dj-operators:detail:query] ${queryDuration.toFixed(0)}ms | total: ${totalDuration.toFixed(0)}ms`);

    sendSuccess(res, djOperator, 'DJ Operator retrieved');
  } catch (err) {
    next(err);
  }
}
