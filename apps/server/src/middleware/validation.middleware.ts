import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, z, ZodError } from 'zod';
import { AppError } from './error.middleware';

export const validate = (schema: AnyZodObject) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (Object.prototype.hasOwnProperty.call(parsed, 'body')) {
      req.body = parsed.body;
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'query')) {
      req.query = parsed.query;
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'params')) {
      req.params = parsed.params;
    }

    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return next(AppError.badRequest(messages.join(', ')));
    }
    return next(error);
  }
};

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
