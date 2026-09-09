import { Router, Request, Response } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// @route   GET /api/winners
// @desc    Get all winners (admin)
// @access  Private (AUDITOR+, FINANCE_OFFICER+)
router.get(
  "/",
  authenticateToken,
  authorizeRoles("AUDITOR", "FINANCE_OFFICER", "SUPER_ADMIN", "LOTTERY_MANAGER"),
  async (req: Request, res: Response) => {
    try {
      const winners = await prisma.winner.findMany({
        include: {
          draw: {
            select: { id: true, state: true, drawTimestamp: true },
          },
          ticket: {
            select: {
              id: true,
              verificationHash: true,
              status: true,
            },
          },
          customer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
        },
        orderBy: { verificationTimestamp: "desc" },
      });

      res.json({ winners });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/winners/draw/:drawId
// @desc    Get winners for draw
// @access  Private
router.get("/draw/:drawId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const winners = await prisma.winner.findMany({
      where: { drawId: req.params.drawId },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    res.json({ winners });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/winners/:id/verify
// @desc    Verify winner
// @access  Private (DRAW_OFFICER+, AUDITOR+)
router.put(
  "/:id/verify",
  authenticateToken,
  authorizeRoles("DRAW_OFFICER", "AUDITOR", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { verificationStatus, notificationStatus, claimStatus, rejectionReason } =
        req.body;

      const winner = await prisma.winner.update({
        where: { id: req.params.id },
        data: {
          verificationStatus,
          notificationStatus,
          claimStatus,
          ...(rejectionReason && { rejectionReason }),
          ...(verificationStatus === "VERIFIED" && {
            verificationTimestamp: new Date(),
          }),
        },
      });

      // If verified, update ticket status and create delivery record
      if (verificationStatus === "VERIFIED") {
        await prisma.ticket.update({
          where: { id: winner.ticketId },
          data: { status: "ACTIVE" },
        });

        await prisma.notification.create({
          data: {
            userId: winner.customerId,
            type: "winner_verified",
            title: "Winner Verified",
            message: "Your winner verification has been completed.",
            data: {
              winnerId: winner.id,
              ticketId: winner.ticketId,
            },
          },
        });
      }

      res.json({
        message: "Winner verification updated",
        winner,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/winners/:id/claim
// @desc    Claim prize
// @access  Private (winner via token)
router.put(
  "/:id/claim",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const winnerId = req.params.id;

      // Check if this is the actual winner (would verify token in production)
      const winner = await prisma.winner.findUnique({
        where: { id: winnerId },
        include: { customer: true, ticket: true },
      });

      if (!winner) {
        return res.status(404).json({ message: "Winner not found" });
      }

      if (winner.claimStatus === "CLAIMED") {
        return res.status(400).json({
          message: "Prize already claimed",
        });
      }

      // Update claim status
      const updatedWinner = await prisma.winner.update({
        where: { id: winnerId },
        data: {
          claimStatus: "CLAIMED",
          deliveryStatus: "PENDING",
        },
      });

      // Create delivery record
      await prisma.notification.create({
        data: {
          userId: winner.customerId,
          type: "prize_ready",
          title: "Prize Ready for Delivery",
          message: "Your prize is ready for delivery. Please contact support to arrange delivery.",
          data: {
            winnerId,
            ticketId: winner.ticketId,
          },
        },
      });

      res.json({
        message: "Prize claimed successfully",
        winner: updatedWinner,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/winners/:id/deliver
// @desc    Mark prize delivered
// @access  Private (DRAW_OFFICER+, SUPER_ADMIN)
router.put(
  "/:id/deliver",
  authenticateToken,
  authorizeRoles("DRAW_OFFICER", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const winnerId = req.params.id;

      const updatedWinner = await prisma.winner.update({
        where: { id: winnerId },
        data: {
          deliveryStatus: "DELIVERED",
          deliveredAt: new Date(),
        },
      });

      // Create delivery notification
      await prisma.notification.create({
        data: {
          userId: winnerId,
          type: "prize_delivered",
          title: "Prize Delivered",
          message: "Your prize has been successfully delivered.",
          data: {
            winnerId,
            ticketId: updatedWinner.ticketId,
          },
        },
      });

      res.json({
        message: "Prize delivery marked",
        winner: updatedWinner,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;