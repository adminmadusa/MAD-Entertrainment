import jwt from 'jsonwebtoken';
export interface JwtUserPayload {
    userId: string;
    email?: string;
    phone?: string;
    isGuest?: boolean;
}
export interface JwtAdminPayload {
    adminId: string;
    email: string;
    role: string;
}
export declare function signUserToken(payload: JwtUserPayload): string;
export declare function verifyUserToken(token: string): JwtUserPayload;
export declare function signAdminToken(payload: JwtAdminPayload): string;
export declare function verifyAdminToken(token: string): JwtAdminPayload;
export declare function extractBearerToken(authHeader: string | undefined): string | null;
export declare function decodeToken(token: string): jwt.JwtPayload | null;
//# sourceMappingURL=jwt.d.ts.map