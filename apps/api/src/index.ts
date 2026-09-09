import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import xss from "xss-clean";
import compression from "compression";
import crypto from "crypto";
import authRoutes from "./routes/auth";
import customerRoutes from "./routes/customer";
import adminRoutes from "./routes/admin";
import campaignRoutes from "./routes/campaign";
import vehicleRoutes from "./routes/vehicle";
import ticketRoutes from "./routes/ticket";
import drawRoutes from "./routes/draw";
import winnerRoutes from "./routes/winner";
import kycRoutes from "./routes/kyc";
import paymentRoutes from "./routes/payment";
import fraudRoutes from "./routes/fraud";
import auditRoutes from "./routes/audit";
import notifRoutes from "./routes/notification";
import reportsRoutes from "./routes/reports";
import qrRoutes from "./routes/qr";
import transparencyRoutes from "./routes/transparency";
import { globalErrorHandler as errorMiddleware } from "./middleware/error";
import {
  securityHeaders,
  strictRateLimiter,
  moderateRateLimiter,
  lenientRateLimiter,
  checkBlocked,
  csrfProtection,
  sanitizeInput,
  preventParameterPollution,
  validateContentType,
  requestSizeLimiter,
} from "./middleware/security";
import { PrismaClient } from "@prisma/client";

import uploadRoutes from "./routes/upload";
import path from "path";
import fs from "fs";

const app = express();
const prisma = new PrismaClient();

// Ensure uploads folder exists and serve static files
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Security middleware
app.use(securityHeaders);
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(compression());
app.use(sanitizeInput);
app.use(preventParameterPollution);
app.use(validateContentType(["application/json", "multipart/form-data"]));
app.use(requestSizeLimiter("30mb"));

// Body parsing (support high-resolution car photo uploads up to 30MB)
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

// Request ID middleware
app.use((req: any, res, next) => {
  req.id = crypto.randomBytes(16).toString("hex");
  next();
});

// Routes with appropriate rate limiting
app.use("/api/upload", moderateRateLimiter, uploadRoutes);
app.use("/api/auth", strictRateLimiter, authRoutes);
app.use("/api/customers", moderateRateLimiter, customerRoutes);
app.use("/api/admin", moderateRateLimiter, adminRoutes);
app.use("/api/campaigns", moderateRateLimiter, campaignRoutes);
app.use("/api/vehicles", moderateRateLimiter, vehicleRoutes);
app.use("/api/tickets", moderateRateLimiter, ticketRoutes);
app.use("/api/draws", moderateRateLimiter, drawRoutes);
app.use("/api/winners", moderateRateLimiter, winnerRoutes);
app.use("/api/kyc", moderateRateLimiter, kycRoutes);
app.use("/api/payments", strictRateLimiter, paymentRoutes);
app.use("/api/fraud", moderateRateLimiter, fraudRoutes);
app.use("/api/notifications", moderateRateLimiter, notifRoutes);
app.use("/api/audit", moderateRateLimiter, auditRoutes);
app.use("/api/reports", moderateRateLimiter, reportsRoutes);
app.use("/api/qr", moderateRateLimiter, qrRoutes);
app.use("/api/transparency", lenientRateLimiter, transparencyRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Error handler
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Ethiopian Car Lottery API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received. Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received. Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});