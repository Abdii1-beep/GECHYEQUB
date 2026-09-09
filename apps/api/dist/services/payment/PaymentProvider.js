/**
 * Abstract base class for payment providers
 * All payment provider implementations must extend this class
 */
export class PaymentProviderInterface {
    provider;
    config;
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
    }
    /**
     * Get provider name
     */
    getProviderName() {
        return this.provider;
    }
    /**
     * Check if provider is available
     */
    isAvailable() {
        return this.validateConfig();
    }
}
