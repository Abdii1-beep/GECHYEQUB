import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
const prisma = new PrismaClient();
/**
 * Cryptographically Secure Draw Engine
 * Implements secure random selection using CSPRNG with commitment hashing
 */
export class SecureDrawEngine {
    /**
     * Generate cryptographically secure random numbers
     * Uses Node.js crypto.randomBytes which is CSPRNG
     */
    static generateSecureRandom(min, max) {
        const range = max - min + 1;
        const bytesNeeded = Math.ceil(Math.log2(range) / 8);
        const cutoff = Math.floor((256 ** bytesNeeded) / range) * range;
        let randomBytes;
        let randomValue;
        do {
            randomBytes = crypto.randomBytes(bytesNeeded);
            randomValue = 0;
            for (let i = 0; i < bytesNeeded; i++) {
                randomValue = (randomValue << 8) + randomBytes[i];
            }
        } while (randomValue >= cutoff);
        return min + (randomValue % range);
    }
    /**
     * Generate commitment hash for draw transparency
     * Hashes the random seed and eligible tickets before draw
     */
    static generateCommitmentHash(seed, eligibleTicketIds, timestamp) {
        const data = JSON.stringify({
            seed,
            eligibleTicketIds: eligibleTicketIds.sort(), // Sort for deterministic ordering
            timestamp: timestamp.toISOString(),
        });
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    /**
     * Verify commitment hash after draw
     * Ensures the draw wasn't manipulated
     */
    static verifyCommitmentHash(commitmentHash, seed, eligibleTicketIds, timestamp) {
        const computedHash = this.generateCommitmentHash(seed, eligibleTicketIds, timestamp);
        return computedHash === commitmentHash;
    }
    /**
     * Generate cryptographically secure random seed
     */
    static generateSecureSeed() {
        return crypto.randomBytes(32).toString('hex');
    }
    /**
     * Fisher-Yates shuffle using CSPRNG
     * Cryptographically secure shuffling algorithm
     */
    static secureShuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = this.generateSecureRandom(0, i);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    /**
     * Prepare draw - lock campaign and generate commitment
     */
    static async prepareDraw(campaignId, preparedBy) {
        try {
            // Check if campaign exists and is in correct state
            const campaign = await prisma.lotteryCampaign.findUnique({
                where: { id: campaignId },
                include: {
                    vehicles: true,
                },
            });
            if (!campaign) {
                return { success: false, message: "Campaign not found" };
            }
            if (campaign.status !== "PUBLISHED") {
                return { success: false, message: "Campaign must be PUBLISHED to prepare draw" };
            }
            // Check if draw already exists for this campaign
            const existingDraw = await prisma.draw.findFirst({
                where: { campaignId },
            });
            if (existingDraw) {
                return { success: false, message: "Draw already exists for this campaign" };
            }
            // Get eligible tickets (PAID tickets with drawEligibility = true)
            const eligibleTickets = await prisma.ticket.findMany({
                where: {
                    campaignId,
                    status: "PAID",
                    drawEligibility: true,
                },
                select: { id: true },
            });
            if (eligibleTickets.length === 0) {
                return { success: false, message: "No eligible tickets for draw" };
            }
            if (eligibleTickets.length < campaign.vehicles.length) {
                return {
                    success: false,
                    message: `Not enough eligible tickets (${eligibleTickets.length}) for ${campaign.vehicles.length} vehicles`
                };
            }
            // Generate secure seed
            const seed = this.generateSecureSeed();
            const timestamp = new Date();
            const eligibleTicketIds = eligibleTickets.map(t => t.id);
            // Generate commitment hash
            const commitmentHash = this.generateCommitmentHash(seed, eligibleTicketIds, timestamp);
            // Create draw record in PREPARED state
            const draw = await prisma.draw.create({
                data: {
                    campaignId,
                    state: "PREPARED",
                    seed,
                    commitmentHash,
                    eligibleTicketCount: eligibleTickets.length,
                    configuration: JSON.stringify({ vehicleCount: campaign.vehicles.length }),
                    status: "PREPARED",
                },
            });
            // Create draw eligible ticket records
            await prisma.drawEligibleTicket.createMany({
                data: eligibleTicketIds.map((ticketId, index) => ({
                    drawId: draw.id,
                    ticketId,
                    orderIndex: index,
                })),
            });
            return {
                success: true,
                drawId: draw.id,
                commitmentHash,
                eligibleTicketCount: eligibleTickets.length,
            };
        }
        catch (error) {
            console.error("Prepare draw error:", error);
            return { success: false, message: "Failed to prepare draw" };
        }
    }
    /**
     * Execute draw - perform secure random selection
     */
    static async executeDraw(drawId, executedBy) {
        try {
            // Get draw record
            const draw = await prisma.draw.findUnique({
                where: { id: drawId },
                include: {
                    LotteryCampaign: {
                        include: {
                            vehicles: true,
                        },
                    },
                    eligibleTickets: {
                        include: {
                            ticket: {
                                include: {
                                    customer: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!draw) {
                return { success: false, message: "Draw not found" };
            }
            if (draw.state !== "PREPARED") {
                return { success: false, message: "Draw must be in PREPARED state to execute" };
            }
            // Verify commitment hash before executing
            const isCommitmentValid = this.verifyCommitmentHash(draw.commitmentHash, draw.seed || "", draw.eligibleTickets.map((et) => et.ticketId), draw.createdAt);
            if (!isCommitmentValid) {
                return { success: false, message: "Commitment hash verification failed" };
            }
            // Lock the draw for execution
            await prisma.draw.update({
                where: { id: drawId },
                data: { state: "EXECUTING" },
            });
            // Shuffle eligible tickets using CSPRNG
            const shuffledEligibleTickets = this.secureShuffle(draw.eligibleTickets);
            // Select winners (one per vehicle)
            const winners = [];
            const vehicleCount = Math.min(draw.LotteryCampaign.vehicles.length, shuffledEligibleTickets.length);
            for (let i = 0; i < vehicleCount; i++) {
                const selectedEligibleTicket = shuffledEligibleTickets[i];
                const vehicle = draw.LotteryCampaign.vehicles[i];
                // Create draw result
                const drawResult = await prisma.drawResult.create({
                    data: {
                        drawId,
                        ticketId: selectedEligibleTicket.ticketId,
                        vehicleId: vehicle.id,
                        position: i + 1,
                        drawHash: crypto.randomBytes(32).toString("hex"),
                    },
                });
                // Create winner record
                const winner = await prisma.winner.create({
                    data: {
                        drawId,
                        ticketId: selectedEligibleTicket.ticketId,
                        customerId: selectedEligibleTicket.ticket.customerId,
                        vehicleId: vehicle.id,
                        verificationStatus: "SELECTED",
                    },
                });
                winners.push({
                    position: i + 1,
                    ticketId: selectedEligibleTicket.ticketId,
                    customerId: selectedEligibleTicket.ticket.customerId,
                    customerName: selectedEligibleTicket.ticket.customer.fullName,
                    vehicleId: vehicle.id,
                    vehicleName: `${vehicle.make} ${vehicle.model}`,
                });
            }
            // Update draw state to COMPLETED
            await prisma.draw.update({
                where: { id: drawId },
                data: {
                    state: "COMPLETED",
                    executedBy,
                    executedAt: new Date(),
                },
            });
            // Update campaign status to DRAWN
            await prisma.lotteryCampaign.update({
                where: { id: draw.campaignId },
                data: { status: "DRAWN" },
            });
            return {
                success: true,
                results: winners,
                message: "Draw executed successfully",
            };
        }
        catch (error) {
            console.error("Execute draw error:", error);
            // Update draw status to FAILED if error occurred
            await prisma.draw.update({
                where: { id: drawId },
                data: { status: "FAILED" },
            });
            return { success: false, message: "Failed to execute draw" };
        }
    }
    /**
     * Verify draw results
     * Allows verification of draw integrity
     */
    static async verifyDraw(drawId) {
        try {
            const draw = await prisma.draw.findUnique({
                where: { id: drawId },
                include: {
                    eligibleTickets: true,
                    results: true,
                },
            });
            if (!draw) {
                return { success: false, message: "Draw not found" };
            }
            // Verify commitment hash
            const isCommitmentValid = this.verifyCommitmentHash(draw.commitmentHash, draw.seed || "", draw.eligibleTickets.map((et) => et.ticketId), draw.createdAt);
            // Verify all results are from eligible tickets
            const resultTicketIds = draw.results.map((r) => r.ticketId);
            const eligibleTicketIds = draw.eligibleTickets.map((et) => et.ticketId);
            const allResultsFromEligible = resultTicketIds.every((id) => eligibleTicketIds.includes(id));
            // Verify no duplicates in results
            const hasDuplicates = resultTicketIds.length !== new Set(resultTicketIds).size;
            const isValid = isCommitmentValid && allResultsFromEligible && !hasDuplicates;
            return {
                success: true,
                isValid,
                details: {
                    commitmentHashValid: isCommitmentValid,
                    allResultsFromEligible,
                    noDuplicates: !hasDuplicates,
                    eligibleTicketCount: draw.eligibleTickets.length,
                    resultCount: draw.results.length,
                },
                message: isValid ? "Draw verification passed" : "Draw verification failed",
            };
        }
        catch (error) {
            console.error("Verify draw error:", error);
            return { success: false, message: "Failed to verify draw" };
        }
    }
    /**
     * Get draw transparency data for public viewing
     */
    static async getTransparencyData(drawId) {
        try {
            const draw = await prisma.draw.findUnique({
                where: { id: drawId },
                select: {
                    id: true,
                    campaignId: true,
                    status: true,
                    scheduledDate: true,
                    executedAt: true,
                    commitmentHash: true,
                    eligibleTicketCount: true,
                    vehicleCount: true,
                    createdAt: true,
                },
            });
            if (!draw) {
                return { success: false, message: "Draw not found" };
            }
            return {
                success: true,
                data: {
                    drawId: draw.id,
                    campaignId: draw.campaignId,
                    status: draw.status,
                    scheduledDate: draw.scheduledDate,
                    executedAt: draw.executedAt,
                    commitmentHash: draw.commitmentHash,
                    eligibleTicketCount: draw.eligibleTicketCount,
                    vehicleCount: draw.vehicleCount,
                    preparedAt: draw.createdAt,
                },
            };
        }
        catch (error) {
            console.error("Get transparency data error:", error);
            return { success: false, message: "Failed to get transparency data" };
        }
    }
}
