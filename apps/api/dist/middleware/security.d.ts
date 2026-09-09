import { Response, NextFunction } from "express";
/**
 * Enhanced rate limiting with different limits for different routes
 */
export declare const createRateLimiter: (windowMs?: number, max?: number, message?: string) => import("express-rate-limit").RateLimitRequestHandler;
/**
 * Strict rate limiter for sensitive operations (auth, payments)
 */
export declare const strictRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Moderate rate limiter for general API routes
 */
export declare const moderateRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Lenient rate limiter for public endpoints
 */
export declare const lenientRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Track failed login attempts
 */
export declare const trackFailedAttempt: (identifier: string) => {
    count: number;
    resetTime: number;
} | undefined;
/**
 * Check if identifier is blocked due to too many failed attempts
 */
export declare const isBlocked: (identifier: string) => boolean;
/**
 * Middleware to check for blocked identifiers
 */
export declare const checkBlocked: (identifierExtractor: (req: any) => string) => (req: any, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * CSRF Protection middleware
 */
export declare const csrfProtection: (req: any, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
/**
 * Security headers middleware
 */
export declare const securityHeaders: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: (err?: unknown) => void) => void;
/**
 * IP-based blocking middleware
 */
export declare const ipBlockMiddleware: (req: any, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Request size limiter
 */
export declare const requestSizeLimiter: (maxSize?: string) => (req: any, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Sanitize input middleware
 */
export declare const sanitizeInput: (req: any, res: Response, next: NextFunction) => void;
/**
 * Validate content type
 */
export declare const validateContentType: (allowedTypes?: string[]) => (req: any, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Prevent parameter pollution
 */
export declare const preventParameterPollution: (req: any, res: Response, next: NextFunction) => void;
/**
 * Security check middleware - combines multiple security measures
 */
export declare const securityCheck: (((req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: (err?: unknown) => void) => void) | ((req: any, res: Response, next: NextFunction) => void))[];
