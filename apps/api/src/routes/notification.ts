import { Router, Request, Response } from "express";
import { authenticateToken, authorizeRoles, AuthRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Helper function to create notification
const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: any
) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : "{}",
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

// @route   GET /api/notifications
// @desc    Get user notifications (paginated)
// @access  Private
router.get(
  "/",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const unreadOnly = req.query.unreadOnly === "true";

      const where: any = { userId: req.userId! };
      if (unreadOnly) {
        where.read = false;
      }

      const [total, notifications] = await Promise.all([
        prisma.notification.count({ where }),
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const unreadCount = await prisma.notification.count({
        where: { userId: req.userId!, read: false },
      });

      res.json({
        notifications,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        unreadCount,
      });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get(
  "/unread-count",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const count = await prisma.notification.count({
        where: { userId: req.userId!, read: false },
      });
      res.json({ count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/notifications/:id
// @desc    Get specific notification
// @access  Private
router.get(
  "/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: req.params.id },
      });

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      if (notification.userId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to view this notification" });
      }

      res.json({ notification });
    } catch (error) {
      console.error("Get notification error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put(
  "/:id/read",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: req.params.id },
      });

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      if (notification.userId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to modify this notification" });
      }

      await prisma.notification.update({
        where: { id: req.params.id },
        data: { read: true },
      });

      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put(
  "/read-all",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.userId!, read: false },
        data: { read: true },
      });

      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all read error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: req.params.id },
      });

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      if (notification.userId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to delete this notification" });
      }

      await prisma.notification.delete({
        where: { id: req.params.id },
      });

      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/notifications
// @desc    Delete all read notifications
// @access  Private
router.delete(
  "/",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const deleteReadOnly = req.query.readOnly === "true";

      const where: any = { userId: req.userId! };
      if (deleteReadOnly) {
        where.read = true;
      }

      const result = await prisma.notification.deleteMany({ where });

      res.json({ 
        message: `Deleted ${result.count} notification(s)`,
        deletedCount: result.count 
      });
    } catch (error) {
      console.error("Delete notifications error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/notifications/send
// @desc    Send notification to user (admin)
// @access  Private (ADMIN+)
router.post(
  "/send",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER", "CUSTOMER_SUPPORT"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId, type, title, message, data } = req.body;

      if (!userId || !type || !title || !message) {
        return res.status(400).json({
          message: "Missing required fields: userId, type, title, message",
        });
      }

      await createNotification(userId, type, title, message, data);

      res.json({ message: "Notification sent successfully" });
    } catch (error) {
      console.error("Send notification error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/notifications/broadcast
// @desc    Broadcast notification to all users (admin)
// @access  Private (SUPER_ADMIN)
router.post(
  "/broadcast",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { type, title, message, data, roleFilter } = req.body;

      if (!type || !title || !message) {
        return res.status(400).json({
          message: "Missing required fields: type, title, message",
        });
      }

      // Get target users
      const where: any = {};
      if (roleFilter) {
        where.role = roleFilter;
      }

      const users = await prisma.user.findMany({
        where,
        select: { id: true },
      });

      // Create notifications for all users
      const notificationPromises = users.map((user) =>
        createNotification(user.id, type, title, message, data)
      );

      await Promise.all(notificationPromises);

      res.json({ 
        message: `Broadcast sent to ${users.length} user(s)`,
        recipientCount: users.length 
      });
    } catch (error) {
      console.error("Broadcast notification error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/notifications/types
// @desc    Get notification types (for UI dropdowns)
// @access  Private
router.get(
  "/types",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const types = [
        { value: "INFO", label: "Information" },
        { value: "SUCCESS", label: "Success" },
        { value: "WARNING", label: "Warning" },
        { value: "ERROR", label: "Error" },
        { value: "PAYMENT", label: "Payment" },
        { value: "TICKET", label: "Ticket" },
        { value: "DRAW", label: "Draw" },
        { value: "WINNER", label: "Winner" },
        { value: "KYC", label: "KYC" },
        { value: "SYSTEM", label: "System" },
      ];

      res.json({ types });
    } catch (error) {
      console.error("Get notification types error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;