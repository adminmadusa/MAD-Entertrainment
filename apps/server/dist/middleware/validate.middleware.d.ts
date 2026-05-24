import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
type ValidateTarget = 'body' | 'query' | 'params';
/**
 * Factory for creating a Zod validation middleware
 * @param schema Zod schema to validate against
 * @param target Which part of the request to validate (default: body)
 */
export declare function validate<T>(schema: ZodSchema<T>, target?: ValidateTarget): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Validate multiple targets at once
 */
export declare function validateMultiple(schemas: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}): (req: Request, res: Response, next: NextFunction) => void;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
}, {
    limit?: number | undefined;
    page?: number | undefined;
}>;
export declare const mongoIdSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const slugParamSchema: z.ZodObject<{
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    slug: string;
}, {
    slug: string;
}>;
export declare const bookingIdParamSchema: z.ZodObject<{
    bookingId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    bookingId: string;
}, {
    bookingId: string;
}>;
export {};
//# sourceMappingURL=validate.middleware.d.ts.map