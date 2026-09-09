import { PaymentProviderInterface, PaymentRequest, PaymentResponse, PaymentVerificationRequest, PaymentVerificationResponse, RefundRequest, RefundResponse } from "./PaymentProvider";
/**
 * Commercial Bank of Ethiopia (CBE) Payment Provider Implementation
 * Implements payment processing using CBE's payment gateway
 */
export declare class CBEProvider extends PaymentProviderInterface {
    private apiKey;
    private merchantId;
    private secretKey;
    private apiUrl;
    constructor(config: Record<string, any>);
    validateConfig(): boolean;
    initiatePayment(request: PaymentRequest): Promise<PaymentResponse>;
    verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse>;
    processRefund(request: RefundRequest): Promise<RefundResponse>;
    private generateTransactionRef;
    private generateSignature;
    private makeCBERequest;
}
