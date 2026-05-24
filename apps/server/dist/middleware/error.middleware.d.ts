import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly errors?: Record<string, string[]>;
    constructor(message: string, statusCode?: 500, errors?: Record<string, string[]>, isOperational?: boolean);
    static badRequest(message: string, errors?: Record<string, string[]>): AppError;
    static unauthorized(message?: string): AppError;
    static forbidden(message?: string): AppError;
    static notFound(resource?: string): AppError;
    static conflict(message: string): AppError;
    static tooManyRequests(message?: string): AppError;
}
export declare function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void;
export declare function notFoundHandler(req: Request, res: Response): void;
//# sourceMappingURL=error.middleware.d.ts.map