import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import { PrismaClient, PaymentProvider as PaymentProviderEnum } from "@prisma/client";
import { PaymentProviderFactory } from "../services/payment/PaymentProviderFactory";
const router = Router();
const prisma = new PrismaClient();
// Helper function to create audit log
const createAuditLog = async (userId, role, action, entity, entityId, req, result, beforeValue, afterValue) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                role,
                action,
                entity,
                entityId,
                ipAddress: req.ip || req.socket.remoteAddress || "unknown",
                userAgent: req.headers["user-agent"] || "unknown",
                requestId: req.requestId || "unknown",
                beforeValue: beforeValue ? beforeValue : undefined,
                afterValue: afterValue ? afterValue : undefined,
                result,
            },
        });
    }
    catch (error) {
        console.error("Failed to create audit log:", error);
    }
};
// @route   POST /api/payments/initiate
// @desc    Initiate payment using provider abstraction
// @access  Private
router.post("/initiate", authenticateToken, async (req, res) => {
    try {
        const { orderId, amount, currency, provider } = req.body;
        if (!orderId) {
            return res.status(400).json({ message: "Order ID required" });
        }
        // Get customer info
        const order = await prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.status !== "INITIATED") {
            return res.status(400).json({
                message: "Order payment already processed",
            });
        }
        // Get customer info from ticket
        const ticket = await prisma.ticket.findUnique({
            where: { id: order.ticketId },
        });
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }
        const customer = await prisma.customerProfile.findUnique({
            where: { id: ticket.customerId },
        });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        // Use configured provider or default to CBE
        const providerName = provider || PaymentProviderEnum.CBE;
        const paymentProvider = PaymentProviderFactory.getProvider(providerName);
        if (!paymentProvider) {
            return res.status(500).json({
                message: `Payment provider ${providerName} is not available or not configured`
            });
        }
        // Prepare payment request
        const paymentRequest = {
            amount: amount || order.amount,
            currency: currency || order.currency || "ETB",
            customerId: customer.id,
            orderId: order.id,
            description: "Car Lottery Ticket Purchase",
            returnUrl: `${process.env.FRONTEND_URL}/payment/success`,
            cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel`,
            metadata: {
                orderId: order.id,
                customerId: customer.id,
            },
        };
        // Initiate payment through provider
        const result = await paymentProvider.initiatePayment(paymentRequest);
        if (!result.success) {
            return res.status(400).json({
                message: result.message || "Payment initiation failed",
                provider: providerName,
            });
        }
        // Update order with provider transaction ID
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                provider: providerName,
                providerTxnId: result.providerReference,
                status: "PENDING",
            },
        });
        // Create payment transaction record
        const paymentTransaction = await prisma.paymentTransaction.create({
            data: {
                orderId,
                provider: providerName,
                providerTxnId: result.providerReference || result.paymentId,
                amount: paymentRequest.amount,
                currency: paymentRequest.currency,
                status: "PENDING",
                requestMetadata: paymentRequest.metadata,
            },
        });
        await createAuditLog(req.userId, req.role, "INITIATE_PAYMENT", "PaymentTransaction", paymentTransaction.id, req, "SUCCESS", { orderStatus: "INITIATED" }, { orderStatus: "PENDING", providerTxnId: result.providerReference });
        res.json({
            message: "Payment initiated successfully",
            order: updatedOrder,
            paymentTransaction,
            paymentId: result.paymentId,
            paymentUrl: result.paymentUrl,
            providerReference: result.providerReference,
        });
    }
    catch (error) {
        console.error("Initiate payment error:", error);
        res.status(500).json({ message: "Server error during payment initiation" });
    }
});
// @route   POST /api/payments/verify
// @desc    Server-side payment verification
// @access  Private (admin or system)
router.post("/verify", authenticateToken, authorizeRoles("SUPER_ADMIN", "FINANCE_OFFICER"), async (req, res) => {
    try {
        const { transactionId, paymentId } = req.body;
        if (!transactionId && !paymentId) {
            return res.status(400).json({ message: "Transaction ID or Payment ID required" });
        }
        // Find payment transaction
        const paymentTxn = await prisma.paymentTransaction.findUnique({
            where: { id: transactionId || paymentId },
        });
        if (!paymentTxn) {
            return res.status(404).json({ message: "Payment transaction not found" });
        }
        // Get order for provider info
        const order = await prisma.order.findUnique({
            where: { id: paymentTxn.orderId },
        });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Get provider instance from order's provider
        const paymentProvider = PaymentProviderFactory.getProvider(order.provider);
        if (!paymentProvider) {
            return res.status(500).json({
                message: `Payment provider ${order.provider} is not available`
            });
        }
        // Prepare verification request
        const verificationRequest = {
            paymentId: paymentTxn.id,
            providerReference: order.providerTxnId || "",
            amount: paymentTxn.amount,
        };
        // Verify payment through provider
        const result = await paymentProvider.verifyPayment(verificationRequest);
        const beforeValue = { status: paymentTxn.status };
        if (!result.success || !result.verified) {
            // Mark as failed
            await prisma.paymentTransaction.update({
                where: { id: paymentTxn.id },
                data: { status: "FAILED" },
            });
            await prisma.order.update({
                where: { id: order.id },
                data: { status: "FAILED", failureReason: result.message || "Verification failed" },
            });
            await createAuditLog(req.userId, req.role, "VERIFY_PAYMENT", "PaymentTransaction", paymentTxn.id, req, "FAILED", beforeValue, { status: "FAILED", verificationResult: result });
            return res.status(400).json({
                message: result.message || "Payment verification failed",
                verificationResult: result,
            });
        }
        // Update payment transaction to SUCCESS
        const updatedPaymentTxn = await prisma.paymentTransaction.update({
            where: { id: paymentTxn.id },
            data: {
                status: "SUCCESS",
                responseMetadata: result.metadata,
            },
        });
        // Update order to SUCCESS
        await prisma.order.update({
            where: { id: paymentTxn.orderId },
            data: {
                status: "SUCCESS",
                paymentMethod: `via ${order.provider}`,
            },
        });
        // Update associated tickets to PAID
        const tickets = await prisma.ticket.findMany({
            where: { purchaseId: paymentTxn.orderId },
        });
        for (const ticket of tickets) {
            await prisma.ticket.update({
                where: { id: ticket.id },
                data: {
                    status: "PAID",
                    drawEligibility: true,
                    paymentId: paymentTxn.id,
                },
            });
        }
        await createAuditLog(req.userId, req.role, "VERIFY_PAYMENT", "PaymentTransaction", paymentTxn.id, req, "SUCCESS", beforeValue, { status: "SUCCESS", verificationResult: result, ticketsUpdated: tickets.length });
        res.json({
            message: "Payment verified successfully",
            paymentTransaction: updatedPaymentTxn,
            verificationResult: result,
            ticketsUpdated: tickets.length,
        });
    }
    catch (error) {
        console.error("Verify payment error:", error);
        res.status(500).json({ message: "Server error during payment verification" });
    }
});
// @route   POST /api/payments/webhook
// @desc    Handle payment provider webhooks
// @access  Public (with signature verification)
router.post("/webhook/:provider", async (req, res) => {
    try {
        const { provider } = req.params;
        const webhookData = req.body;
        // Verify webhook signature (implementation depends on provider)
        // This is a simplified version - production should verify signatures
        // Find payment transaction by provider reference
        const paymentTxn = await prisma.paymentTransaction.findFirst({
            where: { id: webhookData.transaction_id || webhookData.provider_ref },
        });
        if (!paymentTxn) {
            return res.status(404).json({ message: "Payment transaction not found" });
        }
        // Get order for provider info
        const order = await prisma.order.findUnique({
            where: { id: paymentTxn.orderId },
        });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Process based on webhook status
        if (webhookData.status === "SUCCESS" || webhookData.status === "COMPLETED") {
            // Update payment transaction
            await prisma.paymentTransaction.update({
                where: { id: paymentTxn.id },
                data: {
                    status: "SUCCESS",
                    responseMetadata: webhookData,
                },
            });
            // Update order
            await prisma.order.update({
                where: { id: paymentTxn.orderId },
                data: { status: "SUCCESS" },
            });
            // Update tickets
            const tickets = await prisma.ticket.findMany({
                where: { purchaseId: paymentTxn.orderId },
            });
            for (const ticket of tickets) {
                await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: {
                        status: "PAID",
                        drawEligibility: true,
                        paymentId: paymentTxn.id,
                    },
                });
            }
        }
        else if (webhookData.status === "FAILED") {
            await prisma.paymentTransaction.update({
                where: { id: paymentTxn.id },
                data: {
                    status: "FAILED",
                    responseMetadata: webhookData,
                },
            });
            await prisma.order.update({
                where: { id: paymentTxn.orderId },
                data: { status: "FAILED" },
            });
        }
        res.json({ message: "Webhook processed successfully" });
    }
    catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).json({ message: "Webhook processing failed" });
    }
});
// @route   POST /api/payments/refund
// @desc    Process refund
// @access  Private (FINANCE_OFFICER+)
router.post("/refund", authenticateToken, authorizeRoles("SUPER_ADMIN", "FINANCE_OFFICER"), async (req, res) => {
    try {
        const { transactionId, amount, reason } = req.body;
        if (!transactionId) {
            return res.status(400).json({ message: "Transaction ID required" });
        }
        // Find payment transaction
        const paymentTxn = await prisma.paymentTransaction.findUnique({
            where: { id: transactionId },
        });
        if (!paymentTxn) {
            return res.status(404).json({ message: "Payment transaction not found" });
        }
        // Get order for provider info
        const order = await prisma.order.findUnique({
            where: { id: paymentTxn.orderId },
        });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (paymentTxn.status !== "SUCCESS") {
            return res.status(400).json({
                message: "Cannot refund non-successful payment",
            });
        }
        // Get provider instance from order's provider
        const paymentProvider = PaymentProviderFactory.getProvider(order.provider);
        if (!paymentProvider) {
            return res.status(500).json({
                message: `Payment provider ${order.provider} is not available`
            });
        }
        // Prepare refund request
        const refundRequest = {
            paymentId: paymentTxn.id,
            amount: amount || paymentTxn.amount,
            reason: reason || "Customer request",
        };
        const beforeValue = { status: paymentTxn.status };
        // Process refund through provider
        const result = await paymentProvider.processRefund(refundRequest);
        if (!result.success) {
            return res.status(400).json({
                message: result.message || "Refund failed",
            });
        }
        // Update payment transaction
        const updatedPaymentTxn = await prisma.paymentTransaction.update({
            where: { id: paymentTxn.id },
            data: {
                status: "REFUNDED",
                responseMetadata: JSON.stringify({
                    ...(typeof paymentTxn.responseMetadata === 'string' ? JSON.parse(paymentTxn.responseMetadata) : paymentTxn.responseMetadata),
                    refundId: result.refundId,
                    refundReason: reason,
                    refundedAt: new Date().toISOString(),
                }),
            },
        });
        // Update order
        await prisma.order.update({
            where: { id: paymentTxn.orderId },
            data: { status: "REFUNDED" },
        });
        // Update associated tickets to REFUNDED
        const tickets = await prisma.ticket.findMany({
            where: { purchaseId: paymentTxn.orderId },
        });
        for (const ticket of tickets) {
            await prisma.ticket.update({
                where: { id: ticket.id },
                data: {
                    status: "REFUNDED",
                    drawEligibility: false,
                },
            });
        }
        await createAuditLog(req.userId, req.role, "PROCESS_REFUND", "PaymentTransaction", paymentTxn.id, req, "SUCCESS", beforeValue, { status: "REFUNDED", refundId: result.refundId, ticketsUpdated: tickets.length });
        res.json({
            message: "Refund processed successfully",
            paymentTransaction: updatedPaymentTxn,
            refundId: result.refundId,
            ticketsUpdated: tickets.length,
        });
    }
    catch (error) {
        console.error("Process refund error:", error);
        res.status(500).json({ message: "Server error during refund processing" });
    }
});
// @route   GET /api/payments/my-transactions
// @desc    Get user's payment transactions
// @access  Private
router.get("/my-transactions", authenticateToken, async (req, res) => {
    try {
        // Get user's tickets first to find their orders
        const tickets = await prisma.ticket.findMany({
            where: { customerId: req.customerId },
            select: { id: true },
        });
        const ticketIds = tickets.map(t => t.id);
        // Get orders for these tickets
        const orders = await prisma.order.findMany({
            where: { ticketId: { in: ticketIds } },
            select: { id: true },
        });
        const orderIds = orders.map(o => o.id);
        // Get payment transactions for these orders
        const transactions = await prisma.paymentTransaction.findMany({
            where: { orderId: { in: orderIds } },
            orderBy: { createdAt: "desc" },
        });
        res.json({ transactions });
    }
    catch (error) {
        console.error("Get my transactions error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// @route   GET /api/payments/:id
// @desc    Get payment transaction details
// @access  Private (owner or admin)
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const transaction = await prisma.paymentTransaction.findUnique({
            where: { id: req.params.id },
        });
        if (!transaction) {
            return res.status(404).json({ message: "Payment transaction not found" });
        }
        // Get order
        const order = await prisma.order.findUnique({
            where: { id: transaction.orderId },
        });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Get customer through ticket
        let customer = null;
        if (order.ticketId) {
            const ticket = await prisma.ticket.findUnique({
                where: { id: order.ticketId },
                select: { customerId: true },
            });
            if (ticket) {
                customer = await prisma.customerProfile.findUnique({
                    where: { id: ticket.customerId },
                });
            }
        }
        // Check authorization
        const isAdmin = req.role === "SUPER_ADMIN" ||
            req.role === "FINANCE_OFFICER" ||
            req.role === "AUDITOR";
        const isOwner = customer && customer.id === req.customerId;
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: "Not authorized to view this transaction" });
        }
        res.json({ transaction, order });
    }
    catch (error) {
        console.error("Get payment transaction error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
export default router;
