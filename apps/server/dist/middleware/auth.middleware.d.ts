import { Request, Response, NextFunction } from 'express';
import { JwtUserPayload, JwtAdminPayload } from '../utils/jwt';
import { AdminRole } from '@mad/shared';
declare global {
    namespace Express {
        interface Request {
            user?: JwtUserPayload;
            admin?: JwtAdminPayload;
        }
    }
}
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): void;
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: AdminRole[]): (req: Request, res: Response, next: NextFunction) => void;
export declare function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.middleware.d.ts.map