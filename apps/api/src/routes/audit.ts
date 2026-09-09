import { Router, Request, Response } from "express";
import { authenticateToken, authorizeRoles, AuthRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// @route   GET /api/audit/logs
// @desc    Get audit logs (paginated)
// @access  Private (AUDITOR+, SUPER_ADMIN)
router.get(
  "/logs",
  authenticateToken,
  authorizeRoles("AUDITOR", "SUPER_ADMIN", "LOTTERY_MANAGER"),
  async (req: AuthRequest, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const action = req.query.action as string;
      const entity = req.query.entity as string;
      const userId = req.query.userId as string;
      const role = req.query.role as string;
      const result = req.query.result as string;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      const where: any = {
        ...(action && { action }),
        ...(entity && { entity }),
        ...(userId && { userId }),
        ...(role && { role }),
        ...(result && { result }),
        ...(startDate && endDate && {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        }),
      };

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: { id: true, email: true, role: true },
            },
          },
          orderBy: { timestamp: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      res.json({
        logs,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
      });
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/audit/logs/:id
// @desc    Get specific audit log details
// @access  Private (AUDITOR+, SUPER_ADMIN)
router.get(
  "/logs/:id",
  authenticateToken,
  authorizeRoles("AUDITOR", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const log = await prisma.auditLog.findUnique({
        where: { id: req.params.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              customerProfile: {
                select: { fullName: true },
              },
            },
          },
        },
      });

      if (!log) {
        return res.status(404).json({ message: "Audit log not found" });
      }

      res.json({ log });
    } catch (error) {
      console.error("Get audit log details error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/audit/logs/count
// @desc    Get audit log counts
// @access  Private (AUDITOR+, SUPER_ADMIN)
router.get(
  "/logs/count",
  authenticateToken,
  authorizeRoles("AUDITOR", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const total = await prisma.auditLog.count();
      const byAction = await prisma.auditLog.groupBy({
        by: ["action"],
        _count: { action: true },
      });

      const byEntity = await prisma.auditLog.groupBy({
        by: ["entity"],
        _count: { entity: true },
      });

      const byRole = await prisma.auditLog.groupBy({
        by: ["role"],
        _count: { role: true },
      });

      const byResult = await prisma.auditLog.groupBy({
        by: ["result"],
        _count: { result: true },
      });

      res.json({
        total,
        byAction,
        byEntity,
        byRole,
        byResult,
      });
    } catch (error) {
      console.error("Get audit log counts error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/audit/recent
// @desc    Get recent audit logs
// @access  Private (AUDITOR+, SUPER_ADMIN)
router.get(
  "/recent",
  authenticateToken,
  authorizeRoles("AUDITOR", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 20;

      const recentLogs = await prisma.auditLog.findMany({
        include: {
          user: {
            select: { id: true, email: true, role: true },
          },
        },
        orderBy: { timestamp: "desc" },
        take: limit,
      });

      res.json({ recentLogs });
    } catch (error) {
      console.error("Get recent audit logs error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/audit/user/:userId
// @desc    Get audit logs for a specific user
// @access  Private (AUDITOR+, SUPER_ADMIN, or own logs)
router.get(
  "/user/:userId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;

      // Check authorization
      const isAdmin = req.role === "SUPER_ADMIN" || req.role === "AUDITOR";
      const isOwnLogs = req.userId === userId;

      if (!isAdmin && !isOwnLogs) {
        return res.status(403).json({ message: "Not authorized to view these logs" });
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where: { userId } }),
        prisma.auditLog.findMany({
          where: { userId },
          include: {
            user: {
              select: { id: true, email: true, role: true },
            },
          },
          orderBy: { timestamp: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      res.json({
        logs,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
      });
    } catch (error) {
      console.error("Get user audit logs error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/audit/entity/:entity
// @desc    Get audit logs for a specific entity type
// @access  Private (AUDITOR+, SUPER_ADMIN)
router.get(
  "/entity/:entity",
  authenticateToken,
  authorizeRoles("AUDITOR", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { entity } = req.params;
      const entityId = req.query.entityId as string;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;

      const where: any = { entity };
      if (entityId) {
        where.entityId = entityId;
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: { id: true, email: true, role: true },
            },
          },
          orderBy: { timestamp: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      res.json({
        logs,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
      });
    } catch (error) {
      console.error("Get entity audit logs error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/audit/statistics
// @desc    Get audit log statistics
// @access  Private (AUDITOR+, SUPER_ADMIN)
router.get(
  "/statistics",
  authenticateToken,
  authorizeRoles("AUDITOR", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const totalLogs = await prisma.auditLog.count({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const logsByDay = await prisma.auditLog.groupBy({
        by: ["timestamp"],
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: { timestamp: true },
      });

      const topActions = await prisma.auditLog.groupBy({
        by: ["action"],
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: { action: true },
        orderBy: {
          _count: {
            action: "desc",
          },
        },
        take: 10,
      });

      const topEntities = await prisma.auditLog.groupBy({
        by: ["entity"],
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: { entity: true },
        orderBy: {
          _count: {
            entity: "desc",
          },
        },
        take: 10,
      });

      const failedActions = await prisma.auditLog.count({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
          result: "FAILURE",
        },
      });

      res.json({
        totalLogs,
        logsByDay,
        topActions,
        topEntities,
        failedActions,
        successRate: totalLogs > 0 ? ((totalLogs - failedActions) / totalLogs) * 100 : 100,
      });
    } catch (error) {
      console.error("Get audit statistics error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/audit/search
// @desc    Search audit logs
// @access  Private (AUDITOR+, SUPER_ADMIN)
router.get(
  "/search",
  authenticateToken,
  authorizeRoles("AUDITOR", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { q } = req.query;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;

      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }

      const searchQuery = q.toLowerCase();

      const logs = await prisma.auditLog.findMany({
        where: {
          OR: [
            { action: { contains: searchQuery, mode: "insensitive" } },
            { entity: { contains: searchQuery, mode: "insensitive" } },
            { requestId: { contains: searchQuery, mode: "insensitive" } },
            { ipAddress: { contains: searchQuery, mode: "insensitive" } },
          ],
        },
        include: {
          user: {
            select: { id: true, email: true, role: true },
          },
        },
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = await prisma.auditLog.count({
        where: {
          OR: [
            { action: { contains: searchQuery, mode: "insensitive" } },
            { entity: { contains: searchQuery, mode: "insensitive" } },
            { requestId: { contains: searchQuery, mode: "insensitive" } },
            { ipAddress: { contains: searchQuery, mode: "insensitive" } },
          ],
        },
      });

      res.json({
        logs,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
      });
    } catch (error) {
      console.error("Search audit logs error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;