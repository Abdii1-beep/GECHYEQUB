import { PaymentProvider as PaymentProviderEnum } from "@prisma/client";
import { PaymentProviderInterface } from "./PaymentProvider";
/**
 * Payment Provider Factory
 * Creates and manages payment provider instances
 */
export declare class PaymentProviderFactory {
    private static providers;
    private static configs;
    /**
     * Register a payment provider configuration
     */
    static registerConfig(provider: PaymentProviderEnum, config: Record<string, any>): void;
    /**
     * Get payment provider instance
     */
    static getProvider(provider: PaymentProviderEnum): PaymentProviderInterface | null;
    /**
     * Get all available providers
     */
    static getAvailableProviders(): PaymentProviderEnum[];
    /**
     * Clear cached provider instances
     */
    static clearCache(): void;
    /**
     * Initialize with environment variables
     */
    static initializeFromEnv(): void;
}
