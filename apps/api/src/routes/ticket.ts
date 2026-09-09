import express, { Request, Response } from "express";
import { PrismaClient, Role, TicketStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { smsService } from "../services/sms";
import { emailService } from "../services/email";
import { authenticateToken, requireKYC, authorizeRoles, AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();
const router = express.Router();

// Helper function to generate unique ticket ID (ECL-2026-XXXXXX)
const generateTicketId = async (): Promise<string> => {
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

// Helper function to generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to create audit log
const createAuditLog = async (
  userId: string,
  role: Role,
  action: string,
  entity: string,
  entityId: string,
  req: AuthRequest,
  result: string,
  beforeValue?: any,
  afterValue?: any
) => {
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
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};

// @route   POST /api/tickets/purchase
// @desc    Purchase ticket
// @access  Private (verified customers)
router.post(
  "/purchase",
  authenticateToken,
  requireKYC,
  async (req: AuthRequest, res: Response) => {
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
            customerId: req.customerId!,
            purchaseId: ticketId, // Use the generated ticket ID as purchase ID
            issueTimestamp: now,
            status: "RESERVED",
            verificationHash: crypto.randomBytes(32).toString("hex"),
            qrCodeToken: crypto.randomBytes(16).toString("hex"),
          },
        });
        tickets.push(ticket);
      }

      await createAuditLog(
        req.userId!,
        req.role!,
        "PURCHASE_TICKET",
        "Ticket",
        tickets[0].id,
        req,
        "SUCCESS",
        null,
        { tickets, order, campaignId }
      );

      res.status(201).json({
        message: "Ticket purchase initiated",
        tickets,
        order,
        campaign,
      });
    } catch (error) {
      console.error("Purchase ticket error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/tickets/checkout
// @desc    Direct checkout & instant payment confirmation (Telebirr / CBE / Card)
// @access  Private
router.post(
  "/checkout",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { campaignId, quantity = 1, paymentProvider = "TELEBIRR", phoneNumber, ticketNumbers } = req.body;

      if (!campaignId) {
        return res.status(400).json({ message: "Campaign ID required" });
      }

      // Phone number is now optional since OTP is sent via email
      // Use a default value if not provided for database compatibility
      const finalPhoneNumber = phoneNumber || "+251000000000";

      // Use provided ticket numbers or fall back to quantity-based generation
      let selectedTicketNumbers: string[] = [];
      let qty = Number(quantity) || 1;

      if (ticketNumbers && Array.isArray(ticketNumbers) && ticketNumbers.length > 0) {
        selectedTicketNumbers = ticketNumbers;
        qty = selectedTicketNumbers.length;
      }

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
              phone: finalPhoneNumber,
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

      // If specific ticket numbers are provided, validate they are available
      if (selectedTicketNumbers.length > 0) {
        const existingTickets = await prisma.ticket.findMany({
          where: {
            campaignId,
            purchaseId: { in: selectedTicketNumbers },
          },
          select: { purchaseId: true },
        });

        if (existingTickets.length > 0) {
          const takenNumbers = existingTickets.map(t => t.purchaseId);
          return res.status(400).json({
            message: "Some ticket numbers are already taken",
            takenNumbers,
          });
        }
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

      // Create order with INITIATED status (will be updated after OTP verification)
      const providerEnum = paymentProvider === "TELEBIRR" ? "BIRR" : "CBE";
      const order = await prisma.order.create({
        data: {
          amount: totalAmount,
          currency: "ETB",
          provider: providerEnum,
          status: "INITIATED",
          paymentMethod: `${paymentProvider} (${phoneNumber})`,
          customerId: customerId,
        },
      });

      // Create tickets with RESERVED status (will become PAID after OTP verification)
      const tickets = [];
      for (let i = 0; i < qty; i++) {
        let ticketNumber: string;
        
        if (selectedTicketNumbers.length > 0) {
          ticketNumber = selectedTicketNumbers[i];
        } else {
          ticketNumber = await generateTicketId();
        }
        
        const verificationHash = crypto
          .createHash("sha256")
          .update(`${ticketNumber}-${campaignId}-${customerId}-${now.getTime()}-${i}`)
          .digest("hex");
        const qrCodeToken = crypto.randomBytes(16).toString("hex");

        const ticket = await prisma.ticket.create({
          data: {
            campaignId,
            customerId: customerId!,
            purchaseId: ticketNumber,
            paymentId: i === 0 ? order.id : `${order.id}-${i}`,
            issueTimestamp: now,
            status: "RESERVED",
            drawEligibility: false,
            verificationHash,
            qrCodeToken,
          },
        });
        tickets.push(ticket);
      }

      // Generate and store OTP
      const otp = generateOTP();
      const otpExpiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes expiry

      await prisma.otpVerification.create({
        data: {
          phoneNumber: finalPhoneNumber,
          otp,
          orderId: order.id,
          expiresAt: otpExpiresAt,
        },
      });

      // Send OTP via email only
      const userEmail = req.user?.email;
      if (userEmail && emailService.validateEmail(userEmail)) {
        const emailResult = await emailService.sendOtp(userEmail, otp);
        if (!emailResult.success) {
          console.error('[EMAIL] Failed to send OTP:', emailResult.error);
        } else {
          console.log('[EMAIL] OTP sent to email:', userEmail);
        }
      } else {
        console.error('[EMAIL] No valid user email found for OTP');
      }

      // Record audit log
      if (req.userId) {
        await createAuditLog(
          req.userId,
          req.role || "CUSTOMER",
          "INITIATE_CHECKOUT",
          "Ticket",
          tickets[0].id,
          req,
          "SUCCESS",
          null,
          { ticketsCount: tickets.length, orderId: order.id, totalAmount, paymentProvider, ticketNumbers: selectedTicketNumbers, phoneNumber }
        );
      }

      res.status(201).json({
        success: true,
        message: `OTP sent to ${phoneNumber}. Please verify to complete purchase.`,
        orderId: order.id,
        phoneNumber,
        tickets: tickets.map(t => ({ id: t.id, purchaseId: t.purchaseId })),
        requiresOtp: true,
      });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: "Server error during ticket checkout" });
    }
  }
);

