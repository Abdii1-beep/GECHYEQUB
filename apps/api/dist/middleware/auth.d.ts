import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: Role;
        customerId?: string;
        kycStatus?: string;
    };
    userId?: string;
    role?: Role;
    customerId?: string;
    requestId?: string;
}
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const authorizeRoles: (...allowedRoles: Role[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const authorizePermission: (permission: string) => (req: AuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const requireKYC: (req: AuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const generateTokens: (userId: string, email: string, role: Role) => {
    accessToken: string;
    refreshToken: string;
    requestId: string;
};
export declare const verifyRefreshToken: (token: string) => {
    id: string;
    email: string;
    role: Role;
    type: "refresh";
    requestId: string;
};
