import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import FraudDetectionService from "../services/fraud/FraudDetectionService";
const router = Router();
// @route   GET /api/fraud/risk-score/:userId
// @desc    Get fraud risk score for a user
// @access  Private (ADMIN+)
router.get("/risk-score/:userId", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER", "AUDITOR"), async (req, res) => {
    try {
        const { userId } = req.params;
        const riskScore = await FraudDetectionService.calculateRiskScore(userId);
        res.json(riskScore);
    }
    catch (error) {
        console.error("Get risk score error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/fraud/suspicious-activity/:userId
// @desc    Get suspicious activity for a user
// @access  Private (ADMIN+)
router.get("/suspicious-activity/:userId", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER", "AUDITOR"), async (req, res) => {
    try {
        const { userId } = req.params;
        const activities = await FraudDetectionService.detectSuspiciousActivity(userId);
        res.json({ activities });
    }
    catch (error) {
        console.error("Get suspicious activity error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   POST /api/fraud/flag
// @desc    Flag an account for fraud review
// @access  Private (ADMIN+)
router.post("/flag", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"), async (req, res) => {
    try {
        const { userId, reason, severity } = req.body;
        if (!userId || !reason || !severity) {
            return res.status(400).json({
                message: "Missing required fields: userId, reason, severity",
            });
        }
        const result = await FraudDetectionService.flagAccount(userId, reason, req.userId, severity);
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(400).json(result);
        }
    }
    catch (error) {
        console.error("Flag account error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/fraud/flags
// @desc    Get all fraud flags
// @access  Private (ADMIN+)
router.get("/flags", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER", "AUDITOR"), async (req, res) => {
    try {
        const { status, limit = 20, offset = 0 } = req.query;
        const result = await FraudDetectionService.getFlaggedAccounts(status, Number(limit), Number(offset));
        res.json(result);
    }
    catch (error) {
        console.error("Get flags error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   PUT /api/fraud/flags/:id/resolve
// @desc    Resolve a fraud flag
// @access  Private (ADMIN+)
router.put("/flags/:id/resolve", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER"), async (req, res) => {
    try {
        const { resolution, actionTaken } = req.body;
        if (!resolution || !actionTaken) {
            return res.status(400).json({
                message: "Missing required fields: resolution, actionTaken",
            });
        }
        const result = await FraudDetectionService.resolveFlag(req.params.id, resolution, req.userId, actionTaken);
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(400).json(result);
        }
    }
    catch (error) {
        console.error("Resolve flag error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/fraud/statistics
// @desc    Get fraud statistics
// @access  Private (ADMIN+)
router.get("/statistics", authenticateToken, authorizeRoles("SUPER_ADMIN", "LOTTERY_MANAGER", "AUDITOR"), async (req, res) => {
    try {
        const statistics = await FraudDetectionService.getFraudStatistics();
        res.json(statistics);
    }
    catch (error) {
        console.error("Get statistics error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
export default router;
