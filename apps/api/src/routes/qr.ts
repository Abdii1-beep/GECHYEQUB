import { Router, Request, Response } from "express";
import { authenticateToken, authorizeRoles, AuthRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import QRCodeService from "../services/qr/QRCodeService";

const router = Router();
const prisma = new PrismaClient();

// @route   GET /api/qr/ticket/:ticketId
// @desc    Generate QR code for a specific ticket
// @access  Private
router.get(
  "/ticket/:ticketId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { ticketId } = req.params;

      // Get ticket details
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          LotteryCampaign: {
            select: { id: true },
          },
        },
      });

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Check if user owns the ticket or is admin
      const isAdmin = req.role === "SUPER_ADMIN" || req.role === "LOTTERY_MANAGER";
      const isOwner = req.userId === ticket.customerId;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Not authorized to view this ticket" });
      }

      // Generate QR code
      const qrCode = await QRCodeService.generateTicketQRCode(
        ticket.id,
        ticket.purchaseId, // Using purchaseId as ticket identifier
        ticket.LotteryCampaign?.id || ticket.campaignId
      );

      res.json({
        ticketId: ticket.id,
        ticketIdentifier: ticket.purchaseId,
        qrCode,
      });
    } catch (error) {
      console.error("Generate ticket QR code error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/qr/verify/:purchaseId
// @desc    Generate verification QR code for a ticket
// @access  Private
router.get(
  "/verify/:purchaseId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { purchaseId } = req.params;

      // Check if ticket exists
      const ticket = await prisma.ticket.findUnique({
        where: { purchaseId },
      });

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Generate verification QR code
      const qrCode = await QRCodeService.generateVerificationQRCode(purchaseId);

      res.json({
        purchaseId,
        qrCode,
      });
    } catch (error) {
      console.error("Generate verification QR code error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/qr/validate
// @desc    Validate a QR code payload
// @access  Private
router.post(
  "/validate",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { payload } = req.body;

      if (!payload) {
        return res.status(400).json({ message: "QR code payload is required" });
      }

      const validation = QRCodeService.validateQRCodePayload(payload);

      if (validation.valid) {
        // If it's a ticket QR code, verify the ticket exists
        if (validation.data.tid) {
          const ticket = await prisma.ticket.findUnique({
            where: { id: validation.data.tid },
            include: {
              LotteryCampaign: {
                select: { id: true, name: true, status: true },
              },
            },
          });

          if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
          }

          return res.json({
            valid: true,
            ticket: {
              id: ticket.id,
              purchaseId: ticket.purchaseId,
              status: ticket.status,
              campaign: ticket.LotteryCampaign,
            },
          });
        }

        return res.json(validation);
      } else {
        return res.status(400).json(validation);
      }
    } catch (error) {
      console.error("Validate QR code error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/qr/ticket/:ticketId/svg
// @desc    Generate QR code as SVG for a ticket
// @access  Private
router.get(
  "/ticket/:ticketId/svg",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { ticketId } = req.params;

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          LotteryCampaign: {
            select: { id: true },
          },
        },
      });

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const isAdmin = req.role === "SUPER_ADMIN" || req.role === "LOTTERY_MANAGER";
      const isOwner = req.userId === ticket.customerId;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Not authorized to view this ticket" });
      }

      const qrCodeSVG = await QRCodeService.generateTicketQRCodeSVG(
        ticket.id,
        ticket.purchaseId,
        ticket.LotteryCampaign?.id || ticket.campaignId
      );

      res.setHeader("Content-Type", "image/svg+xml");
      res.send(qrCodeSVG);
    } catch (error) {
      console.error("Generate QR code SVG error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/qr/batch
// @desc    Generate QR codes for multiple tickets
// @access  Private (ADMIN+)
router.post(
  "/batch",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { ticketIds } = req.body;

      if (!ticketIds || !Array.isArray(ticketIds)) {
        return res.status(400).json({ message: "ticketIds array is required" });
      }

      if (ticketIds.length > 100) {
        return res.status(400).json({ message: "Maximum 100 tickets per batch" });
      }

      // Get ticket details
      const tickets = await prisma.ticket.findMany({
        where: { id: { in: ticketIds } },
        include: {
          LotteryCampaign: {
            select: { id: true },
          },
        },
      });

      if (tickets.length !== ticketIds.length) {
        return res.status(404).json({ message: "Some tickets not found" });
      }

      const ticketData = tickets.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.purchaseId,
        campaignId: ticket.LotteryCampaign?.id || ticket.campaignId,
      }));

      const qrCodes = await QRCodeService.generateBatchQRCodes(ticketData);

      res.json({
        count: qrCodes.length,
        qrCodes,
      });
    } catch (error) {
      console.error("Generate batch QR codes error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/qr/styled
// @desc    Generate styled QR code for a ticket
// @access  Private
router.post(
  "/styled",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { ticketId, color, backgroundColor, width } = req.body;

      if (!ticketId) {
        return res.status(400).json({ message: "ticketId is required" });
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          LotteryCampaign: {
            select: { id: true },
          },
        },
      });

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const isAdmin = req.role === "SUPER_ADMIN" || req.role === "LOTTERY_MANAGER";
      const isOwner = req.userId === ticket.customerId;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Not authorized to view this ticket" });
      }

      const qrCode = await QRCodeService.generateStyledQRCode(
        ticket.id,
        ticket.purchaseId,
        ticket.LotteryCampaign?.id || ticket.campaignId,
        { color, backgroundColor, width }
      );

      res.json({
        ticketId: ticket.id,
        ticketIdentifier: ticket.purchaseId,
        qrCode,
      });
    } catch (error) {
      console.error("Generate styled QR code error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
