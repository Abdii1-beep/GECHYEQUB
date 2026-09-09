interface FraudRiskScore {
    score: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    factors: string[];
    recommendations: string[];
}
interface SuspiciousActivity {
    type: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    timestamp: Date;
    details: any;
}
declare class FraudDetectionService {
    /**
     * Calculate fraud risk score for a user
     */
    static calculateRiskScore(userId: string): Promise<FraudRiskScore>;
    /**
     * Detect suspicious activity patterns
     */
    static detectSuspiciousActivity(userId: string): Promise<SuspiciousActivity[]>;
    /**
     * Flag an account for fraud review
     */
    static flagAccount(userId: string, reason: string, flaggedBy: string, severity: "LOW" | "MEDIUM" | "HIGH"): Promise<{
        success: boolean;
        message: string;
        flagId?: string;
    }>;
    /**
     * Get all flagged accounts for review
     */
    static getFlaggedAccounts(status?: string, limit?: number, offset?: number): Promise<{
        flags: any[];
        total: number;
    }>;
    /**
     * Resolve a fraud flag
     */
    static resolveFlag(flagId: string, resolution: string, resolvedBy: string, actionTaken: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Get fraud statistics
     */
    static getFraudStatistics(): Promise<{
        totalFlags: number;
        activeFlags: number;
        resolvedFlags: number;
        riskDistribution: Record<string, number>;
        recentActivity: any[];
    }>;
}
export default FraudDetectionService;
