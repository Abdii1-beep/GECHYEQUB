import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
const router = Router();
const prisma = new PrismaClient();
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
// @route   POST /api/vehicles
// @desc    Create vehicle
// @access  Private (LOTTERY_MANAGER+)
router.post("/", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"), async (req, res) => {
    try {
        const { make, model, year, color, engineInfo, transmission, fuelType, vinChassisNumber, registrationInfo, vehicleCondition, location, declaredValue, status, images, documents, campaignId, } = req.body;
        // Validation
        if (!make || !model || !year || !color || !vinChassisNumber || !declaredValue) {
            return res.status(400).json({
                message: "Missing required fields: make, model, year, color, vinChassisNumber, declaredValue"
            });
        }
        if (year < 1900 || year > new Date().getFullYear() + 1) {
            return res.status(400).json({ message: "Invalid year" });
        }
        if (declaredValue <= 0) {
            return res.status(400).json({ message: "Declared value must be positive" });
        }
        // Check if VIN/chassis number already exists
        const existingVehicle = await prisma.vehicle.findUnique({
            where: { vinChassisNumber },
        });
        if (existingVehicle) {
            return res.status(409).json({ message: "Vehicle with this VIN/chassis number already exists" });
        }
        // Validate campaign if provided
        if (campaignId) {
            const campaign = await prisma.lotteryCampaign.findUnique({
                where: { id: campaignId },
            });
            if (!campaign) {
                return res.status(404).json({ message: "Campaign not found" });
            }
        }
        const vehicle = await prisma.vehicle.create({
            data: {
                make,
                model,
                year,
                color,
                engineInfo,
                transmission,
                fuelType,
                vinChassisNumber,
                registrationInfo,
                vehicleCondition: vehicleCondition || "AVAILABLE",
                location,
                declaredValue,
                status: status || "AVAILABLE",
                images: images || [],
                documents: documents || [],
                campaignId,
            },
        });
        await createAuditLog(req.userId, req.role, "CREATE_VEHICLE", "Vehicle", vehicle.id, req, "SUCCESS", null, vehicle);
        res.status(201).json({
            message: "Vehicle created successfully",
            vehicle,
        });
    }
    catch (error) {
        console.error("Create vehicle error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/vehicles
// @desc    Get all vehicles
// @access  Public
router.get("/", async (req, res) => {
    try {
        const { status, campaignId, includeAll } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (campaignId)
            where.campaignId = campaignId;
        if (!includeAll)
            where.status = "AVAILABLE";
        const vehicles = await prisma.vehicle.findMany({
            where,
            include: {
                LotteryCampaign: {
                    select: { id: true, name: true, status: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json({ vehicles });
    }
    catch (error) {
        console.error("Get vehicles error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/vehicles/:id
// @desc    Get vehicle details
// @access  Public
router.get("/:id", async (req, res) => {
    try {
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: req.params.id },
            include: {
                LotteryCampaign: {
                    select: { id: true, name: true, status: true, ticketPrice: true },
                },
            },
        });
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }
        res.json({ vehicle });
    }
    catch (error) {
        console.error("Get vehicle error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   PUT /api/vehicles/:id
// @desc    Update vehicle
// @access  Private (LOTTERY_MANAGER+)
router.put("/:id", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"), async (req, res) => {
    try {
        const existingVehicle = await prisma.vehicle.findUnique({
            where: { id: req.params.id },
        });
        if (!existingVehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }
        const { make, model, year, color, engineInfo, transmission, fuelType, vinChassisNumber, registrationInfo, vehicleCondition, location, declaredValue, status, images, documents, } = req.body;
        // Check if VIN is being changed and if new VIN already exists
        if (vinChassisNumber && vinChassisNumber !== existingVehicle.vinChassisNumber) {
            const existingVin = await prisma.vehicle.findUnique({
                where: { vinChassisNumber },
            });
            if (existingVin) {
                return res.status(409).json({ message: "Vehicle with this VIN/chassis number already exists" });
            }
        }
        // Prevent core specification modification if vehicle is assigned to a campaign with paid tickets
        if (existingVehicle.campaignId) {
            const campaignWithTickets = await prisma.lotteryCampaign.findFirst({
                where: {
                    id: existingVehicle.campaignId,
                    tickets: { some: { status: "PAID" } },
                },
            });
            if (campaignWithTickets) {
                const coreSpecFields = ["make", "model", "year", "vinChassisNumber", "declaredValue"];
                const requested = Object.keys(req.body);
                const hasCoreChange = requested.some(k => coreSpecFields.includes(k) && req.body[k] !== existingVehicle[k]);
                if (hasCoreChange) {
                    return res.status(400).json({
                        message: "Cannot modify vehicle core specs: campaign has paid tickets. You can still update images, color, condition, and location.",
                    });
                }
            }
        }
        const beforeValue = { ...existingVehicle };
        const updateData = {};
        if (make !== undefined)
            updateData.make = make;
        if (model !== undefined)
            updateData.model = model;
        if (year !== undefined)
            updateData.year = year;
        if (color !== undefined)
            updateData.color = color;
        if (engineInfo !== undefined)
            updateData.engineInfo = engineInfo;
        if (transmission !== undefined)
            updateData.transmission = transmission;
        if (fuelType !== undefined)
            updateData.fuelType = fuelType;
        if (vinChassisNumber !== undefined)
            updateData.vinChassisNumber = vinChassisNumber;
        if (registrationInfo !== undefined)
            updateData.registrationInfo = registrationInfo;
        if (vehicleCondition !== undefined)
            updateData.vehicleCondition = vehicleCondition;
        if (location !== undefined)
            updateData.location = location;
        if (declaredValue !== undefined)
            updateData.declaredValue = declaredValue;
        if (status !== undefined)
            updateData.status = status;
        if (images !== undefined) {
            let normalizedImgs = [];
            if (Array.isArray(images)) {
                normalizedImgs = images.map(i => (typeof i === 'string' ? i.trim() : String(i))).filter(Boolean);
            }
            else if (typeof images === 'string') {
                try {
                    const p = JSON.parse(images);
                    if (Array.isArray(p))
                        normalizedImgs = p.map(i => (typeof i === 'string' ? i.trim() : String(i))).filter(Boolean);
                }
                catch {
                    normalizedImgs = images.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
                }
            }
            updateData.images = normalizedImgs;
        }
        if (documents !== undefined)
            updateData.documents = documents;
        const vehicle = await prisma.vehicle.update({
            where: { id: req.params.id },
            data: updateData,
        });
        await createAuditLog(req.userId, req.role, "UPDATE_VEHICLE", "Vehicle", vehicle.id, req, "SUCCESS", beforeValue, vehicle);
        res.json({
            message: "Vehicle updated successfully",
            vehicle,
        });
    }
    catch (error) {
        console.error("Update vehicle error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   DELETE /api/vehicles/:id
// @desc    Delete vehicle
// @access  Private (SUPER_ADMIN+)
router.delete("/:id", authenticateToken, authorizeRoles("SUPER_ADMIN"), async (req, res) => {
    try {
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: req.params.id },
        });
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }
        // Check if vehicle is assigned to a campaign with tickets
        if (vehicle.campaignId) {
            const campaignWithTickets = await prisma.lotteryCampaign.findFirst({
                where: {
                    id: vehicle.campaignId,
                    tickets: { some: { status: "PAID" } },
                },
            });
            if (campaignWithTickets) {
                return res.status(400).json({
                    message: "Cannot delete vehicle: campaign has paid tickets",
                });
            }
        }
        await createAuditLog(req.userId, req.role, "DELETE_VEHICLE", "Vehicle", vehicle.id, req, "SUCCESS", vehicle, null);
        await prisma.vehicle.delete({
            where: { id: req.params.id },
        });
        res.json({ message: "Vehicle deleted successfully" });
    }
    catch (error) {
        console.error("Delete vehicle error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   POST /api/vehicles/:id/assign-campaign
// @desc    Assign vehicle to campaign
// @access  Private (LOTTERY_MANAGER+)
router.post("/:id/assign-campaign", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"), async (req, res) => {
    try {
        const { campaignId } = req.body;
        if (!campaignId) {
            return res.status(400).json({ message: "Campaign ID required" });
        }
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: req.params.id },
        });
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }
        const campaign = await prisma.lotteryCampaign.findUnique({
            where: { id: campaignId },
        });
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        if (campaign.status !== "DRAFT") {
            return res.status(400).json({
                message: "Can only assign vehicles to campaigns in DRAFT status"
            });
        }
        const beforeValue = { ...vehicle };
        const updatedVehicle = await prisma.vehicle.update({
            where: { id: req.params.id },
            data: { campaignId },
        });
        await createAuditLog(req.userId, req.role, "ASSIGN_VEHICLE_TO_CAMPAIGN", "Vehicle", vehicle.id, req, "SUCCESS", beforeValue, updatedVehicle);
        res.json({
            message: "Vehicle assigned to campaign successfully",
            vehicle: updatedVehicle,
        });
    }
    catch (error) {
        console.error("Assign vehicle to campaign error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
export default router;
