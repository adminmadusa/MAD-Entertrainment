import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

import { AppError } from './error.middleware';

/**
 * Validates request body against a Zod schema.
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(AppError.badRequest('Validation failed', formatZodErrors(result.error)));
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validates request query parameters against a Zod schema.
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(AppError.badRequest('Validation failed', formatZodErrors(result.error)));
    }
    req.query = result.data;
    next();
  };
}

/**
 * Validates route parameters (path params) against a Zod schema.
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(AppError.badRequest('Validation failed', formatZodErrors(result.error)));
    }
    req.params = result.data;
    next();
  };
}

/**
 * Format Zod validation errors to standardized Record<string, string[]> payload
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'body';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }
  return errors;
}
