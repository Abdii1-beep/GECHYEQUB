/**
 * Cryptographically Secure Draw Engine
 * Implements secure random selection using CSPRNG with commitment hashing
 */
export declare class SecureDrawEngine {
    /**
     * Generate cryptographically secure random numbers
     * Uses Node.js crypto.randomBytes which is CSPRNG
     */
    private static generateSecureRandom;
    /**
     * Generate commitment hash for draw transparency
     * Hashes the random seed and eligible tickets before draw
     */
    private static generateCommitmentHash;
    /**
     * Verify commitment hash after draw
     * Ensures the draw wasn't manipulated
     */
    private static verifyCommitmentHash;
    /**
     * Generate cryptographically secure random seed
     */
    private static generateSecureSeed;
    /**
     * Fisher-Yates shuffle using CSPRNG
     * Cryptographically secure shuffling algorithm
     */
    private static secureShuffle;
    /**
     * Prepare draw - lock campaign and generate commitment
     */
    static prepareDraw(campaignId: string, preparedBy: string): Promise<{
        success: boolean;
        drawId?: string;
        commitmentHash?: string;
        eligibleTicketCount?: number;
        message?: string;
    }>;
    /**
     * Execute draw - perform secure random selection
     */
    static executeDraw(drawId: string, executedBy: string): Promise<{
        success: boolean;
        results?: any[];
        message?: string;
    }>;
    /**
     * Verify draw results
     * Allows verification of draw integrity
     */
    static verifyDraw(drawId: string): Promise<{
        success: boolean;
        isValid?: boolean;
        details?: any;
        message?: string;
    }>;
    /**
     * Get draw transparency data for public viewing
     */
    static getTransparencyData(drawId: string): Promise<{
        success: boolean;
        data?: any;
        message?: string;
    }>;
}
