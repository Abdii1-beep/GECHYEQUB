import { Router } from "express";
import { authenticateToken, authorizeRoles, requireKYC } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
const router = Router();
const prisma = new PrismaClient();
// Helper function to generate unique ticket ID (ECL-2026-XXXXXX)
const generateTicketId = async () => {
    const year = new Date().getFullYear();
    const prefix = `ECL-${year}`;
    // Find the highest ticket number for this year
    const latestTicket = await prisma.ticket.findFirst({
        where: {
            purchaseId: {
                startsWith: prefix,
            },
        },
        orderBy: {
            purchaseId: 'desc',
        },
    });
    let nextNumber = 1;
    if (latestTicket) {
        const match = latestTicket.purchaseId.match(/ECL-\d{4}-(\d{6})$/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }
    // Format as 6-digit number with leading zeros
    const ticketNumber = String(nextNumber).padStart(6, '0');
    return `${prefix}-${ticketNumber}`;
};
// Helper function to create audit log
const createAuditLog = async (userId, role, action, entity, entityId, req, result, beforeValue, afterValue) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                role,
                action,
                entity,
                entityId,
                ipAddress: req.ip || req.socket.remoteAddress || "unknown",
                userAgent: req.headers["user-agent"] || "unknown",
                requestId: req.requestId || "unknown",
                beforeValue: beforeValue ? beforeValue : undefined,
                afterValue: afterValue ? afterValue : undefined,
                result,
            },
        });
    }
    catch (error) {
        console.error("Failed to create audit log:", error);
    }
};
// @route   POST /api/tickets/purchase
// @desc    Purchase ticket
// @access  Private (verified customers)
router.post("/purchase", authenticateToken, requireKYC, async (req, res) => {
    try {
        const { campaignId, quantity } = req.body;
        if (!campaignId) {
            return res.status(400).json({ message: "Campaign ID required" });
        }
        const qty = quantity || 1;
        if (qty < 1 || qty > 10) {
            return res.status(400).json({ message: "Quantity must be between 1 and 10" });
        }
        // Validate campaign
        const campaign = await prisma.lotteryCampaign.findUnique({
            where: { id: campaignId },
        });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        if (campaign.status !== "PUBLISHED") {
            return res.status(400).json({
                message: "Campaign is not available for ticket purchase",
            });
        }
        // Check if campaign is still active
        const now = new Date();
        if (now < new Date(campaign.startDate)) {
            return res.status(400).json({
                message: "Campaign has not started yet",
            });
        }
        if (now > new Date(campaign.endDate)) {
            return res.status(400).json({
                message: "Campaign has ended",
            });
        }
        // Check ticket limit per customer
        const alreadyPurchased = await prisma.ticket.count({
            where: {
                customerId: req.customerId,
                campaignId,
                status: "PAID",
            },
        });
        if (alreadyPurchased + qty > campaign.maxTickets) {
            return res.status(400).json({
                message: `Maximum tickets per customer exceeded. You have ${alreadyPurchased}, requesting ${qty}, max is ${campaign.maxTickets}`,
            });
        }
        // Check available tickets in campaign
        const totalPaidTickets = await prisma.ticket.count({
            where: {
                campaignId,
                status: "PAID",
            },
        });
        if (totalPaidTickets + qty > campaign.maxTickets) {
            return res.status(400).json({
                message: "Not enough tickets available in this campaign",
            });
        }
        // Create order for payment
        const order = await prisma.order.create({
            data: {
                amount: campaign.ticketPrice * qty,
                currency: "ETB",
                provider: "CBE", // Will be configured per provider
                status: "INITIATED",
            },
        });
        // Create tickets with RESERVED status (will become PAID after payment)
        const tickets = [];
        for (let i = 0; i < qty; i++) {
            const ticketId = await generateTicketId();
            const ticket = await prisma.ticket.create({
                data: {
                    campaignId,
                    customerId: req.customerId,
                    purchaseId: ticketId, // Use the generated ticket ID as purchase ID
                    issueTimestamp: now,
                    status: "RESERVED",
                    verificationHash: crypto.randomBytes(32).toString("hex"),
                    qrCodeToken: crypto.randomBytes(16).toString("hex"),
                },
            });
            tickets.push(ticket);
        }
        await createAuditLog(req.userId, req.role, "PURCHASE_TICKET", "Ticket", tickets[0].id, req, "SUCCESS", null, { tickets, order, campaignId });
        res.status(201).json({
            message: "Ticket purchase initiated",
            tickets,
            order,
            campaign,
        });
    }
    catch (error) {
        console.error("Purchase ticket error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   POST /api/tickets/checkout
// @desc    Direct checkout & instant payment confirmation (Telebirr / CBE / Card)
// @access  Private
router.post("/checkout", authenticateToken, async (req, res) => {
    try {
        const { campaignId, quantity = 1, paymentProvider = "TELEBIRR", phoneNumber } = req.body;
        if (!campaignId) {
            return res.status(400).json({ message: "Campaign ID required" });
        }
        const qty = Number(quantity) || 1;
        if (qty < 1 || qty > 20) {
            return res.status(400).json({ message: "Quantity must be between 1 and 20" });
        }
        // Ensure customer profile
        let customerId = req.customerId;
        if (!customerId && req.userId) {
            let profile = await prisma.customerProfile.findUnique({
                where: { userId: req.userId },
            });
            if (!profile) {
                profile = await prisma.customerProfile.create({
                    data: {
                        userId: req.userId,
                        fullName: req.user?.email.split("@")[0] || "Lottery Participant",
                        phone: phoneNumber || "+251911000000",
                    },
                });
            }
            customerId = profile.id;
        }
        const campaign = await prisma.lotteryCampaign.findUnique({
            where: { id: campaignId },
            include: { vehicles: true },
        });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        if (campaign.status !== "PUBLISHED") {
            return res.status(400).json({
                message: "Campaign is not currently open for ticket purchases online",
            });
        }
        const totalPaid = await prisma.ticket.count({
            where: { campaignId, status: "PAID" },
        });
        if (totalPaid + qty > campaign.maxTickets) {
            return res.status(400).json({
                message: "Not enough tickets available in this campaign",
            });
        }
        const totalAmount = campaign.ticketPrice * qty;
        const now = new Date();
        // Create completed order
        const providerEnum = paymentProvider === "TELEBIRR" ? "BIRR" : "CBE";
        const order = await prisma.order.create({
            data: {
                amount: totalAmount,
                currency: "ETB",
                provider: providerEnum,
                status: "SUCCESS",
                paymentMethod: `${paymentProvider} (${phoneNumber || "Direct"})`,
            },
        });
        // Create paid tickets with drawEligibility = true
        const tickets = [];
        for (let i = 0; i < qty; i++) {
            const ticketNumber = await generateTicketId();
            const verificationHash = crypto
                .createHash("sha256")
                .update(`${ticketNumber}-${campaignId}-${customerId}-${now.getTime()}-${i}`)
                .digest("hex");
            const qrCodeToken = crypto.randomBytes(16).toString("hex");
            const ticket = await prisma.ticket.create({
                data: {
                    campaignId,
                    customerId: customerId,
                    purchaseId: ticketNumber,
                    paymentId: i === 0 ? order.id : `${order.id}-${i}`,
                    issueTimestamp: now,
                    status: "PAID",
                    drawEligibility: true,
                    verificationHash,
                    qrCodeToken,
                },
            });
            tickets.push(ticket);
        }
        // Record audit log
        if (req.userId) {
            await createAuditLog(req.userId, req.role || "CUSTOMER", "CHECKOUT_TICKETS", "Ticket", tickets[0].id, req, "SUCCESS", null, { ticketsCount: tickets.length, orderId: order.id, totalAmount, paymentProvider });
        }
        res.status(201).json({
            success: true,
            message: `Successfully purchased ${qty} ticket${qty > 1 ? "s" : ""}!`,
            tickets,
            order,
            campaign: {
                id: campaign.id,
                name: campaign.name,
                ticketPrice: campaign.ticketPrice,
                drawDate: campaign.drawDate,
                vehicles: campaign.vehicles,
            },
        });
    }
    catch (error) {
        console.error("Checkout error:", error);
        res.status(500).json({ message: "Server error during ticket checkout" });
    }
});
// @route   GET /api/tickets/my
// @desc    Get user's tickets
// @access  Private
router.get("/my", authenticateToken, async (req, res) => {
    try {
        let customerId = req.customerId;
        if (!customerId && req.userId) {
            const profile = await prisma.customerProfile.findUnique({
                where: { userId: req.userId },
            });
            customerId = profile?.id;
        }
        const tickets = await prisma.ticket.findMany({
            where: customerId ? { customerId } : {},
            include: {
                LotteryCampaign: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        description: true,
                        status: true,
                        drawDate: true,
                        ticketPrice: true,
                        maxTickets: true,
                        vehicles: {
                            select: {
                                id: true,
                                make: true,
                                model: true,
                                year: true,
                                color: true,
                                declaredValue: true,
                                vinChassisNumber: true,
                                engineInfo: true,
                                transmission: true,
                                fuelType: true,
                                location: true,
                                images: true,
                            },
                        },
                        draws: {
                            select: {
                                id: true,
                                state: true,
                                drawTimestamp: true,
                            },
                            take: 1,
                            orderBy: { createdAt: "desc" },
                        },
                    },
                },
            },
            orderBy: { issueTimestamp: "desc" },
        });
        res.json({ tickets });
    }
    catch (error) {
        console.error("Get my tickets error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/tickets/:id
// @desc    Get ticket details
// @access  Private (owner or admin)
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const ticket = await prisma.ticket.findUnique({
            where: { id: req.params.id },
            include: {
                LotteryCampaign: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        drawDate: true,
                    },
                },
            },
        });
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }
        // Check authorization - owner or admin
        if (ticket.customerId !== req.customerId) {
            const user = await prisma.user.findUnique({
                where: { id: req.userId },
            });
            const isAdmin = user?.role === "SUPER_ADMIN" ||
                user?.role === "LOTTERY_MANAGER" ||
                user?.role === "AUDITOR";
            if (!isAdmin) {
                return res.status(403).json({
                    message: "Access denied. You are not the owner of this ticket.",
                });
            }
        }
        res.json({ ticket });
    }
    catch (error) {
        console.error("Get ticket error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/tickets/verify/:token
// @desc    Verify ticket via QR token
// @access  Public
router.get("/verify/:token", async (req, res) => {
    try {
        const ticket = await prisma.ticket.findUnique({
            where: { qrCodeToken: req.params.token },
            include: {
                LotteryCampaign: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        drawDate: true,
                    },
                },
            },
        });
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }
        // Return limited information for public verification
        res.json({
            valid: true,
            ticket: {
                purchaseId: ticket.purchaseId,
                status: ticket.status,
                drawEligibility: ticket.drawEligibility,
                campaign: {
                    id: ticket.LotteryCampaign?.id,
                    name: ticket.LotteryCampaign?.name,
                    drawDate: ticket.LotteryCampaign?.drawDate,
                },
            },
        });
    }
    catch (error) {
        console.error("Verify ticket error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/tickets
// @desc    Get all tickets (admin)
// @access  Private (admin only)
router.get("/", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER", "AUDITOR"), async (req, res) => {
    try {
        const { campaignId, status, customerId } = req.query;
        const where = {};
        if (campaignId)
            where.campaignId = campaignId;
        if (status)
            where.status = status;
        if (customerId)
            where.customerId = customerId;
        const tickets = await prisma.ticket.findMany({
            where,
            include: {
                LotteryCampaign: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                    },
                },
            },
            orderBy: { issueTimestamp: "desc" },
            take: 100, // Limit to prevent large responses
        });
        const totalCount = await prisma.ticket.count({ where });
        res.json({
            tickets,
            pagination: {
                total: totalCount,
                limit: 100,
            }
        });
    }
    catch (error) {
        console.error("Get tickets error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   PUT /api/tickets/:id/status
// @desc    Update ticket status (admin only - for payment confirmation)
// @access  Private (admin only)
router.put("/:id/status", authenticateToken, authorizeRoles("SUPER_ADMIN", "FINANCE_OFFICER"), async (req, res) => {
    try {
        const { status, paymentId } = req.body;
        if (!status) {
            return res.status(400).json({ message: "Status required" });
        }
        const ticket = await prisma.ticket.findUnique({
            where: { id: req.params.id },
        });
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }
        const beforeValue = { ...ticket };
        const updateData = { status };
        if (paymentId)
            updateData.paymentId = paymentId;
        // Set draw eligibility when ticket becomes PAID
        if (status === "PAID") {
            updateData.drawEligibility = true;
        }
        const updatedTicket = await prisma.ticket.update({
            where: { id: req.params.id },
            data: updateData,
        });
        await createAuditLog(req.userId, req.role, "UPDATE_TICKET_STATUS", "Ticket", ticket.id, req, "SUCCESS", beforeValue, updatedTicket);
        res.json({
            message: "Ticket status updated successfully",
            ticket: updatedTicket,
        });
    }
    catch (error) {
        console.error("Update ticket status error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
export default router;
