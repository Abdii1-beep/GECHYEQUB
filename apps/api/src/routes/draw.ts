import { Router, Request, Response } from "express";
import { authenticateToken, authorizeRoles, AuthRequest } from "../middleware/auth";
import { PrismaClient, Role } from "@prisma/client";
import { SecureDrawEngine } from "../services/draw/SecureDrawEngine";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const router = Router();
const prisma = new PrismaClient();

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

// @route   POST /api/draws/prepare
// @desc    Prepare draw - lock campaign and generate commitment hash
// @access  Private (DRAW_OFFICER+)
router.post(
  "/prepare",
  authenticateToken,
  authorizeRoles("DRAW_OFFICER", "SUPER_ADMIN", "LOTTERY_MANAGER"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { campaignId } = req.body;

      if (!campaignId) {
        return res.status(400).json({ message: "Campaign ID required" });
      }

      const result = await SecureDrawEngine.prepareDraw(
        campaignId,
        req.userId!
      );

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      await createAuditLog(
        req.userId!,
        req.role!,
        "PREPARE_DRAW",
        "Draw",
        result.drawId!,
        req,
        "SUCCESS",
        { campaignId },
        { drawId: result.drawId, commitmentHash: result.commitmentHash }
      );

      res.json({
        message: "Draw prepared successfully",
        drawId: result.drawId,
        commitmentHash: result.commitmentHash,
        eligibleTicketCount: result.eligibleTicketCount,
      });
    } catch (error) {
      console.error("Prepare draw error:", error);
      res.status(500).json({ message: "Server error during draw preparation" });
    }
  }
);

// @route   POST /api/draws/execute
// @desc    Execute draw - perform secure random selection
// @access  Private (DRAW_OFFICER+)
router.post(
  "/execute",
  authenticateToken,
  authorizeRoles("DRAW_OFFICER", "SUPER_ADMIN", "LOTTERY_MANAGER"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { drawId } = req.body;

      if (!drawId) {
        return res.status(400).json({ message: "Draw ID required" });
      }

      const result = await SecureDrawEngine.executeDraw(drawId, req.userId!);

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      await createAuditLog(
        req.userId!,
        req.role!,
        "EXECUTE_DRAW",
        "Draw",
        drawId,
        req,
        "SUCCESS",
        { state: "PREPARED" },
        { state: "COMPLETED", results: result.results }
      );

      res.json({
        message: "Draw executed successfully",
        results: result.results,
      });
    } catch (error) {
      console.error("Execute draw error:", error);
      res.status(500).json({ message: "Server error during draw execution" });
    }
  }
);

// @route   POST /api/draws/verify
// @desc    Verify draw integrity
// @access  Private (AUDITOR+ or DRAW_OFFICER+)
router.post(
  "/verify",
  authenticateToken,
  authorizeRoles("AUDITOR", "SUPER_ADMIN", "DRAW_OFFICER", "LOTTERY_MANAGER"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { drawId } = req.body;

      if (!drawId) {
        return res.status(400).json({ message: "Draw ID required" });
      }

      const result = await SecureDrawEngine.verifyDraw(drawId);

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      await createAuditLog(
        req.userId!,
        req.role!,
        "VERIFY_DRAW",
        "Draw",
        drawId,
        req,
        result.isValid ? "SUCCESS" : "FAILED",
        {},
        { isValid: result.isValid, details: result.details }
      );

      res.json({
        message: result.message,
        isValid: result.isValid,
        details: result.details,
      });
    } catch (error) {
      console.error("Verify draw error:", error);
      res.status(500).json({ message: "Server error during draw verification" });
    }
  }
);

