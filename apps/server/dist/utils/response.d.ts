import { Response } from 'express';
import { PaginationMeta } from '@mad/shared';
export declare function sendSuccess<T>(res: Response, data: T, message?: string, statusCode?: 200): Response;
export declare function sendCreated<T>(res: Response, data: T, message?: string): Response;
export declare function sendError(res: Response, message?: string, statusCode?: 500, errors?: Record<string, string[]>): Response;
export declare function sendNotFound(res: Response, resource?: string): Response;
export declare function sendUnauthorized(res: Response, message?: string): Response;
export declare function sendForbidden(res: Response, message?: string): Response;
export declare function sendValidationError(res: Response, errors: Record<string, string[]>): Response;
export declare function sendPaginated<T>(res: Response, data: T[], pagination: PaginationMeta, message?: string): Response;
export declare function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta;
export declare function parsePaginationParams(query: {
    page?: unknown;
    limit?: unknown;
}): {
    page: number;
    limit: number;
    skip: number;
};
//# sourceMappingURL=response.d.ts.map