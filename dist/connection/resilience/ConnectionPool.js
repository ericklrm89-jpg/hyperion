"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionPool = void 0;
const types_1 = require("../../core/types");
/**
 * Connection Pool - Manages multiple connections with metrics
 */
class ConnectionPool {
    constructor() {
        this.connections = new Map();
        this.metrics = new Map();
        this.stateListeners = new Map();
    }
    /**
     * Get or create connection
     */
    async getConnection(id, factory) {
        let conn = this.connections.get(id);
        if (!conn) {
            conn = await factory();
            this.connections.set(id, conn);
            this.initMetrics(id);
            this.setupMetricsTracking(id, conn);
        }
        return conn;
    }
    /**
     * Remove connection from pool
     */
    async removeConnection(id) {
        const conn = this.connections.get(id);
        if (conn) {
            await conn.disconnect().catch(() => { });
            this.connections.delete(id);
            this.metrics.delete(id);
        }
    }
    /**
     * Record outgoing message
     */
    recordMessageSent(id, method, latencyMs) {
        const metrics = this.metrics.get(id);
        if (!metrics)
            return;
        metrics.messagesSent++;
        metrics.averageLatencyMs = (metrics.averageLatencyMs * 0.7 + latencyMs * 0.3);
    }
    /**
     * Record received message
     */
    recordMessageReceived(id) {
        const metrics = this.metrics.get(id);
        if (!metrics)
            return;
        metrics.messagesReceived++;
    }
    /**
     * Record failed message
     */
    recordMessageFailed(id, error) {
        const metrics = this.metrics.get(id);
        if (!metrics)
            return;
        metrics.failedMessages++;
        metrics.errorCount++;
        metrics.lastErrorMessage = error.message;
        metrics.lastErrorAt = Date.now();
    }
    /**
     * Record connection state change
     */
    recordStateChange(id, state) {
        const metrics = this.metrics.get(id);
        if (!metrics)
            return;
        metrics.state = state;
        metrics.isConnected = state === types_1.ConnectionState.CONNECTED;
        if (state === types_1.ConnectionState.CONNECTED) {
            metrics.uptime = Date.now();
        }
        // Notify listeners
        const listeners = this.stateListeners.get(id);
        if (listeners) {
            listeners.forEach(fn => fn(state));
        }
    }
    /**
     * Record reconnect attempt
     */
    recordReconnectAttempt(id) {
        const metrics = this.metrics.get(id);
        if (!metrics)
            return;
        metrics.reconnectAttempts++;
    }
    /**
     * Get metrics for connection
     */
    getMetrics(id) {
        return this.metrics.get(id);
    }
    /**
     * Get all metrics
     */
    getAllMetrics() {
        return new Map(this.metrics);
    }
    /**
     * Listen for state changes
     */
    onStateChange(id, listener) {
        if (!this.stateListeners.has(id)) {
            this.stateListeners.set(id, new Set());
        }
        this.stateListeners.get(id).add(listener);
        return () => {
            this.stateListeners.get(id)?.delete(listener);
        };
    }
    /**
     * Clear pool
     */
    async clear() {
        const promises = Array.from(this.connections.keys()).map(id => this.removeConnection(id));
        await Promise.all(promises);
    }
    // Private methods
    initMetrics(id) {
        this.metrics.set(id, {
            state: types_1.ConnectionState.CONNECTING,
            isConnected: false,
            messagesSent: 0,
            messagesReceived: 0,
            failedMessages: 0,
            averageLatencyMs: 0,
            uptime: Date.now(),
            lastHeartbeatAt: 0,
            reconnectAttempts: 0,
            errorCount: 0,
        });
    }
    setupMetricsTracking(id, conn) {
        conn.on('connected', () => {
            this.recordStateChange(id, types_1.ConnectionState.CONNECTED);
        });
        conn.on('disconnected', () => {
            this.recordStateChange(id, types_1.ConnectionState.DISCONNECTED);
        });
        conn.on('error', (err) => {
            this.recordMessageFailed(id, err);
        });
    }
}
exports.ConnectionPool = ConnectionPool;
//# sourceMappingURL=ConnectionPool.js.map