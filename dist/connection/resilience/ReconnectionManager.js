"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconnectionManager = void 0;
const logger_1 = require("../../core/logger");
/**
 * Network error detection
 */
function isNetworkError(err) {
    if (!err)
        return false;
    const message = (err.message || '').toLowerCase();
    const code = err.code || '';
    return (message.includes('econnrefused') ||
        message.includes('econnreset') ||
        message.includes('epipe') ||
        message.includes('timeout') ||
        message.includes('closed') ||
        message.includes('socket') ||
        message.includes('network') ||
        code === 'econnrefused' ||
        code === 'econnreset' ||
        code === 'epipe' ||
        code === 'etimedout');
}
/**
 * Reconnection Manager - Handles exponential backoff and connection recovery
 */
class ReconnectionManager {
    constructor(config = {}) {
        this.reconnectCount = 0;
        this.lastReconnectAt = 0;
        this.maxAttempts = config.maxAttempts || 5;
        this.initialBackoffMs = config.initialBackoffMs || 1000;
        this.maxBackoffMs = config.maxBackoffMs || 30000;
        this.backoffMultiplier = config.backoffMultiplier || 2;
        this.callbacks = config;
    }
    /**
     * Execute an async operation with automatic retry on network errors
     */
    async executeWithRetry(fn, onReconnect) {
        const startTime = Date.now();
        let lastError = new Error('Unknown error');
        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            try {
                const result = await fn();
                // Success
                if (attempt > 1) {
                    const duration = Date.now() - startTime;
                    this.callbacks.onReconnectSuccess?.(attempt - 1, duration);
                    logger_1.logger.info({ attempts: attempt - 1, durationMs: duration }, `[Reconnect] Recovered after ${attempt - 1} attempts (${duration}ms)`);
                }
                return result;
            }
            catch (err) {
                lastError = err;
                // Check if retryable
                if (!isNetworkError(err)) {
                    throw err; // Not a network error, fail immediately
                }
                if (attempt === this.maxAttempts) {
                    break; // Last attempt failed
                }
                // Calculate backoff
                const backoff = Math.min(this.initialBackoffMs * Math.pow(this.backoffMultiplier, attempt - 1), this.maxBackoffMs);
                this.reconnectCount++;
                this.lastReconnectAt = Date.now();
                logger_1.logger.info({ attempt, maxAttempts: this.maxAttempts, backoffMs: backoff, err: err.message }, `[Reconnect] Attempt ${attempt}/${this.maxAttempts} failed, retrying in ${backoff}ms (${err.message})`);
                this.callbacks.onReconnectAttempt?.(attempt, this.maxAttempts, backoff);
                // Wait before retry
                await new Promise(r => setTimeout(r, backoff));
                // Try to reconnect
                if (onReconnect) {
                    try {
                        await onReconnect();
                    }
                    catch (reconnectErr) {
                        logger_1.logger.warn({ err: reconnectErr.message }, `[Reconnect] Reconnection attempt failed`);
                    }
                }
            }
        }
        // All attempts exhausted
        const duration = Date.now() - startTime;
        this.callbacks.onReconnectFailed?.(this.maxAttempts, duration, lastError);
        logger_1.logger.error({ maxAttempts: this.maxAttempts, durationMs: duration, err: lastError.message }, `[Reconnect] Failed after ${this.maxAttempts} attempts (${duration}ms): ${lastError.message}`);
        throw new Error(`Max reconnection attempts (${this.maxAttempts}) exceeded: ${lastError.message}`);
    }
    /**
     * Reset reconnection counter
     */
    reset() {
        this.reconnectCount = 0;
    }
    /**
     * Get reconnection stats
     */
    getStats() {
        return {
            reconnectCount: this.reconnectCount,
            lastReconnectAt: this.lastReconnectAt,
            maxAttempts: this.maxAttempts,
        };
    }
}
exports.ReconnectionManager = ReconnectionManager;
//# sourceMappingURL=ReconnectionManager.js.map