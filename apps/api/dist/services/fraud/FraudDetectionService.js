import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
class FraudDetectionService {
    /**
     * Calculate fraud risk score for a user
     */
    static async calculateRiskScore(userId) {
        const factors = [];
        let score = 0;
        // Factor 1: Multiple failed payment attempts
        const failedPayments = await prisma.order.count({
            where: {
                customerId: userId,
                status: "FAILED",
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                },
            },
        });
        if (failedPayments > 3) {
            score += 30;
            factors.push(`High number of failed payment attempts (${failedPayments} in 24h)`);
        }
        else if (failedPayments > 1) {
            score += 10;
            factors.push(`Multiple failed payment attempts (${failedPayments} in 24h)`);
        }
        // Factor 2: Rapid ticket purchases
        const recentTickets = await prisma.ticket.count({
            where: {
                customerId: userId,
                createdAt: {
                    gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
                },
            },
        });
        if (recentTickets > 5) {
            score += 40;
            factors.push(`Rapid ticket purchases (${recentTickets} in 1h)`);
        }
        else if (recentTickets > 2) {
            score += 15;
            factors.push(`Multiple ticket purchases (${recentTickets} in 1h)`);
        }
        // Factor 3: KYC status
        const kycRecord = await prisma.kycRecord.findFirst({
            where: { userId },
        });
        if (!kycRecord || kycRecord.idVerificationStatus !== "VERIFIED") {
            score += 20;
            factors.push("Unverified KYC status");
        }
        // Factor 4: Account age
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (user) {
            const accountAge = Date.now() - user.createdAt.getTime();
            const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
            if (daysSinceCreation < 1) {
                score += 25;
                factors.push("Newly created account (< 1 day)");
            }
            else if (daysSinceCreation < 7) {
                score += 10;
                factors.push("Recently created account (< 7 days)");
            }
        }
        // Factor 5: Suspicious IP patterns (if audit logs exist)
        const recentIps = await prisma.auditLog.findMany({
            where: {
                userId,
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
            },
            select: { ipAddress: true },
            distinct: ["ipAddress"],
        });
        if (recentIps.length > 5) {
            score += 20;
            factors.push(`Multiple IP addresses used (${recentIps.length} in 24h)`);
        }
        // Determine risk level
        let riskLevel;
        if (score >= 70) {
            riskLevel = "HIGH";
        }
        else if (score >= 50) {
            riskLevel = "HIGH";
        }
        else if (score >= 30) {
            riskLevel = "MEDIUM";
        }
        else {
            riskLevel = "LOW";
        }
        // Generate recommendations
        const recommendations = [];
        if (riskLevel === "HIGH" && score >= 70) {
            recommendations.push("Immediately suspend account activity");
            recommendations.push("Require manual review by fraud team");
            recommendations.push("Flag for investigation");
        }
        else if (riskLevel === "HIGH") {
            recommendations.push("Implement additional verification steps");
            recommendations.push("Monitor all transactions closely");
            recommendations.push("Consider temporary restrictions");
        }
        else if (riskLevel === "MEDIUM") {
            recommendations.push("Monitor account activity");
            recommendations.push("Send security alerts to user");
            recommendations.push("Consider additional verification");
        }
        else {
            recommendations.push("Continue normal monitoring");
        }
        return {
            score,
            riskLevel,
            factors,
            recommendations,
        };
    }
    /**
     * Detect suspicious activity patterns
     */
    static async detectSuspiciousActivity(userId) {
        const activities = [];
        // Check for multiple payment failures
        const failedPayments = await prisma.order.findMany({
            where: {
                customerId: userId,
                status: "FAILED",
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
        });
        if (failedPayments.length > 3) {
            activities.push({
                type: "PAYMENT_FAILURE_PATTERN",
                description: `Multiple payment failures detected (${failedPayments.length} in 24h)`,
                severity: "HIGH",
                timestamp: new Date(),
                details: { failedPayments: failedPayments.length, recentFailures: failedPayments.slice(0, 5) },
            });
        }
        // Check for rapid ticket purchases
        const rapidPurchases = await prisma.ticket.findMany({
            where: {
                customerId: userId,
                createdAt: {
                    gte: new Date(Date.now() - 60 * 60 * 1000),
                },
            },
            orderBy: { createdAt: "desc" },
        });
        if (rapidPurchases.length > 5) {
            activities.push({
                type: "RAPID_PURCHASE_PATTERN",
                description: `Rapid ticket purchases detected (${rapidPurchases.length} in 1h)`,
                severity: "HIGH",
                timestamp: new Date(),
                details: { purchaseCount: rapidPurchases.length, purchases: rapidPurchases.slice(0, 5) },
            });
        }
        // Check for unusual activity times (e.g., purchases at odd hours)
        const oddHourPurchases = await prisma.ticket.findMany({
            where: {
                customerId: userId,
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                },
            },
        });
        const purchasesAtNight = oddHourPurchases.filter((t) => t.createdAt.getHours() >= 2 && t.createdAt.getHours() <= 5);
        if (purchasesAtNight.length > 3) {
            activities.push({
                type: "UNUSUAL_ACTIVITY_TIME",
                description: `Purchases made at unusual hours (${purchasesAtNight.length} between 2-5 AM)`,
                severity: "MEDIUM",
                timestamp: new Date(),
                details: { nightPurchases: purchasesAtNight.length },
            });
        }
        // Check for multiple accounts with similar details
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { customerProfile: true },
        });
        if (user?.customerProfile) {
            const similarProfiles = await prisma.customerProfile.findMany({
                where: {
                    phone: user.customerProfile.phone,
                    userId: { not: userId },
                },
            });
            if (similarProfiles.length > 0) {
                activities.push({
                    type: "DUPLICATE_PHONE",
                    description: `Multiple accounts with same phone number`,
                    severity: "HIGH",
                    timestamp: new Date(),
                    details: { duplicateCount: similarProfiles.length },
                });
            }
        }
        return activities;
    }
    /**
     * Flag an account for fraud review
     */
    static async flagAccount(userId, reason, flaggedBy, severity) {
        try {
            // Check if already flagged
            const existingFlag = await prisma.fraudFlag.findFirst({
                where: {
                    userId,
                    status: "ACTIVE",
                },
            });
            if (existingFlag) {
                return {
                    success: false,
                    message: "Account already has an active fraud flag",
                };
            }
            // Create fraud flag
            const flag = await prisma.fraudFlag.create({
                data: {
                    userId,
                    reason,
                    flaggedBy,
                    severity,
                    status: "ACTIVE",
                },
            });
            // Optionally suspend account based on severity
            if (severity === "HIGH") {
                await prisma.user.update({
                    where: { id: userId },
                    data: { status: "SUSPENDED" },
                });
            }
            // Create audit log
            await prisma.auditLog.create({
                data: {
                    userId: flaggedBy,
                    role: "SUPER_ADMIN",
                    action: "FRAUD_FLAG_CREATED",
                    entity: "fraud_flag",
                    entityId: flag.id,
                    ipAddress: "unknown",
                    userAgent: "unknown",
                    requestId: "manual",
                    beforeValue: undefined,
                    afterValue: JSON.stringify({
                        userId,
                        reason,
                        severity,
                    }),
                    result: "SUCCESS",
                },
            });
            return {
                success: true,
                message: "Account flagged for fraud review",
                flagId: flag.id,
            };
        }
        catch (error) {
            console.error("Flag account error:", error);
            return {
                success: false,
                message: "Failed to flag account",
            };
        }
    }
    /**
     * Get all flagged accounts for review
     */
    static async getFlaggedAccounts(status, limit = 20, offset = 0) {
        const where = {};
        if (status) {
            where.status = status;
        }
        const flags = await prisma.fraudFlag.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        createdAt: true,
                        customerProfile: {
                            select: {
                                fullName: true,
                                phone: true,
                            },
                        },
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
        });
        const total = await prisma.fraudFlag.count({ where });
        return { flags, total };
    }
    /**
     * Resolve a fraud flag
     */
    static async resolveFlag(flagId, resolution, resolvedBy, actionTaken) {
        try {
            const flag = await prisma.fraudFlag.findUnique({
                where: { id: flagId },
                include: { user: true },
            });
            if (!flag) {
                return { success: false, message: "Flag not found" };
            }
            // Update flag
            await prisma.fraudFlag.update({
                where: { id: flagId },
                data: {
                    status: "RESOLVED",
                    resolution,
                    reviewedBy: resolvedBy,
                    reviewedAt: new Date(),
                    actionTaken,
                },
            });
            // Re-activate account if it was suspended
            if (flag.user && flag.user.status === "SUSPENDED") {
                await prisma.user.update({
                    where: { id: flag.userId },
                    data: { status: "ACTIVE" },
                });
            }
            // Create audit log
            await prisma.auditLog.create({
                data: {
                    userId: resolvedBy,
                    role: "SUPER_ADMIN",
                    action: "FRAUD_FLAG_RESOLVED",
                    entity: "fraud_flag",
                    entityId: flagId,
                    ipAddress: "unknown",
                    userAgent: "unknown",
                    requestId: "manual",
                    beforeValue: JSON.stringify({ status: "ACTIVE" }),
                    afterValue: JSON.stringify({
                        status: "RESOLVED",
                        resolution,
                        actionTaken,
                    }),
                    result: "SUCCESS",
                },
            });
            return { success: true, message: "Flag resolved successfully" };
        }
        catch (error) {
            console.error("Resolve flag error:", error);
            return { success: false, message: "Failed to resolve flag" };
        }
    }
    /**
     * Get fraud statistics
     */
    static async getFraudStatistics() {
        const totalFlags = await prisma.fraudFlag.count();
        const activeFlags = await prisma.fraudFlag.count({ where: { status: "ACTIVE" } });
        const resolvedFlags = await prisma.fraudFlag.count({ where: { status: "RESOLVED" } });
        // Get risk distribution
        const flagsBySeverity = await prisma.fraudFlag.groupBy({
            by: ["severity"],
            _count: true,
        });
        const riskDistribution = {};
        flagsBySeverity.forEach((item) => {
            riskDistribution[item.severity] = item._count;
        });
        // Get recent activity
        const recentActivity = await prisma.fraudFlag.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
                user: {
                    select: {
                        email: true,
                        customerProfile: {
                            select: { fullName: true },
                        },
                    },
                },
            },
        });
        return {
            totalFlags,
            activeFlags,
            resolvedFlags,
            riskDistribution,
            recentActivity,
        };
    }
}
export default FraudDetectionService;
