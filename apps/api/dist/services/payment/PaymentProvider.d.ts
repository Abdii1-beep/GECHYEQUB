import { PaymentProvider } from "@prisma/client";
export interface PaymentRequest {
    amount: number;
    currency: string;
    customerId: string;
    orderId: string;
    description?: string;
    returnUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, any>;
}
export interface PaymentResponse {
    success: boolean;
    paymentId?: string;
    paymentUrl?: string;
    status: string;
    message: string;
    providerReference?: string;
    metadata?: Record<string, any>;
}
export interface PaymentVerificationRequest {
    paymentId: string;
    providerReference: string;
    amount: number;
}
export interface PaymentVerificationResponse {
    success: boolean;
    status: string;
    verified: boolean;
    amount?: number;
    transactionId?: string;
    message: string;
    metadata?: Record<string, any>;
}
export interface RefundRequest {
    paymentId: string;
    amount: number;
    reason?: string;
}
export interface RefundResponse {
    success: boolean;
    refundId?: string;
    status: string;
    message: string;
    metadata?: Record<string, any>;
}
/**
 * Abstract base class for payment providers
 * All payment provider implementations must extend this class
 */
export declare abstract class PaymentProviderInterface {
    protected provider: PaymentProvider;
    protected config: Record<string, any>;
    constructor(provider: PaymentProvider, config: Record<string, any>);
    /**
     * Initialize payment - create payment request and return payment URL
     */
    abstract initiatePayment(request: PaymentRequest): Promise<PaymentResponse>;
    /**
     * Verify payment status from provider
     */
    abstract verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse>;
    /**
     * Process refund
     */
    abstract processRefund(request: RefundRequest): Promise<RefundResponse>;
    /**
     * Get provider-specific configuration validation
     */
    abstract validateConfig(): boolean;
    /**
     * Get provider name
     */
    getProviderName(): string;
    /**
     * Check if provider is available
     */
    isAvailable(): boolean;
}
