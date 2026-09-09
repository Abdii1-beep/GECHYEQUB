import { Router, Request, Response } from "express";
import { authenticateToken, authorizeRoles, AuthRequest } from "../middleware/auth";
import { PrismaClient, Role, CampaignStatus } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Helper function to generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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

// Helper to normalize images to a string array
export const normalizeImages = (imgs: any): string[] => {
  if (!imgs) return [];
  if (Array.isArray(imgs)) {
    return imgs.map(i => (typeof i === 'string' ? i.trim() : String(i))).filter(Boolean);
  }
  if (typeof imgs === 'string') {
    try {
      const parsed = JSON.parse(imgs);
      if (Array.isArray(parsed)) {
        return parsed.map(i => (typeof i === 'string' ? i.trim() : String(i))).filter(Boolean);
      }
    } catch {
      if (imgs.includes('\n') || imgs.includes(',')) {
        return imgs.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      }
      if (imgs.trim()) return [imgs.trim()];
    }
  }
  return [];
};

// @route   GET /api/campaigns
// @desc    Get all campaigns (public)
// @access  Public
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, includeDraft } = req.query;
    
    const where: any = {};
    if (status) {
      where.status = status as CampaignStatus;
    } else if (!includeDraft) {
      where.status = "PUBLISHED";
    }

    const campaigns = await prisma.lotteryCampaign.findMany({
      where,
      include: {
        vehicles: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            color: true,
            declaredValue: true,
            status: true,
            images: true,
            engineInfo: true,
            transmission: true,
            fuelType: true,
            vehicleCondition: true,
            location: true,
          },
        },
        _count: {
          select: {
            tickets: {
              where: { status: "PAID" }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = campaigns.map(c => {
      const soldTickets = c._count?.tickets ?? 0;
      const remainingTickets = Math.max(0, c.maxTickets - soldTickets);
      return {
        ...c,
        soldTickets,
        remainingTickets,
      };
    });

    res.json({ campaigns: enriched });
  } catch (error) {
    console.error("Get campaigns error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/campaigns/:id
// @desc    Get campaign details
// @access  Public
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.lotteryCampaign.findUnique({
      where: { id: req.params.id },
      include: {
        vehicles: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            color: true,
            engineInfo: true,
            transmission: true,
            fuelType: true,
            vehicleCondition: true,
            declaredValue: true,
            status: true,
            images: true,
          },
        },
        _count: {
          select: {
            tickets: {
              where: { status: "PAID" }
            }
          }
        }
      },
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    const soldTickets = campaign._count?.tickets ?? 0;
    const remainingTickets = Math.max(0, campaign.maxTickets - soldTickets);

    res.json({
      campaign: {
        ...campaign,
        soldTickets,
        remainingTickets,
      }
    });
  } catch (error) {
    console.error("Get campaign error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/campaigns
// @desc    Create campaign
// @access  Private (LOTTERY_MANAGER+)
router.post(
  "/",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        name,
        description,
        systemName,
        ticketPrice,
        maxTickets,
        startDate,
        endDate,
        drawDate,
        eligibilityRules,
      } = req.body;

      // Validation
      if (!name || !ticketPrice || !maxTickets || !startDate || !endDate) {
        return res.status(400).json({ 
          message: "Missing required fields: name, ticketPrice, maxTickets, startDate, endDate" 
        });
      }

      if (ticketPrice <= 0) {
        return res.status(400).json({ message: "Ticket price must be positive" });
      }

      if (maxTickets <= 0) {
        return res.status(400).json({ message: "Max tickets must be positive" });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return res.status(400).json({ message: "Start date must be before end date" });
      }

      if (drawDate) {
        const draw = new Date(drawDate);
        if (draw <= end) {
          return res.status(400).json({ message: "Draw date must be after end date" });
        }
      }

      // Generate unique slug
      const slug = generateSlug(name);
      const existingSlug = await prisma.lotteryCampaign.findUnique({
        where: { slug },
      });

      if (existingSlug) {
        return res.status(409).json({ message: "Campaign with similar name already exists" });
      }

      const campaign = await prisma.lotteryCampaign.create({
        data: {
          name,
          slug,
          description,
          systemName: systemName || "ETHIO CAR LOTTERY",
          ticketPrice: Number(ticketPrice),
          maxTickets: Number(maxTickets),
          startDate: start,
          endDate: end,
          drawDate: drawDate ? new Date(drawDate) : null,
          eligibilityRules: eligibilityRules || "{}",
          createdBy: req.userId || "system",
          status: req.body.status || "PUBLISHED",
        },
      });

      // Optionally create vehicle if provided
      if (req.body.vehicle) {
        const v = req.body.vehicle;
        const vehicleImages = normalizeImages(v.images);

        await prisma.vehicle.create({
          data: {
            make: v.make || "Luxury",
            model: v.model || name,
            year: Number(v.year) || new Date().getFullYear(),
            color: v.color || "Metallic Black",
            engineInfo: v.engineInfo || "High Performance Engine",
            transmission: v.transmission || "Automatic",
            fuelType: v.fuelType || "Gasoline",
            vinChassisNumber: v.vinChassisNumber || `ETH-VIN-${Date.now().toString().slice(-8)}`,
            declaredValue: Number(v.declaredValue) || Number(ticketPrice) * Number(maxTickets) * 0.7,
            vehicleCondition: v.vehicleCondition || "BRAND_NEW",
            location: v.location || "Addis Ababa",
            status: "AVAILABLE",
            campaignId: campaign.id,
            images: vehicleImages.length > 0 ? vehicleImages : ["https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1200&auto=format&fit=crop"],
          },
        });
      }

      // Fetch campaign with vehicle included
      const fullCampaign = await prisma.lotteryCampaign.findUnique({
        where: { id: campaign.id },
        include: {
          vehicles: true,
          _count: {
            select: {
              tickets: { where: { status: "PAID" } }
            }
          }
        },
      });

      const soldTickets = fullCampaign?._count?.tickets ?? 0;
      const remainingTickets = Math.max(0, (fullCampaign?.maxTickets ?? 0) - soldTickets);

      const campaignResult = {
        ...fullCampaign,
        soldTickets,
        remainingTickets,
      };

      // Create audit log
      await createAuditLog(
        req.userId!,
        req.role!,
        "CREATE_CAMPAIGN",
        "LotteryCampaign",
        campaign.id,
        req,
        "SUCCESS",
        null,
        campaignResult
      );

      res.status(201).json({
        message: "Campaign created successfully",
        campaign: campaignResult,
      });
    } catch (error) {
      console.error("Create campaign error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/campaigns/:id
// @desc    Update campaign and vehicle/images
// @access  Private (LOTTERY_MANAGER+)
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"),
  async (req: AuthRequest, res: Response) => {
    try {
      const existingCampaign = await prisma.lotteryCampaign.findUnique({
        where: { id: req.params.id },
        include: {
          tickets: { where: { status: "PAID" } },
          vehicles: true,
        },
      });

      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      const hasPaidTickets = existingCampaign.tickets.length > 0;
      const paidTicketsCount = existingCampaign.tickets.length;

      // Ensure maxTickets is not set below already sold tickets count
      if (req.body.maxTickets !== undefined) {
        const newMax = Number(req.body.maxTickets);
        if (isNaN(newMax) || newMax <= 0) {
          return res.status(400).json({ message: "Max tickets must be a positive number" });
        }
        if (hasPaidTickets && newMax < paidTicketsCount) {
          return res.status(400).json({
            message: `Cannot set max tickets quota to ${newMax} because ${paidTicketsCount} tickets have already been purchased. Max tickets must be at least ${paidTicketsCount}.`,
          });
        }
      }

      if (req.body.ticketPrice !== undefined) {
        const newPrice = Number(req.body.ticketPrice);
        if (isNaN(newPrice) || newPrice <= 0) {
          return res.status(400).json({ message: "Ticket price must be a positive number" });
        }
      }

      const beforeValue = { ...existingCampaign };
      const updateData: any = {};
      
      if (req.body.name) {
        updateData.name = req.body.name;
        updateData.slug = generateSlug(req.body.name);
      }
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.systemName !== undefined) updateData.systemName = req.body.systemName;
      if (req.body.ticketPrice !== undefined) updateData.ticketPrice = Number(req.body.ticketPrice);
      if (req.body.maxTickets !== undefined) updateData.maxTickets = Number(req.body.maxTickets);
      if (req.body.startDate !== undefined) updateData.startDate = new Date(req.body.startDate);
      if (req.body.endDate !== undefined) updateData.endDate = new Date(req.body.endDate);
      if (req.body.drawDate !== undefined) updateData.drawDate = req.body.drawDate ? new Date(req.body.drawDate) : null;
      if (req.body.eligibilityRules !== undefined) updateData.eligibilityRules = req.body.eligibilityRules;
      if (req.body.status !== undefined) updateData.status = req.body.status;

      const updatedCampaign = await prisma.lotteryCampaign.update({
        where: { id: req.params.id },
        data: updateData,
      });

      // Handle vehicle update or create if provided
      if (req.body.vehicle) {
        const v = req.body.vehicle;
        const vImages = normalizeImages(v.images);

        if (existingCampaign.vehicles && existingCampaign.vehicles.length > 0) {
          const vehicleId = existingCampaign.vehicles[0].id;
          const vUpdate: any = {};
          if (v.make !== undefined) vUpdate.make = v.make;
          if (v.model !== undefined) vUpdate.model = v.model;
          if (v.year !== undefined) vUpdate.year = Number(v.year) || existingCampaign.vehicles[0].year;
          if (v.color !== undefined) vUpdate.color = v.color;
          if (v.engineInfo !== undefined) vUpdate.engineInfo = v.engineInfo;
          if (v.transmission !== undefined) vUpdate.transmission = v.transmission;
          if (v.fuelType !== undefined) vUpdate.fuelType = v.fuelType;
          if (v.vinChassisNumber !== undefined) vUpdate.vinChassisNumber = v.vinChassisNumber;
          if (v.declaredValue !== undefined) vUpdate.declaredValue = Number(v.declaredValue) || 0;
          if (v.vehicleCondition !== undefined) vUpdate.vehicleCondition = v.vehicleCondition;
          if (v.location !== undefined) vUpdate.location = v.location;
          if (v.images !== undefined) {
            vUpdate.images = vImages.length > 0 ? vImages : existingCampaign.vehicles[0].images;
          }

          await prisma.vehicle.update({
            where: { id: vehicleId },
            data: vUpdate,
          });
        } else {
          // Create vehicle if none existed for this campaign
          await prisma.vehicle.create({
            data: {
              make: v.make || "Luxury",
              model: v.model || updatedCampaign.name,
              year: Number(v.year) || new Date().getFullYear(),
              color: v.color || "Metallic Black",
              engineInfo: v.engineInfo || "High Performance Engine",
              transmission: v.transmission || "Automatic",
              fuelType: v.fuelType || "Gasoline",
              vinChassisNumber: v.vinChassisNumber || `ETH-VIN-${Date.now().toString().slice(-8)}`,
              declaredValue: Number(v.declaredValue) || (updatedCampaign.ticketPrice * updatedCampaign.maxTickets * 0.7),
              vehicleCondition: v.vehicleCondition || "BRAND_NEW",
              location: v.location || "Addis Ababa",
              status: "AVAILABLE",
              campaignId: updatedCampaign.id,
              images: vImages.length > 0 ? vImages : ["https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1200&auto=format&fit=crop"],
            },
          });
        }
      }

      // Fetch fresh campaign with vehicles and ticket counts
      const fullCampaign = await prisma.lotteryCampaign.findUnique({
        where: { id: updatedCampaign.id },
        include: {
          vehicles: true,
          _count: {
            select: {
              tickets: { where: { status: "PAID" } }
            }
          }
        },
      });

      const soldTickets = fullCampaign?._count?.tickets ?? 0;
      const remainingTickets = Math.max(0, (fullCampaign?.maxTickets ?? 0) - soldTickets);

      const campaignResult = {
        ...fullCampaign,
        soldTickets,
        remainingTickets,
      };

      // Create audit log
      await createAuditLog(
        req.userId!,
        req.role!,
        "UPDATE_CAMPAIGN",
        "LotteryCampaign",
        updatedCampaign.id,
        req,
        "SUCCESS",
        beforeValue,
        campaignResult
      );

      res.json({
        message: "Campaign updated successfully",
        campaign: campaignResult,
      });
    } catch (error) {
      console.error("Update campaign error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/campaigns/:id
// @desc    Cancel campaign
// @access  Private (LOTTERY_MANAGER+)
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"),
  async (req: AuthRequest, res: Response) => {
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
        // Instead of deleting, mark as cancelled
        const updatedCampaign = await prisma.lotteryCampaign.update({
          where: { id: req.params.id },
          data: { status: "CANCELLED" },
        });

        await createAuditLog(
          req.userId!,
          req.role!,
          "CANCEL_CAMPAIGN",
          "LotteryCampaign",
          campaign.id,
          req,
          "SUCCESS",
          campaign,
          updatedCampaign
        );

        return res.json({ 
          message: "Campaign cancelled successfully (marked as cancelled due to existing tickets)",
          campaign: updatedCampaign 
        });
      }

      // No tickets sold, can delete
      await prisma.lotteryCampaign.delete({
        where: { id: req.params.id },
      });

      await createAuditLog(
        req.userId!,
        req.role!,
        "DELETE_CAMPAIGN",
        "LotteryCampaign",
        campaign.id,
        req,
        "SUCCESS",
        campaign,
        null
      );

      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      console.error("Delete campaign error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/campaigns/:id/publish
// @desc    Publish campaign
// @access  Private (LOTTERY_MANAGER+)
router.post(
  "/:id/publish",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"),
  async (req: AuthRequest, res: Response) => {
    try {
      const campaign = await prisma.lotteryCampaign.findUnique({
        where: { id: req.params.id },
      });

      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (campaign.status !== "DRAFT") {
        return res.status(400).json({ 
          message: "Can only publish campaigns in DRAFT status" 
        });
      }

      const updatedCampaign = await prisma.lotteryCampaign.update({
        where: { id: req.params.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          publishedBy: req.userId || "admin",
        },
      });

      await createAuditLog(
        req.userId!,
        req.role!,
        "PUBLISH_CAMPAIGN",
        "LotteryCampaign",
        campaign.id,
        req,
        "SUCCESS",
        campaign,
        updatedCampaign
      );

      res.json({
        message: "Campaign published successfully",
        campaign: updatedCampaign,
      });
    } catch (error) {
      console.error("Publish campaign error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;