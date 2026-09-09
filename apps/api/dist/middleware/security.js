import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
// Store for tracking failed attempts
const failedAttempts = new Map();
/**
 * Enhanced rate limiting with different limits for different routes
 */
export const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = "Too many requests, please try again later") => {
    return rateLimit({
        windowMs,
        max,
        message: { message },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // Skip rate limiting for trusted IPs if configured
            const trustedIps = process.env.TRUSTED_IPS?.split(",") || [];
            return trustedIps.includes(req.ip);
        },
    });
};
/**
 * Strict rate limiter for sensitive operations (auth, payments)
 */
export const strictRateLimiter = createRateLimiter(15 * 60 * 1000, // 15 minutes
process.env.NODE_ENV === "development" ? 100 : 10, "Too many attempts, please wait before trying again");
/**
 * Moderate rate limiter for general API routes
 */
export const moderateRateLimiter = createRateLimiter(15 * 60 * 1000, // 15 minutes
process.env.NODE_ENV === "development" ? 1000 : 100, // 1000 in dev, 100 in prod
"Rate limit exceeded");
/**
 * Lenient rate limiter for public endpoints
 */
export const lenientRateLimiter = createRateLimiter(60 * 60 * 1000, // 1 hour
1000, // 1000 requests
"Rate limit exceeded");
/**
 * Track failed login attempts
 */
export const trackFailedAttempt = (identifier) => {
    const now = Date.now();
    const attempt = failedAttempts.get(identifier);
    if (attempt && now < attempt.resetTime) {
        attempt.count++;
    }
    else {
        failedAttempts.set(identifier, {
            count: 1,
            resetTime: now + 15 * 60 * 1000, // 15 minutes
        });
    }
    return failedAttempts.get(identifier);
};
/**
 * Check if identifier is blocked due to too many failed attempts
 */
export const isBlocked = (identifier) => {
    const attempt = failedAttempts.get(identifier);
    if (!attempt)
        return false;
    const now = Date.now();
    if (now > attempt.resetTime) {
        failedAttempts.delete(identifier);
        return false;
    }
    return attempt.count >= 5; // Block after 5 failed attempts
};
/**
 * Middleware to check for blocked identifiers
 */
export const checkBlocked = (identifierExtractor) => {
    return (req, res, next) => {
        const identifier = identifierExtractor(req);
        if (isBlocked(identifier)) {
            return res.status(429).json({
                message: "Too many failed attempts. Please try again in 15 minutes.",
            });
        }
        next();
    };
};
/**
 * CSRF Protection middleware
 */
export const csrfProtection = (req, res, next) => {
    // Skip CSRF for GET requests
    if (req.method === "GET") {
        return next();
    }
    const csrfToken = req.headers["x-csrf-token"];
    const sessionToken = req.headers["authorization"];
    // For state-changing requests, require CSRF token
    if (!csrfToken) {
        return res.status(403).json({
            message: "CSRF token is required for this request",
        });
    }
    // In production, validate the CSRF token against the session
    // For now, we'll just check if it's present
    // TODO: Implement proper CSRF token validation
    next();
};
/**
 * Security headers middleware
 */
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
});
/**
 * IP-based blocking middleware
 */
export const ipBlockMiddleware = async (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress;
    try {
        // Check if IP is in the blocked list
        const blockedIp = await prisma.systemSetting.findUnique({
            where: { key: `blocked_ip_${ip}` },
        });
        if (blockedIp) {
            return res.status(403).json({
                message: "Access denied",
            });
        }
        next();
    }
    catch (error) {
        // If checking fails, allow the request to proceed
        console.error("IP block check error:", error);
        next();
    }
};
/**
 * Request size limiter
 */
export const requestSizeLimiter = (maxSize = "10mb") => {
    return (req, res, next) => {
        const contentLength = parseInt(req.headers["content-length"] || "0", 10);
        const maxSizeBytes = parseSize(maxSize);
        if (contentLength > maxSizeBytes) {
            return res.status(413).json({
                message: `Request body too large. Maximum size is ${maxSize}`,
            });
        }
        next();
    };
};
/**
 * Parse size string to bytes
 */
const parseSize = (size) => {
    const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
    if (!match)
        return 10 * 1024 * 1024; // Default to 10MB
    const value = parseFloat(match[1]);
    const unit = match[2] || "b";
    return value * (units[unit] || 1);
};
/**
 * Sanitize input middleware
 */
export const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj !== "object" || obj === null) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                // Remove potentially dangerous keys
                if (key.startsWith("$") || key.startsWith("_")) {
                    continue;
                }
                sanitized[key] = sanitize(obj[key]);
            }
        }
        return sanitized;
    };
    if (req.body) {
        req.body = sanitize(req.body);
    }
    if (req.query) {
        req.query = sanitize(req.query);
    }
    if (req.params) {
        req.params = sanitize(req.params);
    }
    next();
};
/**
 * Validate content type
 */
export const validateContentType = (allowedTypes = ["application/json"]) => {
    return (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
            const contentType = req.headers["content-type"];
            if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
                return res.status(415).json({
                    message: `Unsupported Media Type. Allowed types: ${allowedTypes.join(", ")}`,
                });
            }
        }
        next();
    };
};
/**
 * Prevent parameter pollution
 */
export const preventParameterPollution = (req, res, next) => {
    const clean = (obj) => {
        if (typeof obj !== "object" || obj === null) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj[obj.length - 1]; // Take the last value
        }
        const cleaned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cleaned[key] = clean(obj[key]);
            }
        }
        return cleaned;
    };
    if (req.query) {
        req.query = clean(req.query);
    }
    next();
};
/**
 * Security check middleware - combines multiple security measures
 */
export const securityCheck = [
    ipBlockMiddleware,
    securityHeaders,
    sanitizeInput,
    preventParameterPollution,
    validateContentType(["application/json", "multipart/form-data"]),
    requestSizeLimiter("10mb"),
];
