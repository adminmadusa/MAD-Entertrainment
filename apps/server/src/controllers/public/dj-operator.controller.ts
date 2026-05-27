import { Request, Response, NextFunction } from "express";
import { PublicDJOperatorService } from "../../services/public/dj-operator.service";
import { CacheService } from "../../services/cache.service";
import { sendSuccess } from "../../utils/response";

export async function listDJOperators(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 12);

    const cacheKey = `dj-operators:list:${search || "none"}:${page}:${limit}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      sendSuccess(res, cached, "DJ Operators retrieved (cached)");
      return;
    }

    const result = await PublicDJOperatorService.listDJOperators({
      search,
      page,
      limit,
    });
    await CacheService.set(cacheKey, result, 120);

    sendSuccess(res, result, "DJ Operators retrieved");
  } catch (err) {
    next(err);
  }
}

export async function getDJOperatorBySlug(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { slug } = req.params;
    const cacheKey = `dj-operators:detail:${slug}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      sendSuccess(res, cached, "DJ Operator retrieved (cached)");
      return;
    }

    const djOperator = await PublicDJOperatorService.getDJOperatorBySlug(slug);
    await CacheService.set(cacheKey, djOperator, 300);

    sendSuccess(res, djOperator, "DJ Operator retrieved");
  } catch (err) {
    next(err);
  }
}