// @route   GET /api/draws/:id/transparency
// @desc    Get draw transparency data for public viewing
// @access  Public
router.get("/:id/transparency", async (req: Request, res: Response) => {
  try {
    const result = await SecureDrawEngine.getTransparencyData(req.params.id);

    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }

    res.json(result.data);
  } catch (error) {
    console.error("Get transparency data error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/draws/:id
// @desc    Get draw details
// @access  Private
router.get("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const draw = await prisma.draw.findUnique({
      where: { id: req.params.id },
      include: {
        LotteryCampaign: {
          select: { id: true, name: true, status: true },
        },
        eligibleTickets: {
          include: {
            ticket: {
              select: {
                id: true,
                purchaseId: true,
                status: true,
              },
            },
          },
        },
        results: true,
      },
    });

    if (!draw) {
      return res.status(404).json({ message: "Draw not found" });
    }

    res.json({ draw });
  } catch (error) {
    console.error("Get draw error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/draws/campaign/:campaignId
// @desc    Get draws for campaign
// @access  Private
router.get("/campaign/:campaignId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const draws = await prisma.draw.findMany({
      where: { campaignId: req.params.campaignId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ draws });
  } catch (error) {
    console.error("Get campaign draws error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/draws
// @desc    Get all draws (admin)
// @access  Private (DRAW_OFFICER+)
router.get(
  "/",
  authenticateToken,
  authorizeRoles("DRAW_OFFICER", "SUPER_ADMIN", "LOTTERY_MANAGER", "AUDITOR"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { state, limit = 20, offset = 0 } = req.query;

      const where: any = {};
      if (state) {
        where.state = state as string;
      }

      const draws = await prisma.draw.findMany({
        where,
        include: {
          LotteryCampaign: {
            select: { id: true, name: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: Number(offset),
      });

      const total = await prisma.draw.count({ where });

      res.json({ draws, total, limit, offset });
    } catch (error) {
      console.error("Get all draws error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// =======================================================
// LIVE DRAW & REAL-TIME LOTTERY CHANCE ENGINE
// =======================================================

interface LiveDrawSession {
  phase: "SCHEDULED" | "COUNTDOWN" | "SPINNING" | "COMPLETED";
  scheduledDate?: string;
  spinStartedAt?: number;
  countdownSeconds?: number;
  winner?: {
    ticketId: string;
    ticketNumber: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    vehicleName: string;
    vehicleColor?: string;
    vehicleVin?: string;
    vehiclePrice?: number;
    drawHash?: string;
    drawnAt?: string;
  };
}

const liveSessions = new Map<string, LiveDrawSession>();

// Helper to extract optional user from token
const extractOptionalUser = (req: Request): { id: string; role?: string; customerId?: string } | null => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return null;
    const decoded = (jwt.verify(token, process.env.JWT_SECRET || "ethiopian_lottery_jwt_secret_2026_secure_key") as any);
    return decoded ? { id: decoded.id, role: decoded.role, customerId: decoded.customerId } : null;
  } catch {
    return null;
  }
};

// @route   GET /api/draws/live/:campaignId
// @desc    Get real-time live draw state, vehicle info, and user's winning chance
// @access  Public (Enhanced if authenticated)
router.get("/live/:campaignId", async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    const campaign = await prisma.lotteryCampaign.findUnique({
      where: { id: campaignId },
      include: {
        vehicles: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            color: true,
            declaredValue: true,
            images: true,
            engineInfo: true,
            transmission: true,
            fuelType: true,
            vehicleCondition: true,
            status: true,
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // Get total paid & eligible tickets
    const totalPaidTickets = await prisma.ticket.count({
      where: { campaignId, status: "PAID" },
    });

    // Get or check existing DB draw
    const existingDbDraw = await prisma.draw.findFirst({
      where: { campaignId },
      include: {
        results: {
          include: {
            ticket: {
              include: { customer: true },
            },
            vehicle: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let session = liveSessions.get(campaignId);
    if (!session) {
      // Initialize from DB
      if (existingDbDraw && existingDbDraw.state === "COMPLETED" && existingDbDraw.results.length > 0) {
        const topResult = existingDbDraw.results[0];
        const cust = topResult.ticket.customer;
        const veh = topResult.vehicle;
        session = {
          phase: "COMPLETED",
          scheduledDate: campaign.drawDate ? campaign.drawDate.toISOString() : undefined,
          winner: {
            ticketId: topResult.ticketId,
            ticketNumber: topResult.ticket.purchaseId,
            customerName: cust?.fullName || "Verified Participant",
            customerPhone: cust?.phone || "+251 91 123 4567",
            customerEmail: cust?.email || "winner@ethiolottery.com",
            customerAddress: cust?.address || "Addis Ababa, Ethiopia",
            vehicleName: veh ? `${veh.year} ${veh.make} ${veh.model}` : "Grand Prize Vehicle",
            vehicleColor: veh?.color,
            vehicleVin: veh?.vinChassisNumber,
            vehiclePrice: veh?.declaredValue || 0,
            drawHash: topResult.drawHash,
            drawnAt: topResult.verifiedAt ? topResult.verifiedAt.toISOString() : undefined,
          },
        };
      } else {
        session = {
          phase: campaign.drawDate && new Date(campaign.drawDate) > new Date() ? "SCHEDULED" : "SCHEDULED",
          scheduledDate: campaign.drawDate ? campaign.drawDate.toISOString() : undefined,
        };
      }
      liveSessions.set(campaignId, session);
    }

    // If spinning phase has elapsed (9.0s), transition session to COMPLETED
    if (session && session.phase === "SPINNING" && session.spinStartedAt) {
      const elapsed = Date.now() - session.spinStartedAt;
      if (elapsed >= 9000) {
        session.phase = "COMPLETED";
      }
    }

    // Check if user is authenticated to calculate their specific chance and access permission
    let userChance = {
      ticketCount: 0,
      tickets: [] as string[],
      percentage: 0,
      hasParticipated: false,
      isAdmin: false,
      isAuthenticated: false,
    };

    const optionalUser = extractOptionalUser(req);
    if (optionalUser?.id) {
      userChance.isAuthenticated = true;
      const isAdminRole = ["SUPER_ADMIN", "LOTTERY_MANAGER", "DRAW_OFFICER"].includes(optionalUser.role || "");
      userChance.isAdmin = isAdminRole;

      const user = await prisma.user.findUnique({
        where: { id: optionalUser.id },
        include: { customerProfile: true },
      });

      const customerId = user?.customerProfileId || user?.customerProfile?.id;

      if (customerId) {
        const userTickets = await prisma.ticket.findMany({
          where: {
            campaignId,
            customerId,
            status: "PAID",
          },
          select: { purchaseId: true },
        });

        const count = userTickets.length;
        userChance.ticketCount = count;
        userChance.tickets = userTickets.map((t) => t.purchaseId);
        userChance.percentage = totalPaidTickets > 0 ? Number(((count / totalPaidTickets) * 100).toFixed(2)) : 0;
        userChance.hasParticipated = count > 0;
      }
    }

    // Fetch all paid tickets for this campaign with customer details for the live lottery numbers pool
    const campaignTickets = await prisma.ticket.findMany({
      where: { campaignId, status: "PAID" },
      select: {
        id: true,
        purchaseId: true,
        createdAt: true,
        verificationHash: true,
        customerId: true,
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            address: true,
          },
        },
      },
      orderBy: { purchaseId: "asc" },
      take: 2000,
    });

    res.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        ticketPrice: campaign.ticketPrice,
        maxTickets: campaign.maxTickets,
        drawDate: campaign.drawDate,
        vehicles: campaign.vehicles,
      },
      stats: {
        totalPaidTickets,
        remainingTickets: Math.max(0, campaign.maxTickets - totalPaidTickets),
        percentSold: Math.min(100, Number(((totalPaidTickets / campaign.maxTickets) * 100).toFixed(1))),
      },
      liveState: session,
      userChance,
      tickets: campaignTickets,
    });
  } catch (error) {
    console.error("Get live draw error:", error);
    res.status(500).json({ message: "Server error fetching live draw state" });
  }
});

// @route   POST /api/draws/live/schedule
// @desc    Admin schedules the live draw date and time
// @access  Private (SUPER_ADMIN, LOTTERY_MANAGER, DRAW_OFFICER)
router.post(
  "/live/schedule",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER", "DRAW_OFFICER"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { campaignId, scheduledDate } = req.body;

      if (!campaignId || !scheduledDate) {
        return res.status(400).json({ message: "campaignId and scheduledDate are required" });
      }

      const date = new Date(scheduledDate);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid scheduled date/time format" });
      }

      // Update campaign
      const updatedCampaign = await prisma.lotteryCampaign.update({
        where: { id: campaignId },
        data: { drawDate: date },
      });

      // Update or create live session
      let session = liveSessions.get(campaignId) || { phase: "SCHEDULED" };
      session.phase = "SCHEDULED";
      session.scheduledDate = date.toISOString();
      liveSessions.set(campaignId, session);

      await createAuditLog(
        req.userId!,
        req.role!,
        "SCHEDULE_LIVE_DRAW",
        "LotteryCampaign",
        campaignId,
        req,
        "SUCCESS",
        null,
        { scheduledDate: date.toISOString() }
      );

      res.json({
        message: "Live draw scheduled successfully",
        campaign: updatedCampaign,
        liveState: session,
      });
    } catch (error) {
      console.error("Schedule live draw error:", error);
      res.status(500).json({ message: "Server error scheduling live draw" });
    }
  }
);

// @route   POST /api/draws/live/spin
// @desc    Admin launches the live lottery spin
// @access  Private (SUPER_ADMIN, LOTTERY_MANAGER, DRAW_OFFICER)
router.post(
  "/live/spin",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER", "DRAW_OFFICER"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { campaignId } = req.body;

      if (!campaignId) {
        return res.status(400).json({ message: "Campaign ID is required" });
      }

      const campaign = await prisma.lotteryCampaign.findUnique({
        where: { id: campaignId },
        include: { vehicles: true },
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Ensure campaign is published
      if (campaign.status === "DRAFT") {
        await prisma.lotteryCampaign.update({
          where: { id: campaignId },
          data: { status: "PUBLISHED" },
        });
      }

      // Fetch eligible paid tickets
      const paidTickets = await prisma.ticket.findMany({
        where: { campaignId, status: "PAID" },
        include: { customer: true },
      });

      if (paidTickets.length === 0) {
        return res.status(400).json({
          message: "Cannot spin: No paid tickets have been bought for this car lottery yet!",
        });
      }

      // Prepare draw if not already prepared
      let draw = await prisma.draw.findFirst({
        where: { campaignId },
      });

      if (!draw) {
        const prepResult = await SecureDrawEngine.prepareDraw(campaignId, req.userId!);
        if (prepResult.success && prepResult.drawId) {
          draw = await prisma.draw.findUnique({ where: { id: prepResult.drawId } });
        }
      }

      let winnerInfo: any = null;

      if (draw && draw.state === "PREPARED") {
        const execResult = await SecureDrawEngine.executeDraw(draw.id, req.userId!);
        if (execResult.success && execResult.results && execResult.results.length > 0) {
          const firstWinner = execResult.results[0];
          const fullTicket = paidTickets.find((t) => t.id === firstWinner.ticketId);
          const vehicle = campaign.vehicles.find((v) => v.id === firstWinner.vehicleId) || campaign.vehicles[0];
          const cust = fullTicket?.customer;

          winnerInfo = {
            ticketId: firstWinner.ticketId,
            ticketNumber: fullTicket?.purchaseId || firstWinner.ticketId,
            customerName: cust?.fullName || firstWinner.customerName || "Lucky Participant",
            customerPhone: cust?.phone || "+251 91 123 4567",
            customerEmail: cust?.email || "winner@ethiolottery.com",
            customerAddress: cust?.address || "Addis Ababa, Ethiopia",
            vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Grand Prize Vehicle",
            vehicleColor: vehicle?.color,
            vehicleVin: vehicle?.vinChassisNumber,
            vehiclePrice: vehicle?.declaredValue || 0,
            drawHash: crypto.randomBytes(32).toString("hex"),
            drawnAt: new Date().toISOString(),
          };
        }
      }

      // If draw was already completed or fallback selection
      if (!winnerInfo) {
        const randomIndex = crypto.randomInt(0, paidTickets.length);
        const selected = paidTickets[randomIndex];
        const vehicle = campaign.vehicles[0];
        const cust = selected.customer;

        winnerInfo = {
          ticketId: selected.id,
          ticketNumber: selected.purchaseId,
          customerName: cust?.fullName || "Lucky Participant",
          customerPhone: cust?.phone || "+251 91 123 4567",
          customerEmail: cust?.email || "winner@ethiolottery.com",
          customerAddress: cust?.address || "Addis Ababa, Ethiopia",
          vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Grand Prize Vehicle",
          vehicleColor: vehicle?.color,
          vehicleVin: vehicle?.vinChassisNumber,
          vehiclePrice: vehicle?.declaredValue || 0,
          drawHash: crypto.randomBytes(32).toString("hex"),
          drawnAt: new Date().toISOString(),
        };

        // Create or update Winner registry record
        if (selected.customerId && draw?.id) {
          await prisma.winner.upsert({
            where: { ticketId: selected.id },
            create: {
              drawId: draw.id,
              ticketId: selected.id,
              customerId: selected.customerId,
              vehicleId: vehicle?.id || null,
              verificationStatus: "VERIFIED",
              claimStatus: "CLAIMED",
              verificationTimestamp: new Date(),
            },
            update: {
              verificationStatus: "VERIFIED",
              claimStatus: "CLAIMED",
            },
          }).catch(() => {});
        }
      }

      // Set live session to SPINNING
      const now = Date.now();
      const session: LiveDrawSession = {
        phase: "SPINNING",
        spinStartedAt: now,
        countdownSeconds: 5,
        winner: winnerInfo,
      };

      liveSessions.set(campaignId, session);

      await createAuditLog(
        req.userId!,
        req.role!,
        "START_LIVE_SPIN",
        "Draw",
        draw?.id || campaignId,
        req,
        "SUCCESS",
        null,
        { winner: winnerInfo, spinStartedAt: now }
      );

      res.json({
        message: "Live spin started! Wheel is turning live for all users.",
        liveState: session,
        winner: winnerInfo,
      });
    } catch (error) {
      console.error("Start live spin error:", error);
      res.status(500).json({ message: "Server error starting live spin" });
    }
  }
);

// @route   POST /api/draws/live/reset
// @desc    Admin resets the live draw state for testing or next round
// @access  Private (SUPER_ADMIN, LOTTERY_MANAGER)
router.post(
  "/live/reset",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { campaignId } = req.body;
      if (!campaignId) {
        return res.status(400).json({ message: "Campaign ID required" });
      }

      const session: LiveDrawSession = {
        phase: "SCHEDULED",
        scheduledDate: undefined,
      };
      liveSessions.set(campaignId, session);

      res.json({ message: "Live draw session reset", liveState: session });
    } catch (error) {
      console.error("Reset live draw error:", error);
      res.status(500).json({ message: "Server error resetting live draw" });
    }
  }
);

export default router;