export interface ReconnectConfig {
    maxAttempts?: number;
    initialBackoffMs?: number;
    maxBackoffMs?: number;
    backoffMultiplier?: number;
    onReconnectAttempt?: (attempt: number, maxAttempts: number, backoffMs: number) => void;
    onReconnectSuccess?: (attempts: number, durationMs: number) => void;
    onReconnectFailed?: (attempts: number, durationMs: number, error: Error) => void;
}
/**
 * Reconnection Manager - Handles exponential backoff and connection recovery
 */
export declare class ReconnectionManager {
    private maxAttempts;
    private initialBackoffMs;
    private maxBackoffMs;
    private backoffMultiplier;
    private reconnectCount;
    private lastReconnectAt;
    private callbacks;
    constructor(config?: ReconnectConfig);
    /**
     * Execute an async operation with automatic retry on network errors
     */
    executeWithRetry<T>(fn: () => Promise<T>, onReconnect?: () => Promise<void>): Promise<T>;
    /**
     * Reset reconnection counter
     */
    reset(): void;
    /**
     * Get reconnection stats
     */
    getStats(): {
        reconnectCount: number;
        lastReconnectAt: number;
        maxAttempts: number;
    };
}
//# sourceMappingURL=ReconnectionManager.d.ts.map