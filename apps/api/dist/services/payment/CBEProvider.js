import { PaymentProviderInterface } from "./PaymentProvider";
import { PaymentProvider as PaymentProviderEnum } from "@prisma/client";
import crypto from "crypto";
/**
 * Commercial Bank of Ethiopia (CBE) Payment Provider Implementation
 * Implements payment processing using CBE's payment gateway
 */
export class CBEProvider extends PaymentProviderInterface {
    apiKey;
    merchantId;
    secretKey;
    apiUrl;
    constructor(config) {
        super(PaymentProviderEnum.CBE, config);
        this.apiKey = config.apiKey || "";
        this.merchantId = config.merchantId || "";
        this.secretKey = config.secretKey || "";
        this.apiUrl = config.apiUrl || "https://api.cbe.com.et/v1";
    }
    validateConfig() {
        return !!(this.apiKey && this.merchantId && this.secretKey && this.apiUrl);
    }
    async initiatePayment(request) {
        try {
            if (!this.validateConfig()) {
                return {
                    success: false,
                    status: "FAILED",
                    message: "CBE provider configuration is invalid",
                };
            }
            // Generate unique transaction reference
            const transactionRef = this.generateTransactionRef(request.orderId);
            // Prepare payment request payload
            const payload = {
                merchant_id: this.merchantId,
                amount: request.amount,
                currency: request.currency,
                transaction_ref: transactionRef,
                customer_id: request.customerId,
                order_id: request.orderId,
                description: request.description || "Car Lottery Ticket Purchase",
                return_url: request.returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
                cancel_url: request.cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`,
                timestamp: new Date().toISOString(),
            };
            // Generate signature
            const signature = this.generateSignature(payload);
            // Make API request to CBE payment gateway
            const response = await this.makeCBERequest("/payments/initiate", {
                ...payload,
                signature,
            });
            if (response.success) {
                return {
                    success: true,
                    paymentId: response.payment_id,
                    paymentUrl: response.payment_url,
                    status: "INITIATED",
                    message: "Payment initiated successfully",
                    providerReference: transactionRef,
                    metadata: {
                        transactionRef,
                        paymentId: response.payment_id,
                    },
                };
            }
            else {
                return {
                    success: false,
                    status: "FAILED",
                    message: response.message || "Failed to initiate payment",
                };
            }
        }
        catch (error) {
            console.error("CBE initiate payment error:", error);
            return {
                success: false,
                status: "FAILED",
                message: "Payment initiation failed due to system error",
            };
        }
    }
    async verifyPayment(request) {
        try {
            if (!this.validateConfig()) {
                return {
                    success: false,
                    status: "FAILED",
                    verified: false,
                    message: "CBE provider configuration is invalid",
                };
            }
            // Prepare verification request
            const payload = {
                merchant_id: this.merchantId,
                payment_id: request.paymentId,
                transaction_ref: request.providerReference,
                amount: request.amount,
                timestamp: new Date().toISOString(),
            };
            const signature = this.generateSignature(payload);
            // Make verification request to CBE
            const response = await this.makeCBERequest("/payments/verify", {
                ...payload,
                signature,
            });
            if (response.verified && response.status === "COMPLETED") {
                return {
                    success: true,
                    status: "COMPLETED",
                    verified: true,
                    amount: response.amount,
                    transactionId: response.transaction_id,
                    message: "Payment verified successfully",
                    metadata: {
                        verificationTime: response.verified_at,
                    },
                };
            }
            else if (response.status === "PENDING") {
                return {
                    success: true,
                    status: "PENDING",
                    verified: false,
                    message: "Payment is still being processed",
                };
            }
            else {
                return {
                    success: true,
                    status: response.status || "FAILED",
                    verified: false,
                    message: response.message || "Payment verification failed",
                };
            }
        }
        catch (error) {
            console.error("CBE verify payment error:", error);
            return {
                success: false,
                status: "FAILED",
                verified: false,
                message: "Payment verification failed due to system error",
            };
        }
    }
    async processRefund(request) {
        try {
            if (!this.validateConfig()) {
                return {
                    success: false,
                    status: "FAILED",
                    message: "CBE provider configuration is invalid",
                };
            }
            const payload = {
                merchant_id: this.merchantId,
                payment_id: request.paymentId,
                amount: request.amount,
                reason: request.reason || "Customer request",
                timestamp: new Date().toISOString(),
            };
            const signature = this.generateSignature(payload);
            const response = await this.makeCBERequest("/payments/refund", {
                ...payload,
                signature,
            });
            if (response.success) {
                return {
                    success: true,
                    refundId: response.refund_id,
                    status: "PROCESSING",
                    message: "Refund initiated successfully",
                    metadata: {
                        refundId: response.refund_id,
                    },
                };
            }
            else {
                return {
                    success: false,
                    status: "FAILED",
                    message: response.message || "Failed to process refund",
                };
            }
        }
        catch (error) {
            console.error("CBE process refund error:", error);
            return {
                success: false,
                status: "FAILED",
                message: "Refund processing failed due to system error",
            };
        }
    }
    generateTransactionRef(orderId) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `CBE-${orderId}-${timestamp}-${random}`.toUpperCase();
    }
    generateSignature(payload) {
        const data = JSON.stringify(payload);
        return crypto
            .createHmac("sha256", this.secretKey)
            .update(data)
            .digest("hex");
    }
    async makeCBERequest(endpoint, payload) {
        // In production, this would make actual HTTP requests to CBE API
        // For now, return mock response
        console.log(`CBE API Request: ${this.apiUrl}${endpoint}`, payload);
        // Mock response for development
        return {
            success: true,
            payment_id: `CBE-${Date.now()}`,
            payment_url: `https://cbe-payment-gateway.com/pay/${payload.transaction_ref}`,
            message: "Payment initiated",
        };
    }
}
