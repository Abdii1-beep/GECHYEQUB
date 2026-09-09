import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// @route   GET /api/transparency/campaigns
// @desc    Get public campaign information
// @access  Public
router.get("/campaigns", async (req: Request, res: Response) => {
  try {
    const { status, limit = 20 } = req.query;

    const where: any = {};
    if (status) {
      where.status = status as string;
    }

    const campaigns = await prisma.lotteryCampaign.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        drawDate: true,
        ticketPrice: true,
        maxTickets: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
    });

    res.json({ campaigns });
  } catch (error) {
    console.error("Get public campaigns error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/transparency/campaigns/:id
// @desc    Get detailed public campaign information
// @access  Public
router.get("/campaigns/:id", async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.lotteryCampaign.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        drawDate: true,
        ticketPrice: true,
        maxTickets: true,
        status: true,
        eligibilityRules: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // Get ticket statistics
    const ticketStats = await prisma.ticket.aggregate({
      where: { campaignId: req.params.id },
      _count: { id: true },
    });

    res.json({
      campaign,
      statistics: {
        totalTicketsSold: ticketStats._count.id,
        ticketsRemaining: campaign.maxTickets - ticketStats._count.id,
      },
    });
  } catch (error) {
    console.error("Get public campaign details error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/transparency/draws
// @desc    Get public draw results
// @access  Public
router.get("/draws", async (req: Request, res: Response) => {
  try {
    const { campaignId, limit = 20 } = req.query;

    const where: any = { state: "COMPLETED" };
    if (campaignId) {
      where.campaignId = campaignId as string;
    }

    const draws = await prisma.draw.findMany({
      where,
      select: {
        id: true,
        campaignId: true,
        state: true,
        eligibleTicketCount: true,
        commitmentHash: true,
        drawTimestamp: true,
        createdAt: true,
      },
      orderBy: { drawTimestamp: "desc" },
      take: Number(limit),
    });

    res.json({ draws });
  } catch (error) {
    console.error("Get public draws error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/transparency/draws/:id
// @desc    Get detailed public draw information
// @access  Public
router.get("/draws/:id", async (req: Request, res: Response) => {
  try {
    const draw = await prisma.draw.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        campaignId: true,
        state: true,
        eligibleTicketCount: true,
        commitmentHash: true,
        seed: true,
        drawTimestamp: true,
        configuration: true,
        verificationRecord: true,
        createdAt: true,
      },
    });

    if (!draw) {
      return res.status(404).json({ message: "Draw not found" });
    }

    // Get campaign info
    const campaign = await prisma.lotteryCampaign.findUnique({
      where: { id: draw.campaignId },
      select: { name: true, ticketPrice: true },
    });

    // Get draw results (winners)
    const winners = await prisma.drawResult.findMany({
      where: { drawId: req.params.id },
      select: {
        id: true,
        position: true,
        verificationStatus: true,
        ticket: {
          select: {
            purchaseId: true,
          },
        },
      },
    });

    res.json({
      draw,
      campaign,
      winners,
    });
  } catch (error) {
    console.error("Get public draw details error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/transparency/winners
// @desc    Get public winner announcements
// @access  Public
router.get("/winners", async (req: Request, res: Response) => {
  try {
    const { campaignId, limit = 50 } = req.query;

    const where: any = { verificationStatus: "VERIFIED" };
    if (campaignId) {
      where.draw = { campaignId: campaignId as string };
    }

    const winners = await prisma.drawResult.findMany({
      where,
      select: {
        id: true,
        position: true,
        verificationStatus: true,
        draw: {
          select: {
            id: true,
            drawTimestamp: true,
            LotteryCampaign: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
    });

    res.json({ winners });
  } catch (error) {
    console.error("Get public winners error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/transparency/statistics
// @desc    Get public platform statistics
// @access  Public
router.get("/statistics", async (req: Request, res: Response) => {
  try {
    const [
      totalCampaigns,
      activeCampaigns,
      completedDraws,
      totalWinners,
      totalTickets,
    ] = await Promise.all([
      prisma.lotteryCampaign.count(),
      prisma.lotteryCampaign.count({ where: { status: "ACTIVE" as any } }),
      prisma.draw.count({ where: { state: "COMPLETED" } }),
      prisma.drawResult.count({ where: { verificationStatus: "VERIFIED" } }),
      prisma.ticket.count(),
    ]);

    res.json({
      statistics: {
        totalCampaigns,
        activeCampaigns,
        completedDraws,
        totalWinners,
        totalTickets,
      },
    });
  } catch (error) {
    console.error("Get public statistics error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/transparency/audit-logs
// @desc    Get public audit log summary (limited)
// @access  Public
router.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;

    // Only return non-sensitive audit logs
    const logs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ["CAMPAIGN_CREATED", "CAMPAIGN_UPDATED", "DRAW_COMPLETED", "WINNER_ANNOUNCED"],
        },
      },
      select: {
        id: true,
        action: true,
        entity: true,
        timestamp: true,
        result: true,
      },
      orderBy: { timestamp: "desc" },
      take: Number(limit),
    });

    res.json({ logs });
  } catch (error) {
    console.error("Get public audit logs error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/transparency/verification/:drawId
// @desc    Get draw verification information
// @access  Public
router.get("/verification/:drawId", async (req: Request, res: Response) => {
  try {
    const draw = await prisma.draw.findUnique({
      where: { id: req.params.drawId },
      select: {
        id: true,
        campaignId: true,
        state: true,
        commitmentHash: true,
        seed: true,
        configuration: true,
        verificationRecord: true,
        drawTimestamp: true,
      },
    });

    if (!draw) {
      return res.status(404).json({ message: "Draw not found" });
    }

    // Only show verification info for completed draws
    if (draw.state !== "COMPLETED") {
      return res.status(400).json({ message: "Draw verification not available" });
    }

    res.json({
      drawId: draw.id,
      campaignId: draw.campaignId,
      commitmentHash: draw.commitmentHash,
      seed: draw.seed,
      configuration: draw.configuration,
      verificationRecord: draw.verificationRecord,
      drawTimestamp: draw.drawTimestamp,
    });
  } catch (error) {
    console.error("Get draw verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
