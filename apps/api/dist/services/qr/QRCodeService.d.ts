/**
 * QR Code Service for generating and validating QR codes for lottery tickets
 */
declare class QRCodeService {
    /**
     * Generate a QR code for a ticket
     * @param ticketId - The unique ticket ID
     * @param ticketNumber - The ticket number (e.g., ECL-2026-XXXXXX)
     * @param campaignId - The campaign ID
     * @returns QR code data URL
     */
    static generateTicketQRCode(ticketId: string, ticketNumber: string, campaignId: string): Promise<string>;
    /**
     * Generate a QR code for ticket verification
     * @param ticketNumber - The ticket number
     * @returns QR code data URL
     */
    static generateVerificationQRCode(ticketNumber: string): Promise<string>;
    /**
     * Validate a QR code payload
     * @param payloadString - The JSON string from the QR code
     * @returns Validation result
     */
    static validateQRCodePayload(payloadString: string): {
        valid: boolean;
        data?: any;
        error?: string;
    };
    /**
     * Sign a payload with a secret key
     * @param payload - The payload to sign
     * @returns Signature string
     */
    private static signPayload;
    /**
     * Generate a batch of QR codes for multiple tickets
     * @param tickets - Array of ticket data
     * @returns Array of QR code data URLs
     */
    static generateBatchQRCodes(tickets: Array<{
        id: string;
        ticketNumber: string;
        campaignId: string;
    }>): Promise<Array<{
        ticketId: string;
        qrCode: string;
    }>>;
    /**
     * Generate QR code as SVG (for high-quality printing)
     * @param ticketId - The unique ticket ID
     * @param ticketNumber - The ticket number
     * @param campaignId - The campaign ID
     * @returns QR code SVG string
     */
    static generateTicketQRCodeSVG(ticketId: string, ticketNumber: string, campaignId: string): Promise<string>;
    /**
     * Generate QR code with custom styling
     * @param ticketId - The unique ticket ID
     * @param ticketNumber - The ticket number
     * @param campaignId - The campaign ID
     * @param options - Customization options
     * @returns QR code data URL
     */
    static generateStyledQRCode(ticketId: string, ticketNumber: string, campaignId: string, options?: {
        color?: string;
        backgroundColor?: string;
        width?: number;
    }): Promise<string>;
}
export default QRCodeService;