// @route   POST /api/tickets/verify-otp
// @desc    Verify OTP and complete ticket purchase
// @access  Private
router.post(
  "/verify-otp",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { orderId, otp } = req.body;

      if (!orderId || !otp) {
        return res.status(400).json({ message: "Order ID and OTP required" });
      }

      // Find the OTP record
      const otpRecord = await prisma.otpVerification.findUnique({
        where: { orderId },
      });

      if (!otpRecord) {
        return res.status(404).json({ message: "OTP not found or expired" });
      }

      // Check if already verified
      if (otpRecord.verified) {
        return res.status(400).json({ message: "OTP already verified" });
      }

      // Check if expired
      if (new Date() > otpRecord.expiresAt) {
        return res.status(400).json({ message: "OTP has expired" });
      }

      // Verify OTP
      if (otpRecord.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      // Mark OTP as verified
      await prisma.otpVerification.update({
        where: { orderId },
        data: {
          verified: true,
          verifiedAt: new Date(),
        },
      });

      // Get the order and associated tickets
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
        },
      });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Update order status to SUCCESS
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "SUCCESS" },
      });

      // Update tickets from RESERVED to PAID
      const tickets = await prisma.ticket.findMany({
        where: { paymentId: { startsWith: orderId } },
      });

      for (const ticket of tickets) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "PAID",
            drawEligibility: true,
          },
        });
      }

      // Get campaign details for response
      const campaign = await prisma.lotteryCampaign.findUnique({
        where: { id: tickets[0].campaignId },
        include: { vehicles: true },
      });

      // Send payment receipt to customer
      if (req.user?.email && emailService.validateEmail(req.user.email)) {
        const receiptData = {
          orderId: order.id,
          customerName: order.customer?.fullName || req.user.email.split('@')[0],
          customerEmail: req.user.email,
          campaignName: campaign?.name || 'Unknown Campaign',
          tickets: tickets.map(t => ({
            purchaseId: t.purchaseId,
            vehicleName: campaign?.vehicles.find(v => v.id === t.campaignId)?.make + ' ' + campaign?.vehicles.find(v => v.id === t.campaignId)?.model || 'Unknown Vehicle',
            price: campaign?.ticketPrice || 0,
          })),
          totalAmount: order.amount,
          paymentMethod: order.paymentMethod || order.provider,
          purchaseDate: order.createdAt,
        };
        
        const receiptResult = await emailService.sendReceipt(receiptData);
        if (receiptResult.success) {
          console.log('[EMAIL] Receipt sent to customer:', req.user.email);
        } else {
          console.error('[EMAIL] Failed to send receipt:', receiptResult.error);
        }

        // Send receipt to admin
        const adminEmail = process.env.ADMIN_EMAIL || req.user.email;
        const adminReceiptResult = await emailService.sendReceiptToAdmin(receiptData, adminEmail);
        if (adminReceiptResult.success) {
          console.log('[EMAIL] Receipt sent to admin:', adminEmail);
        } else {
          console.error('[EMAIL] Failed to send receipt to admin:', adminReceiptResult.error);
        }
      }

      // Record audit log
      if (req.userId) {
        await createAuditLog(
          req.userId,
          req.role || "CUSTOMER",
          "VERIFY_OTP_COMPLETE_PURCHASE",
          "Ticket",
          tickets[0].id,
          req,
          "SUCCESS",
          null,
          { orderId, ticketsCount: tickets.length }
        );
      }

      res.status(200).json({
        success: true,
        message: "Purchase completed successfully!",
        tickets,
        order,
        campaign: campaign ? {
          id: campaign.id,
          name: campaign.name,
          ticketPrice: campaign.ticketPrice,
          drawDate: campaign.drawDate,
          vehicles: campaign.vehicles,
        } : null,
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ message: "Server error during OTP verification" });
    }
  }
);

