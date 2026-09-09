import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
const router = Router();
const prisma = new PrismaClient();
// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private (SUPER_ADMIN+, LOTTERY_MANAGER+)
router.get("/dashboard", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"), async (req, res) => {
    try {
        const now = new Date();
        // Get key metrics
        const [totalCampaigns, activeCampaigns, totalTickets, paidTickets, pendingPayments, totalRevenue, prizeCount, upcomingDraws, winnersCount, kycNotVerified, suspiciousActivities, systemNotifications,] = await Promise.all([
            // Total campaigns
            prisma.lotteryCampaign.count(),
            // Active campaigns
            prisma.lotteryCampaign.count({
                where: { status: "PUBLISHED" },
            }),
            // Total tickets
            prisma.ticket.count(),
            // Paid tickets
            prisma.ticket.count({ where: { status: "PAID" } }),
            // Pending payments
            prisma.order.count({ where: { status: "PENDING" } }),
            // Paid tickets with price for revenue
            prisma.ticket.findMany({
                where: { status: "PAID" },
                include: { LotteryCampaign: { select: { ticketPrice: true } } },
            }),
            // Prize count (vehicles with status AWARDED)
            prisma.vehicle.count({ where: { status: "AWARDED" } }),
            // Upcoming draws (scheduled)
            prisma.draw.count({
                where: {
                    state: "SCHEDULED",
                    drawTimestamp: { gte: now },
                },
            }),
            // Winners count
            prisma.winner.count({ where: { claimStatus: "CLAIMED" } }),
            // KYC not verified
            prisma.kycRecord.count({ where: { idVerificationStatus: "PENDING" } }),
            // Suspicious activities
            prisma.fraudAlert.count({ where: { status: "OPEN" } }),
            // System notifications (unread)
            prisma.notification.count({ where: { read: false } }),
        ]);
        const calculatedRevenue = totalRevenue.reduce((sum, ticket) => sum + (ticket.LotteryCampaign?.ticketPrice || 0), 0);
        res.json({
            metrics: {
                totalCampaigns,
                activeCampaigns,
                totalTickets,
                paidTickets,
                pendingPayments,
                totalRevenue: calculatedRevenue,
                prizeCount,
                upcomingDraws,
                winnersCount,
                kycNotVerified,
                suspiciousActivities,
                systemNotifications,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/admin/stats
// @desc    Get detailed statistics
// @access  Private (SUPER_ADMIN+, LOTTERY_MANAGER+)
router.get("/stats", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"), async (req, res) => {
    try {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        // Campaign stats
        const campaignsByStatus = await prisma.lotteryCampaign.groupBy({
            by: ["status"],
            _count: true,
        });
        // Ticket stats
        const ticketsByStatus = await prisma.ticket.groupBy({
            by: ["status"],
            _count: true,
        });
        // Payment stats
        const paymentsByStatus = await prisma.paymentTransaction.groupBy({
            by: ["status"],
            _count: true,
        });
        // KYC stats
        const kycByStatus = await prisma.kycRecord.groupBy({
            by: ["idVerificationStatus"],
            _count: true,
        });
        // Draw stats
        const drawsByState = await prisma.draw.groupBy({
            by: ["state"],
            _count: true,
        });
        // Revenue calculation (last year)
        const revenueData = await prisma.ticket.findMany({
            where: {
                status: "PAID",
                issueTimestamp: { gte: startOfYear },
            },
            include: { LotteryCampaign: { select: { ticketPrice: true } } },
        });
        const totalRevenue = revenueData.reduce((sum, ticket) => sum + (ticket.LotteryCampaign?.ticketPrice || 0), 0);
        // Top campaigns by tickets sold
        const topCampaigns = await prisma.lotteryCampaign.findMany({
            where: { status: "PUBLISHED" },
            include: {
                tickets: {
                    where: { status: "PAID" },
                    select: { id: true },
                },
            },
            take: 10,
            orderBy: {
                tickets: {
                    _count: "desc",
                },
            },
        });
        res.json({
            campaignsByStatus,
            ticketsByStatus,
            paymentsByStatus,
            kycByStatus,
            drawsByState,
            totalRevenue,
            topCampaigns,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/admin/kyc-queue
// @desc    Get KYC verification queue
// @access  Private (KYC_OFFICER+, SUPER_ADMIN)
router.get("/kyc-queue", authenticateToken, authorizeRoles("KYC_OFFICER", "SUPER_ADMIN", "LOTTERY_MANAGER"), async (req, res) => {
    try {
        const kycQueue = await prisma.kycRecord.findMany({
            where: {
                idVerificationStatus: "PENDING",
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });
        res.json({ kycQueue });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
// @route   POST /api/admin/campaigns/:id/publish
// @desc    Publish campaign
// @access  Private (LOTTERY_MANAGER+, SUPER_ADMIN)
router.post("/campaigns/:id/publish", authenticateToken, authorizeRoles("LOTTERY_MANAGER", "SUPER_ADMIN"), async (req, res) => {
    try {
        const campaign = await prisma.lotteryCampaign.update({
            where: { id: req.params.id },
            data: {
                status: "PUBLISHED",
                publishedAt: new Date(),
                publishedBy: req.userId,
            },
        });
        // Record audit log
        await prisma.auditLog.create({
            data: {
                userId: req.userId,
                role: req.role || "LOTTERY_MANAGER",
                action: "CAMPAIGN_PUBLISHED",
                entity: "lottery_campaign",
                entityId: campaign.id,
                timestamp: new Date(),
                ipAddress: req.ip,
                userAgent: req.get("User-Agent"),
                requestId: require("crypto").randomBytes(16).toString("hex"),
                beforeValue: {
                    status: "DRAFT",
                },
                afterValue: {
                    status: "PUBLISHED",
                },
                result: "SUCCESS",
            },
        });
        res.json({
            message: "Campaign published successfully",
            campaign,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
// @route   POST /api/admin/campaigns/:id/cancel
// @desc    Cancel campaign
// @access  Private (LOTTERY_MANAGER+, SUPER_ADMIN)
router.post("/campaigns/:id/cancel", authenticateToken, authorizeRoles("LOTTERY_MANAGER", "SUPER_ADMIN"), async (req, res) => {
    try {
        const campaign = await prisma.lotteryCampaign.findUnique({
            where: { id: req.params.id },
        });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        // Check if tickets have been sold
        const paidTickets = await prisma.ticket.count({
            where: {
                campaignId: campaign.id,
                status: "PAID",
            },
        });
        if (paidTickets > 0) {
            return res.status(400).json({
                message: "Cannot cancel campaign: paid tickets exist",
            });
        }
        const cancelledCampaign = await prisma.lotteryCampaign.update({
            where: { id: req.params.id },
            data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancelledBy: req.userId,
            },
        });
        // Record audit log
        await prisma.auditLog.create({
            data: {
                userId: req.userId,
                role: req.role || "LOTTERY_MANAGER",
                action: "CAMPAIGN_CANCELLED",
                entity: "lottery_campaign",
                entityId: campaign.id,
                timestamp: new Date(),
                ipAddress: req.ip,
                userAgent: req.get("User-Agent"),
                requestId: require("crypto").randomBytes(16).toString("hex"),
                beforeValue: { status: "PUBLISHED" },
                afterValue: { status: "CANCELLED" },
                result: "SUCCESS",
            },
        });
        res.json({
            message: "Campaign cancelled successfully",
            campaign: cancelledCampaign,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/admin/audit-logs/export
// @desc    Export audit logs
// @access  Private (AUDITOR+, SUPER_ADMIN)
router.get("/audit-logs/export", authenticateToken, authorizeRoles("AUDITOR", "SUPER_ADMIN"), async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { timestamp: "desc" },
        });
        // Format for export
        const exportData = logs.map((log) => ({
            id: log.id,
            userId: log.userId,
            role: log.role,
            action: log.action,
            entity: log.entity,
            entityId: log.entityId,
            timestamp: log.timestamp.toISOString(),
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            requestId: log.requestId,
            beforeValue: log.beforeValue,
            afterValue: log.afterValue,
            result: log.result,
        }));
        res.json({ exportData });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/admin/users
// @desc    Get all users and customer accounts
// @access  Private (SUPER_ADMIN, LOTTERY_MANAGER, AUDITOR)
router.get("/users", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER", "AUDITOR"), async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                customerProfile: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        address: true,
                        _count: {
                            select: { tickets: true }
                        }
                    }
                },
                kycRecord: {
                    select: {
                        idVerificationStatus: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });
        const formattedUsers = users.map(u => ({
            ...u,
            customerProfile: u.customerProfile ? {
                ...u.customerProfile,
                kycStatus: u.kycRecord?.idVerificationStatus || 'NOT_SUBMITTED'
            } : null
        }));
        res.json({ users: formattedUsers });
    }
    catch (error) {
        console.error("Get admin users error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/admin/payments
// @desc    Get all payment transactions and orders
// @access  Private (SUPER_ADMIN, LOTTERY_MANAGER, FINANCE_OFFICER)
router.get("/payments", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER", "FINANCE_OFFICER"), async (req, res) => {
    try {
        const payments = await prisma.paymentTransaction.findMany({
            include: {
                order: {
                    include: {
                        customer: { select: { id: true, fullName: true, phone: true } },
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        const orders = await prisma.order.findMany({
            include: {
                customer: { select: { id: true, fullName: true, phone: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        res.json({ payments, orders });
    }
    catch (error) {
        console.error("Get admin payments error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// Platform in-memory settings state with standard Ethiopian vehicle equb parameters
let systemSettings = {
    platformName: "GECHO YEMKINA EQUB",
    systemDescription: "Official Ethiopian Commercial Truck & Vehicle Digital Equb Platform",
    currency: "ETB",
    vatPercentage: 15,
    minTicketPrice: 50,
    maxTicketsPerPurchase: 100,
    supportPhone: "+251 11 551 2233",
    supportEmail: "support@gechoyemkinaequb.com",
    telebirrMerchantId: "TELEBIRR-ET-884920",
    cbeMerchantId: "CBE-BIRR-100293",
    chapaEnabled: true,
    autoDrawCountdownSeconds: 6,
    maintenanceMode: false,
};
// @route   GET /api/admin/settings
// @desc    Get platform settings
// @access  Private (SUPER_ADMIN, LOTTERY_MANAGER)
router.get("/settings", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"), async (req, res) => {
    res.json({ settings: systemSettings });
});
// @route   PUT /api/admin/settings
// @desc    Update platform settings
// @access  Private (SUPER_ADMIN)
router.put("/settings", authenticateToken, authorizeRoles("SUPER_ADMIN"), async (req, res) => {
    try {
        systemSettings = {
            ...systemSettings,
            ...req.body,
        };
        await prisma.auditLog.create({
            data: {
                userId: req.userId,
                role: req.role || "SUPER_ADMIN",
                action: "UPDATE_SYSTEM_SETTINGS",
                entity: "SystemSettings",
                entityId: "global",
                ipAddress: req.ip || "unknown",
                userAgent: req.headers["user-agent"] || "unknown",
                requestId: req.requestId || "req-settings",
                result: "SUCCESS",
                afterValue: systemSettings,
            },
        });
        res.json({ message: "Settings updated successfully", settings: systemSettings });
    }
    catch (error) {
        console.error("Update settings error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
export default router;
