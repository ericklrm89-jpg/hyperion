import { Transport } from '../transport';
export interface HealthCheckOptions {
    intervalMs?: number;
    timeoutMs?: number;
    onHealthy?: () => void;
    onUnhealthy?: (reason: string) => void;
}
/**
 * Connection Health Check - Monitors transport health
 */
export declare class ConnectionHealthCheck {
    private transport;
    private interval?;
    private lastCheckAt;
    private isHealthy;
    private consecutiveFailures;
    private readonly options;
    constructor(transport: Transport, options?: HealthCheckOptions);
    /**
     * Start health checks
     */
    start(): void;
    /**
     * Stop health checks
     */
    stop(): void;
    /**
     * Perform single health check
     */
    private performCheck;
    /**
     * Get health status
     */
    getStatus(): {
        healthy: boolean;
        lastCheckAt: number;
        consecutiveFailures: number;
    };
}
//# sourceMappingURL=ConnectionHealthCheck.d.ts.map