// @route   POST /api/tickets/resend-otp
// @desc    Resend OTP for a pending order
// @access  Private
router.post(
  "/resend-otp",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ message: "Order ID required" });
      }

      // Check if order exists and is still INITIATED
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.status !== "INITIATED") {
        return res.status(400).json({ message: "Order is not pending verification" });
      }

      // Generate new OTP
      const newOtp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      // Update or create OTP record
      const existingOtp = await prisma.otpVerification.findUnique({
        where: { orderId },
      });

      if (existingOtp) {
        await prisma.otpVerification.update({
          where: { orderId },
          data: {
            otp: newOtp,
            expiresAt: otpExpiresAt,
            verified: false,
            verifiedAt: null,
          },
        });
      } else {
        await prisma.otpVerification.create({
          data: {
            phoneNumber: order.paymentMethod?.match(/\(([^)]+)\)/)?.[1] || "+2510000000",
            otp: newOtp,
            orderId,
            expiresAt: otpExpiresAt,
          },
        });
      }

      // Send new OTP via email only
      if (req.user?.email && emailService.validateEmail(req.user.email)) {
        const emailResult = await emailService.sendOtp(req.user.email, newOtp);
        if (!emailResult.success) {
          console.error('[EMAIL] Failed to resend OTP:', emailResult.error);
        } else {
          console.log('[EMAIL] OTP resent to email:', req.user.email);
        }
      } else {
        console.error('[EMAIL] No valid user email found for OTP resend');
      }

      res.status(200).json({
        success: true,
        message: "New OTP sent successfully",
      });
    } catch (error) {
      console.error("Resend OTP error:", error);
      res.status(500).json({ message: "Server error during OTP resend" });
    }
  }
);

// @route   GET /api/tickets/my
// @desc    Get user's tickets
// @access  Private
router.get("/my", authenticateToken, async (req: AuthRequest, res: Response) => {
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
  } catch (error) {
    console.error("Get my tickets error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/tickets/:id
// @desc    Get ticket details
// @access  Private (owner or admin)
router.get("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
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
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/tickets/verify/:token
// @desc    Verify ticket via QR token
// @access  Public
router.get("/verify/:token", async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error("Verify ticket error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/tickets/available/:campaignId
// @desc    Get available ticket numbers for a campaign
// @access  Public
router.get("/available/:campaignId", async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    const campaign = await prisma.lotteryCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // Get all taken ticket numbers for this campaign
    const takenTickets = await prisma.ticket.findMany({
      where: { campaignId },
      select: { purchaseId: true },
    });

    const takenNumbers = new Set(takenTickets.map(t => t.purchaseId));

    // Generate all possible ticket numbers for the campaign
    const year = new Date().getFullYear();
    const prefix = `ECL-${year}`;
    const availableNumbers: string[] = [];

    for (let i = 1; i <= campaign.maxTickets; i++) {
      const ticketNumber = String(i).padStart(6, '0');
      const fullTicketId = `${prefix}-${ticketNumber}`;
      
      if (!takenNumbers.has(fullTicketId)) {
        availableNumbers.push(fullTicketId);
      }
    }

    res.json({
      availableNumbers,
      totalAvailable: availableNumbers.length,
      maxTickets: campaign.maxTickets,
    });
  } catch (error) {
    console.error("Get available tickets error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/tickets
// @desc    Get all tickets (admin)
// @access  Private (admin only)
router.get(
  "/",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER", "AUDITOR"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { campaignId, status, customerId } = req.query;
      
      const where: any = {};
      if (campaignId) where.campaignId = campaignId as string;
      if (status) where.status = status as TicketStatus;
      if (customerId) where.customerId = customerId as string;

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
    } catch (error) {
      console.error("Get tickets error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/tickets/:id/status
// @desc    Update ticket status (admin only - for payment confirmation)
// @access  Private (admin only)
router.put(
  "/:id/status",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN", "FINANCE_OFFICER"),
  async (req: AuthRequest, res: Response) => {
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

      const updateData: any = { status };
      if (paymentId) updateData.paymentId = paymentId;
      
      // Set draw eligibility when ticket becomes PAID
      if (status === "PAID") {
        updateData.drawEligibility = true;
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: req.params.id },
        data: updateData,
      });

      await createAuditLog(
        req.userId!,
        req.role!,
        "UPDATE_TICKET_STATUS",
        "Ticket",
        ticket.id,
        req,
        "SUCCESS",
        beforeValue,
        updatedTicket
      );

      res.json({
        message: "Ticket status updated successfully",
        ticket: updatedTicket,
      });
    } catch (error) {
      console.error("Update ticket status error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;