import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
const router = Router();
const prisma = new PrismaClient();
// @route   GET /api/customers/profile
// @desc    Get customer profile
// @access  Private
router.get("/profile", authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: {
                customerProfile: true,
                kycRecord: true,
            },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                customerProfile: user.customerProfile,
                kycRecord: user.kycRecord,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
// @route   PUT /api/customers/profile
// @desc    Update customer profile
// @access  Private
router.put("/profile", authenticateToken, async (req, res) => {
    const { fullName, phone, address } = req.body;
    const updatedProfile = await prisma.customerProfile.upsert({
        where: { userId: req.userId },
        update: {
            fullName,
            phone,
            address,
        },
        create: {
            userId: req.userId,
            fullName,
            phone,
            address,
        },
    });
    res.json({
        message: "Profile updated successfully",
        profile: updatedProfile,
    });
});
export default router;
