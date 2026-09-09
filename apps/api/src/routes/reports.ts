import { Router, Request, Response } from "express";
import { authenticateToken, authorizeRoles, AuthRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// @route   GET /api/reports/financial
// @desc    Get comprehensive financial reports
// @access  Private (FINANCE_OFFICER+, SUPER_ADMIN)
router.get(
  "/financial",
  authenticateToken,
  authorizeRoles("FINANCE_OFFICER", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, groupBy = "day" } = req.query;

      const where: any = {};
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }

      // Get all payments within date range
      const payments = await prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      // Calculate totals
      const totalSales = payments.filter((p) => p.status === "SUCCESS").length;
      const successfulAmount = payments
        .filter((p) => p.status === "SUCCESS")
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const failedPayments = payments.filter((p) => p.status === "FAILED").length;
      const refundedAmount = payments
        .filter((p) => p.status === "REFUNDED")
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // Revenue by payment provider (simplified - just count by status)
      const revenueByProvider = payments.reduce((acc, payment) => {
        acc[payment.status] = (acc[payment.status] || 0) + (payment.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      // Daily revenue trend
      const dailyRevenue = payments
        .filter((p) => p.status === "SUCCESS")
        .reduce((acc, payment) => {
          const date = payment.createdAt.toISOString().split("T")[0];
          acc[date] = (acc[date] || 0) + (payment.amount || 0);
          return acc;
        }, {} as Record<string, number>);

      // Revenue by campaign (simplified)
      const revenueByCampaign = payments.reduce((acc, payment) => {
        // We'll just count by order for now
        acc[payment.orderId] = (acc[payment.orderId] || 0) + (payment.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      res.json({
        period: {
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
        },
        summary: {
          totalSales,
          successfulPayments: totalSales,
          failedPayments,
          refundedPayments: payments.filter((p) => p.status === "REFUNDED").length,
          totalRevenue: successfulAmount,
          refundedAmount,
          netRevenue: successfulAmount - refundedAmount,
          successRate: payments.length > 0 ? (totalSales / payments.length) * 100 : 0,
        },
        breakdown: {
          byProvider: revenueByProvider,
          byCampaign: revenueByCampaign,
          dailyTrend: dailyRevenue,
        },
        paymentStatusBreakdown: payments.reduce(
          (acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      });
    } catch (error) {
      console.error("Get financial reports error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/reports/tickets
// @desc    Get comprehensive ticket reports
// @access  Private (LOTTERY_MANAGER+, SUPER_ADMIN)
router.get(
  "/tickets",
  authenticateToken,
  authorizeRoles("LOTTERY_MANAGER", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, campaignId } = req.query;

      const where: any = {};
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }
      if (campaignId) {
        where.campaignId = campaignId as string;
      }

      const tickets = await prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      const statusCounts = tickets.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Tickets by campaign
      const ticketsByCampaign = await prisma.ticket.groupBy({
        by: ["campaignId"],
        where,
        _count: { id: true },
      });

      // Daily ticket sales
      const dailySales = await prisma.ticket.groupBy({
        by: ["createdAt"],
        where,
        _count: { id: true },
        orderBy: { createdAt: "asc" },
      });

      res.json({
        summary: {
          totalTickets: tickets.length,
          statusCounts,
          availableTickets: statusCounts["AVAILABLE"] || 0,
          soldTickets: statusCounts["SOLD"] || 0,
          reservedTickets: statusCounts["RESERVED"] || 0,
        },
        breakdown: {
          byCampaign: ticketsByCampaign,
          dailySales,
        },
        tickets: tickets.slice(0, 100), // Limit to 100 for performance
      });
    } catch (error) {
      console.error("Get ticket reports error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/reports/customers
// @desc    Get comprehensive customer reports
// @access  Private (LOTTERY_MANAGER+, SUPER_ADMIN)
router.get(
  "/customers",
  authenticateToken,
  authorizeRoles("LOTTERY_MANAGER", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, kycStatus } = req.query;

      const where: any = {};
      if (startDate) {
        where.createdAt = { gte: new Date(startDate as string) };
      }

      const users = await prisma.user.findMany({
        where,
        include: {
          customerProfile: true,
          kycRecord: true,
        },
        orderBy: { createdAt: "desc" },
        take: 500, // Limit for performance
      });

      // KYC statistics
      const kycStats = users.reduce((acc, user) => {
        const kyc = user.kycRecord;
        if (kyc) {
          acc[kyc.idVerificationStatus] = (acc[kyc.idVerificationStatus] || 0) + 1;
        } else {
          acc["NOT_STARTED"] = (acc["NOT_STARTED"] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Customer registration trend
      const registrationTrend = await prisma.user.groupBy({
        by: ["createdAt"],
        where,
        _count: { id: true },
        orderBy: { createdAt: "asc" },
      });

      // Active customers (with tickets) - simplified count
      const activeCustomers = users.length;

      res.json({
        summary: {
          totalUsers: users.length,
          totalVerified: users.filter(
            (u) => u.kycRecord?.idVerificationStatus === "VERIFIED"
          ).length,
          activeCustomers,
          kycStats,
        },
        trends: {
          registrationTrend,
        },
        users: users.slice(0, 50), // Limit response
      });
    } catch (error) {
      console.error("Get customer reports error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/reports/draws
// @desc    Get comprehensive draw reports
// @access  Private (DRAW_OFFICER+, SUPER_ADMIN)
router.get(
  "/draws",
  authenticateToken,
  authorizeRoles("DRAW_OFFICER", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, campaignId } = req.query;

      const where: any = {};
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }
      if (campaignId) {
        where.campaignId = campaignId as string;
      }

      const draws = await prisma.draw.findMany({
        where,
        orderBy: { drawTimestamp: "desc" },
      });

      const stateCounts = draws.reduce((acc, draw) => {
        acc[draw.state] = (acc[draw.state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Winners statistics (simplified)
      const totalWinners = draws.length;
      const verifiedWinners = draws.filter((d) => d.state === "COMPLETED").length;

      res.json({
        summary: {
          totalDraws: draws.length,
          stateCounts,
          totalWinners,
          verifiedWinners,
          pendingVerification: totalWinners - verifiedWinners,
        },
        draws: draws.slice(0, 50), // Limit response
      });
    } catch (error) {
      console.error("Get draw reports error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/reports/overview
// @desc    Get platform overview dashboard
// @access  Private (SUPER_ADMIN, LOTTERY_MANAGER)
router.get(
  "/overview",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"),
  async (req: AuthRequest, res: Response) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get key metrics
      const [
        totalUsers,
        activeCampaigns,
        totalTickets,
        totalDraws,
        recentPayments,
        recentTickets,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.lotteryCampaign.count({ where: { status: "ACTIVE" as any } }),
        prisma.ticket.count(),
        prisma.draw.count(),
        prisma.paymentTransaction.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.ticket.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
      ]);

      // Revenue in last 30 days
      const recentRevenue = await prisma.paymentTransaction.aggregate({
        where: {
          status: "SUCCESS",
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      });

      // KYC verification rate
      const verifiedUsers = await prisma.user.count({
        where: {
          kycRecord: {
            idVerificationStatus: "VERIFIED",
          },
        },
      });

      const kycRate = totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0;

      res.json({
        metrics: {
          users: {
            total: totalUsers,
            verified: verifiedUsers,
            kycRate: kycRate.toFixed(2),
          },
          campaigns: {
            active: activeCampaigns,
          },
          tickets: {
            total: totalTickets,
            recent: recentTickets,
          },
          draws: {
            total: totalDraws,
          },
          revenue: {
            recent30Days: recentRevenue._sum.amount || 0,
            recentTransactions: recentPayments,
          },
        },
        period: {
          startDate: thirtyDaysAgo,
          endDate: now,
        },
      });
    } catch (error) {
      console.error("Get overview error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/reports/export
// @desc    Export report data (CSV/JSON)
// @access  Private (ADMIN+)
router.get(
  "/export",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER", "FINANCE_OFFICER"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { type, startDate, endDate, format = "json" } = req.query;

      if (!type) {
        return res.status(400).json({ message: "Report type is required" });
      }

      const where: any = {};
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }

      let data: any[] = [];

      switch (type) {
        case "payments":
          data = await prisma.paymentTransaction.findMany({ where });
          break;
        case "tickets":
          data = await prisma.ticket.findMany({ where });
          break;
        case "users":
          data = await prisma.user.findMany({
            where,
            include: { customerProfile: true },
          });
          break;
        case "draws":
          data = await prisma.draw.findMany({ where });
          break;
        default:
          return res.status(400).json({ message: "Invalid report type" });
      }

      if (format === "csv") {
        // Simple CSV conversion
        const headers = Object.keys(data[0] || {}).join(",");
        const rows = data.map((row) =>
          Object.values(row)
            .map((v) => `"${v}"`)
            .join(",")
        );
        const csv = [headers, ...rows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=${type}_report.csv`);
        res.send(csv);
      } else {
        res.json({ data, type, period: { startDate, endDate } });
      }
    } catch (error) {
      console.error("Export report error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;