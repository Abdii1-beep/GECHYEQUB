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
// @route   POST /api/kyc/submit
// @desc    Submit KYC verification with documents
// @access  Private
router.post("/submit", authenticateToken, async (req, res) => {
    try {
        const { fullName, dateOfBirth, phone, email, address, nationalId, idDocumentUrl, } = req.body;
        // Validate required fields
        if (!fullName || !nationalId) {
            return res.status(400).json({
                message: "Missing required fields: fullName, nationalId",
            });
        }
        // Check if KYC record already exists
        const existingKyc = await prisma.kycRecord.findFirst({
            where: { userId: req.userId },
        });
        if (existingKyc) {
            return res.status(400).json({
                message: "KYC record already exists for this user",
                kycStatus: existingKyc.idVerificationStatus,
            });
        }
        // Create KYC record
        const kycRecord = await prisma.kycRecord.create({
            data: {
                userId: req.userId,
                fullName,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
                phone,
                email,
                address,
                nationalId,
                idDocumentUrl,
                idVerificationStatus: "PENDING",
            },
        });
        // Update customer profile if exists
        await prisma.customerProfile.updateMany({
            where: { userId: req.userId },
            data: {
                fullName,
                phone,
                email,
                address,
            },
        });
        // Record audit log
        await createAuditLog(req.userId, req.role, "KYC_SUBMITTED", "kyc_record", kycRecord.id, req, "PENDING_REVIEW", {}, {
            status: "PENDING",
            submittedFields: Object.keys(req.body).filter((k) => req.body[k] !== undefined && req.body[k] !== null),
        });
        res.status(201).json({
            message: "KYC verification submitted successfully",
            kycRecord: {
                id: kycRecord.id,
                status: kycRecord.idVerificationStatus,
                createdAt: kycRecord.createdAt,
            },
        });
    }
    catch (error) {
        console.error("Submit KYC error:", error);
        res.status(500).json({ message: "Server error during KYC submission" });
    }
});
// @route   GET /api/kyc/status
// @desc    Get KYC status
// @access  Private
router.get("/status", authenticateToken, async (req, res) => {
    try {
        const kycRecord = await prisma.kycRecord.findFirst({
            where: { userId: req.userId },
            select: {
                id: true,
                idVerificationStatus: true,
                createdAt: true,
                verificationDate: true,
                verifiedBy: true,
                rejectionReason: true,
                idDocumentUrl: true,
            },
        });
        if (!kycRecord) {
            return res.json({
                kycStatus: "NOT_STARTED",
                message: "No KYC record found",
            });
        }
        res.json({
            kycStatus: kycRecord.idVerificationStatus,
            submittedAt: kycRecord.createdAt,
            verifiedAt: kycRecord.verificationDate,
            verifiedBy: kycRecord.verifiedBy,
            rejectionReason: kycRecord.rejectionReason,
        });
    }
    catch (error) {
        console.error("Get KYC status error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/kyc/pending
// @desc    Get pending KYC applications (admin)
// @access  Private (KYC_OFFICER+)
router.get("/pending", authenticateToken, authorizeRoles("KYC_OFFICER", "SUPER_ADMIN", "AUDITOR"), async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const kycRecords = await prisma.kycRecord.findMany({
            where: { idVerificationStatus: "PENDING" },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: "asc" },
            take: Number(limit),
            skip: Number(offset),
        });
        const total = await prisma.kycRecord.count({
            where: { idVerificationStatus: "PENDING" },
        });
        res.json({ kycRecords, total, limit, offset });
    }
    catch (error) {
        console.error("Get pending KYC error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/kyc/:id
// @desc    Get KYC details (admin)
// @access  Private (KYC_OFFICER+)
router.get("/:id", authenticateToken, authorizeRoles("KYC_OFFICER", "SUPER_ADMIN", "AUDITOR"), async (req, res) => {
    try {
        const kycRecord = await prisma.kycRecord.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!kycRecord) {
            return res.status(404).json({ message: "KYC record not found" });
        }
        res.json({ kycRecord });
    }
    catch (error) {
        console.error("Get KYC details error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   PUT /api/kyc/:id/approve
// @desc    Approve KYC (admin)
// @access  Private (KYC_OFFICER+)
router.put("/:id/approve", authenticateToken, authorizeRoles("KYC_OFFICER", "SUPER_ADMIN"), async (req, res) => {
    try {
        const { notes } = req.body;
        const kycRecord = await prisma.kycRecord.findUnique({
            where: { id: req.params.id },
        });
        if (!kycRecord) {
            return res.status(404).json({ message: "KYC record not found" });
        }
        if (kycRecord.idVerificationStatus !== "PENDING") {
            return res.status(400).json({
                message: "Can only approve pending KYC records",
            });
        }
        const beforeValue = { status: kycRecord.idVerificationStatus };
        const updatedKycRecord = await prisma.kycRecord.update({
            where: { id: req.params.id },
            data: {
                idVerificationStatus: "VERIFIED",
                verificationDate: new Date(),
                verifiedBy: req.userId,
                verificationNotes: notes,
            },
        });
        // Record audit log
        await createAuditLog(req.userId, req.role, "KYC_APPROVED", "kyc_record", kycRecord.id, req, "SUCCESS", beforeValue, {
            status: "VERIFIED",
            verifiedBy: req.userId,
            notes,
        });
        res.json({
            message: "KYC approved successfully",
            kycRecord: updatedKycRecord,
        });
    }
    catch (error) {
        console.error("Approve KYC error:", error);
        res.status(500).json({ message: "Server error during KYC approval" });
    }
});
// @route   PUT /api/kyc/:id/reject
// @desc    Reject KYC (admin)
// @access  Private (KYC_OFFICER+)
router.put("/:id/reject", authenticateToken, authorizeRoles("KYC_OFFICER", "SUPER_ADMIN"), async (req, res) => {
    try {
        const { rejectionReason, notes } = req.body;
        if (!rejectionReason) {
            return res.status(400).json({
                message: "Rejection reason is required",
            });
        }
        const kycRecord = await prisma.kycRecord.findUnique({
            where: { id: req.params.id },
        });
        if (!kycRecord) {
            return res.status(404).json({ message: "KYC record not found" });
        }
        if (kycRecord.idVerificationStatus !== "PENDING") {
            return res.status(400).json({
                message: "Can only reject pending KYC records",
            });
        }
        const beforeValue = { status: kycRecord.idVerificationStatus };
        const updatedKycRecord = await prisma.kycRecord.update({
            where: { id: req.params.id },
            data: {
                idVerificationStatus: "REJECTED",
                rejectionReason,
                verifiedBy: req.userId,
                verificationNotes: notes,
            },
        });
        // Record audit log
        await createAuditLog(req.userId, req.role, "KYC_REJECTED", "kyc_record", kycRecord.id, req, "SUCCESS", beforeValue, {
            status: "REJECTED",
            rejectionReason,
            verifiedBy: req.userId,
            notes,
        });
        res.json({
            message: "KYC rejected successfully",
            kycRecord: updatedKycRecord,
        });
    }
    catch (error) {
        console.error("Reject KYC error:", error);
        res.status(500).json({ message: "Server error during KYC rejection" });
    }
});
// @route   POST /api/kyc/:id/resubmit
// @desc    Resubmit KYC after rejection
// @access  Private
router.post("/:id/resubmit", authenticateToken, async (req, res) => {
    try {
        const kycRecord = await prisma.kycRecord.findUnique({
            where: { id: req.params.id },
        });
        if (!kycRecord) {
            return res.status(404).json({ message: "KYC record not found" });
        }
        if (kycRecord.userId !== req.userId) {
            return res.status(403).json({ message: "Not authorized to modify this KYC record" });
        }
        if (kycRecord.idVerificationStatus !== "REJECTED") {
            return res.status(400).json({
                message: "Can only resubmit rejected KYC records",
            });
        }
        const { fullName, dateOfBirth, phone, email, address, nationalId, idDocumentUrl, } = req.body;
        const beforeValue = { status: kycRecord.idVerificationStatus };
        const updatedKycRecord = await prisma.kycRecord.update({
            where: { id: req.params.id },
            data: {
                ...(fullName && { fullName }),
                ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
                ...(phone && { phone }),
                ...(email && { email }),
                ...(address && { address }),
                ...(nationalId && { nationalId }),
                ...(idDocumentUrl && { idDocumentUrl }),
                idVerificationStatus: "PENDING",
                rejectionReason: null,
                verificationDate: null,
                verifiedBy: null,
            },
        });
        // Record audit log
        await createAuditLog(req.userId, req.role, "KYC_RESUBMITTED", "kyc_record", kycRecord.id, req, "PENDING_REVIEW", beforeValue, {
            status: "PENDING",
            resubmittedFields: Object.keys(req.body).filter((k) => req.body[k] !== undefined && req.body[k] !== null),
        });
        res.json({
            message: "KYC resubmitted successfully",
            kycRecord: {
                id: updatedKycRecord.id,
                status: updatedKycRecord.idVerificationStatus,
                createdAt: updatedKycRecord.createdAt,
            },
        });
    }
    catch (error) {
        console.error("Resubmit KYC error:", error);
        res.status(500).json({ message: "Server error during KYC resubmission" });
    }
});
export default router;
