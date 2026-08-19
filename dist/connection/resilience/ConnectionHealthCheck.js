"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionHealthCheck = void 0;
const logger_1 = require("../../core/logger");
/**
 * Connection Health Check - Monitors transport health
 */
class ConnectionHealthCheck {
    constructor(transport, options = {}) {
        this.transport = transport;
        this.lastCheckAt = 0;
        this.isHealthy = false;
        this.consecutiveFailures = 0;
        this.options = {
            intervalMs: options.intervalMs || 10000,
            timeoutMs: options.timeoutMs || 5000,
            onHealthy: options.onHealthy || (() => { }),
            onUnhealthy: options.onUnhealthy || (() => { }),
        };
    }
    /**
     * Start health checks
     */
    start() {
        if (this.interval)
            return;
        this.interval = setInterval(() => {
            this.performCheck().catch(err => {
                logger_1.logger.warn({ err: err.message }, '[HealthCheck] Check failed');
            });
        }, this.options.intervalMs);
        logger_1.logger.info({ intervalMs: this.options.intervalMs, timeoutMs: this.options.timeoutMs }, `[HealthCheck] Started (interval: ${this.options.intervalMs}ms, timeout: ${this.options.timeoutMs}ms)`);
    }
    /**
     * Stop health checks
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
    }
    /**
     * Perform single health check
     */
    async performCheck() {
        this.lastCheckAt = Date.now();
        try {
            // Simple check: can we call a method?
            if (!this.transport.isConnected()) {
                throw new Error('Transport not connected');
            }
            // For deeper checks, try to get version info
            await Promise.race([
                this.transport.call('Browser.getVersion'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), this.options.timeoutMs)),
            ]);
            // Healthy
            if (!this.isHealthy) {
                this.isHealthy = true;
                this.consecutiveFailures = 0;
                this.options.onHealthy();
                logger_1.logger.info('[HealthCheck] ✓ Healthy');
            }
        }
        catch (err) {
            this.consecutiveFailures++;
            if (this.isHealthy) {
                this.isHealthy = false;
                this.options.onUnhealthy?.(err.message);
                logger_1.logger.warn({ consecutiveFailures: this.consecutiveFailures, err: err.message }, `[HealthCheck] ✗ Unhealthy (${this.consecutiveFailures} failures): ${err.message}`);
            }
        }
    }
    /**
     * Get health status
     */
    getStatus() {
        return {
            healthy: this.isHealthy,
            lastCheckAt: this.lastCheckAt,
            consecutiveFailures: this.consecutiveFailures,
        };
    }
}
exports.ConnectionHealthCheck = ConnectionHealthCheck;
//# sourceMappingURL=ConnectionHealthCheck.js.map