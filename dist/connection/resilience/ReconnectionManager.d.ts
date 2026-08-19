export interface ReconnectionOptions {
    maxAttempts?: number;
    initialBackoffMs?: number;
    maxBackoffMs?: number;
    backoffMultiplier?: number;
    onReconnectAttempt?: (attempt: number, maxAttempts: number, nextDelayMs: number) => void;
    onReconnectSuccess?: (attemptsUsed: number, totalDurationMs: number) => void;
    onReconnectFailed?: (attemptsUsed: number, totalDurationMs: number, lastError: Error) => void;
}
/**
 * Reconnection Manager - Handles auto-reconnect with exponential backoff
 */
export declare class ReconnectionManager {
    private maxAttempts;
    private initialBackoffMs;
    private maxBackoffMs;
    private backoffMultiplier;
    private reconnectCount;
    private lastReconnectAt;
    private callbacks;
    constructor(options?: ReconnectionOptions);
    /**
     * Execute function with automatic reconnection
     */
    executeWithReconnect<T>(fn: () => Promise<T>, onReconnect?: () => Promise<void>): Promise<T>;
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