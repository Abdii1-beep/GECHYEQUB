import QRCode from "qrcode";
import crypto from "crypto";
/**
 * QR Code Service for generating and validating QR codes for lottery tickets
 */
class QRCodeService {
    /**
     * Generate a QR code for a ticket
     * @param ticketId - The unique ticket ID
     * @param ticketNumber - The ticket number (e.g., ECL-2026-XXXXXX)
     * @param campaignId - The campaign ID
     * @returns QR code data URL
     */
    static async generateTicketQRCode(ticketId, ticketNumber, campaignId) {
        try {
            // Create a payload with ticket information
            const payload = {
                tid: ticketId,
                tn: ticketNumber,
                cid: campaignId,
                ts: Date.now(),
            };
            // Sign the payload for security
            const signature = this.signPayload(payload);
            const signedPayload = { ...payload, sig: signature };
            // Convert to JSON string
            const payloadString = JSON.stringify(signedPayload);
            // Generate QR code
            const qrCodeDataURL = await QRCode.toDataURL(payloadString, {
                width: 300,
                margin: 2,
                color: {
                    dark: "#000000",
                    light: "#FFFFFF",
                },
                errorCorrectionLevel: "H", // High error correction for better scanning
            });
            return qrCodeDataURL;
        }
        catch (error) {
            console.error("QR code generation error:", error);
            throw new Error("Failed to generate QR code");
        }
    }
    /**
     * Generate a QR code for ticket verification
     * @param ticketNumber - The ticket number
     * @returns QR code data URL
     */
    static async generateVerificationQRCode(ticketNumber) {
        try {
            const payload = {
                tn: ticketNumber,
                type: "VERIFY",
                ts: Date.now(),
            };
            const signature = this.signPayload(payload);
            const signedPayload = { ...payload, sig: signature };
            const payloadString = JSON.stringify(signedPayload);
            const qrCodeDataURL = await QRCode.toDataURL(payloadString, {
                width: 200,
                margin: 1,
                errorCorrectionLevel: "M",
            });
            return qrCodeDataURL;
        }
        catch (error) {
            console.error("Verification QR code generation error:", error);
            throw new Error("Failed to generate verification QR code");
        }
    }
    /**
     * Validate a QR code payload
     * @param payloadString - The JSON string from the QR code
     * @returns Validation result
     */
    static validateQRCodePayload(payloadString) {
        try {
            const payload = JSON.parse(payloadString);
            // Check if signature exists
            if (!payload.sig) {
                return { valid: false, error: "Missing signature" };
            }
            // Verify signature
            const signature = payload.sig;
            delete payload.sig;
            const expectedSignature = this.signPayload(payload);
            if (signature !== expectedSignature) {
                return { valid: false, error: "Invalid signature" };
            }
            // Check timestamp (QR codes should be valid for 1 year)
            if (payload.ts) {
                const age = Date.now() - payload.ts;
                const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
                if (age > maxAge) {
                    return { valid: false, error: "QR code expired" };
                }
            }
            return { valid: true, data: payload };
        }
        catch (error) {
            return { valid: false, error: "Invalid QR code format" };
        }
    }
    /**
     * Sign a payload with a secret key
     * @param payload - The payload to sign
     * @returns Signature string
     */
    static signPayload(payload) {
        const secret = process.env.QR_SECRET_KEY || "ethiopian-car-lottery-qr-secret";
        const payloadString = JSON.stringify(payload);
        return crypto
            .createHmac("sha256", secret)
            .update(payloadString)
            .digest("hex");
    }
    /**
     * Generate a batch of QR codes for multiple tickets
     * @param tickets - Array of ticket data
     * @returns Array of QR code data URLs
     */
    static async generateBatchQRCodes(tickets) {
        const results = await Promise.all(tickets.map(async (ticket) => {
            const qrCode = await this.generateTicketQRCode(ticket.id, ticket.ticketNumber, ticket.campaignId);
            return { ticketId: ticket.id, qrCode };
        }));
        return results;
    }
    /**
     * Generate QR code as SVG (for high-quality printing)
     * @param ticketId - The unique ticket ID
     * @param ticketNumber - The ticket number
     * @param campaignId - The campaign ID
     * @returns QR code SVG string
     */
    static async generateTicketQRCodeSVG(ticketId, ticketNumber, campaignId) {
        try {
            const payload = {
                tid: ticketId,
                tn: ticketNumber,
                cid: campaignId,
                ts: Date.now(),
            };
            const signature = this.signPayload(payload);
            const signedPayload = { ...payload, sig: signature };
            const payloadString = JSON.stringify(signedPayload);
            const qrCodeSVG = await QRCode.toString(payloadString, {
                type: "svg",
                width: 300,
                margin: 2,
                errorCorrectionLevel: "H",
            });
            return qrCodeSVG;
        }
        catch (error) {
            console.error("QR code SVG generation error:", error);
            throw new Error("Failed to generate QR code SVG");
        }
    }
    /**
     * Generate QR code with custom styling
     * @param ticketId - The unique ticket ID
     * @param ticketNumber - The ticket number
     * @param campaignId - The campaign ID
     * @param options - Customization options
     * @returns QR code data URL
     */
    static async generateStyledQRCode(ticketId, ticketNumber, campaignId, options = {}) {
        try {
            const payload = {
                tid: ticketId,
                tn: ticketNumber,
                cid: campaignId,
                ts: Date.now(),
            };
            const signature = this.signPayload(payload);
            const signedPayload = { ...payload, sig: signature };
            const payloadString = JSON.stringify(signedPayload);
            const qrCodeDataURL = await QRCode.toDataURL(payloadString, {
                width: options.width || 300,
                margin: 2,
                color: {
                    dark: options.color || "#000000",
                    light: options.backgroundColor || "#FFFFFF",
                },
                errorCorrectionLevel: "H",
            });
            return qrCodeDataURL;
        }
        catch (error) {
            console.error("Styled QR code generation error:", error);
            throw new Error("Failed to generate styled QR code");
        }
    }
}
export default QRCodeService;
