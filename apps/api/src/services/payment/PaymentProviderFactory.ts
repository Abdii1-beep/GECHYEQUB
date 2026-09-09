import { PaymentProvider as PaymentProviderEnum } from "@prisma/client";
import { PaymentProviderInterface } from "./PaymentProvider";
import { CBEProvider } from "./CBEProvider";
import { BIRRProvider } from "./BIRRProvider";

/**
 * Payment Provider Factory
 * Creates and manages payment provider instances
 */
export class PaymentProviderFactory {
  private static providers: Map<PaymentProviderEnum, PaymentProviderInterface> = new Map();
  private static configs: Map<PaymentProviderEnum, Record<string, any>> = new Map();

  /**
   * Register a payment provider configuration
   */
  static registerConfig(provider: PaymentProviderEnum, config: Record<string, any>): void {
    this.configs.set(provider, config);
  }

  /**
   * Get payment provider instance
   */
  static getProvider(provider: PaymentProviderEnum): PaymentProviderInterface | null {
    // Return cached instance if available
    if (this.providers.has(provider)) {
      return this.providers.get(provider)!;
    }

    // Get configuration
    const config = this.configs.get(provider);
    if (!config) {
      console.error(`No configuration found for provider: ${provider}`);
      return null;
    }

    // Create new instance based on provider type
    let providerInstance: PaymentProviderInterface;

    switch (provider) {
      case PaymentProviderEnum.CBE:
        providerInstance = new CBEProvider(config);
        break;
      case PaymentProviderEnum.BIRR:
        providerInstance = new BIRRProvider(config);
        break;
      default:
        console.error(`Unsupported payment provider: ${provider}`);
        return null;
    }

    // Validate provider configuration
    if (!providerInstance.validateConfig()) {
      console.error(`Invalid configuration for provider: ${provider}`);
      return null;
    }

    // Cache and return instance
    this.providers.set(provider, providerInstance);
    return providerInstance;
  }

  /**
   * Get all available providers
   */
  static getAvailableProviders(): PaymentProviderEnum[] {
    const available: PaymentProviderEnum[] = [];
    
    for (const [provider, config] of this.configs.entries()) {
      const instance = this.getProvider(provider);
      if (instance && instance.isAvailable()) {
        available.push(provider);
      }
    }

    return available;
  }

  /**
   * Clear cached provider instances
   */
  static clearCache(): void {
    this.providers.clear();
  }

  /**
   * Initialize with environment variables
   */
  static initializeFromEnv(): void {
    // CBE Configuration
    if (process.env.CBE_API_KEY && process.env.CBE_MERCHANT_ID && process.env.CBE_SECRET_KEY) {
      this.registerConfig(PaymentProviderEnum.CBE, {
        apiKey: process.env.CBE_API_KEY,
        merchantId: process.env.CBE_MERCHANT_ID,
        secretKey: process.env.CBE_SECRET_KEY,
        apiUrl: process.env.CBE_API_URL || "https://api.cbe.com.et/v1",
      });
    }

    // BIRR Configuration
    if (process.env.BIRR_API_KEY && process.env.BIRR_MERCHANT_ID && process.env.BIRR_SECRET_KEY) {
      this.registerConfig(PaymentProviderEnum.BIRR, {
        apiKey: process.env.BIRR_API_KEY,
        merchantId: process.env.BIRR_MERCHANT_ID,
        secretKey: process.env.BIRR_SECRET_KEY,
        apiUrl: process.env.BIRR_API_URL || "https://api.birr.com.et/v1",
      });
    }
  }
}

// Initialize from environment variables on import
PaymentProviderFactory.initializeFromEnv();
