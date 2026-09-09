import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
const prisma = new PrismaClient();
// Permission definitions based on roles
const ROLE_PERMISSIONS = {
    SUPER_ADMIN: [
        "all",
        "users.manage",
        "roles.manage",
        "campaigns.all",
        "vehicles.all",
        "tickets.all",
        "draws.all",
        "winners.all",
        "payments.all",
        "refunds.all",
        "kyc.all",
        "reports.all",
        "audit.all",
        "system.settings",
    ],
    LOTTERY_MANAGER: [
        "campaigns.create",
        "campaigns.edit",
        "campaigns.publish",
        "campaigns.cancel",
        "vehicles.manage",
        "tickets.view",
        "draws.prepare",
        "reports.view",
    ],
    FINANCE_OFFICER: [
        "payments.view",
        "payments.verify",
        "refunds.process",
        "reports.financial",
        "tickets.view",
    ],
    KYC_OFFICER: [
        "kyc.view",
        "kyc.approve",
        "kyc.reject",
        "customers.view",
    ],
    DRAW_OFFICER: [
        "draws.prepare",
        "draws.execute",
        "draws.verify",
        "tickets.view",
    ],
    AUDITOR: [
        "audit.view",
        "reports.all",
        "payments.view",
        "tickets.view",
        "draws.view",
    ],
    CUSTOMER_SUPPORT: [
        "customers.view",
        "tickets.view",
        "notifications.send",
        "support.assist",
    ],
    CONTENT_MANAGER: [
        "campaigns.edit",
        "vehicles.view",
        "content.manage",
    ],
    CUSTOMER: [
        "tickets.buy",
        "tickets.view",
        "profile.edit",
        "kyc.submit",
    ],
};
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
        if (!token) {
            return res
                .status(401)
                .json({ message: "Access denied. No token provided." });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Ensure this is an access token
        if (decoded.type !== "access") {
            return res.status(403).json({
                message: "Invalid token type. Use refresh token endpoint."
            });
        }
        // Fetch user with customer profile and KYC
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: {
                customerProfile: true,
                kycRecord: true,
            },
        });
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        // Check if user account is active
        if (user.status !== "ACTIVE") {
            return res.status(403).json({
                message: "Account is not active. Status: " + user.status
            });
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            customerId: user.customerProfile?.id,
            kycStatus: user.kycRecord?.idVerificationStatus,
        };
        req.userId = user.id;
        req.role = user.role;
        req.customerId = user.customerProfile?.id;
        next();
    }
    catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ message: "Invalid token" });
        }
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: "Token expired" });
        }
        console.error("Token verification error:", error);
        res.status(500).json({ message: "Token verification failed" });
    }
};
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.role) {
            return res.status(403).json({
                message: "Forbidden. No role found in request.",
            });
        }
        if (!allowedRoles.includes(req.role)) {
            return res.status(403).json({
                message: "Forbidden. You do not have permission to access this resource.",
                requiredRoles: allowedRoles,
                userRole: req.role,
            });
        }
        next();
    };
};
export const authorizePermission = (permission) => {
    return (req, res, next) => {
        if (!req.role) {
            return res.status(403).json({
                message: "Forbidden. No role found in request.",
            });
        }
        const permissions = ROLE_PERMISSIONS[req.role];
        // SUPER_ADMIN has access to everything
        if (req.role === "SUPER_ADMIN" || permissions.includes("all")) {
            return next();
        }
        if (!permissions.includes(permission)) {
            return res.status(403).json({
                message: "Forbidden. You do not have the required permission.",
                requiredPermission: permission,
                userRole: req.role,
            });
        }
        next();
    };
};
export const requireKYC = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
    }
    // Admin roles don't require KYC
    const adminRoles = ["SUPER_ADMIN", "LOTTERY_MANAGER", "FINANCE_OFFICER", "KYC_OFFICER", "DRAW_OFFICER", "AUDITOR", "CUSTOMER_SUPPORT", "CONTENT_MANAGER"];
    if (adminRoles.includes(req.user.role)) {
        return next();
    }
    if (req.user.kycStatus !== "VERIFIED") {
        return res.status(403).json({
            message: "KYC verification required. Please complete KYC verification.",
            kycStatus: req.user.kycStatus,
        });
    }
    next();
};
export const generateTokens = (userId, email, role) => {
    const requestId = crypto.randomBytes(16).toString("hex");
    const accessToken = jwt.sign({
        id: userId,
        email,
        role,
        type: "access",
        requestId,
    }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({
        id: userId,
        email,
        role,
        type: "refresh",
        requestId,
    }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "fallback_refresh_secret_2026", { expiresIn: "7d" });
    return { accessToken, refreshToken, requestId };
};
export const verifyRefreshToken = (token) => {
    try {
        const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "fallback_refresh_secret_2026";
        const decoded = jwt.verify(token, secret);
        if (decoded.type !== "refresh") {
            throw new Error("Invalid token type");
        }
        return decoded;
    }
    catch (error) {
        throw new Error("Invalid refresh token");
    }
};
