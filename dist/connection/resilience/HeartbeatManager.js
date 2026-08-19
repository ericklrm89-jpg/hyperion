"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeartbeatManager = void 0;
const events_1 = require("events");
/**
 * Heartbeat Manager - Monitors connection health
 * Sends periodic pings and detects silent failures
 */
class HeartbeatManager extends events_1.EventEmitter {
    constructor(sender, onHealthChange, options) {
        super();
        this.sender = sender;
        this.onHealthChange = onHealthChange;
        this.lastHeartbeat = 0;
        this.sequenceNumber = 0;
        this.missedCount = 0;
        this.pendingHeartbeats = new Map();
        this.maxMissed = options?.maxMissed || 3;
        this.clientId = options?.clientId || `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
    /**
     * Start heartbeat interval
     */
    start(intervalMs = 5000) {
        if (this.interval)
            return; // Already running
        this.interval = setInterval(() => {
            this.sendHeartbeat().catch(err => {
                this.missedCount++;
                console.warn(`[Heartbeat] Missed (${this.missedCount}/${this.maxMissed}):`, err.message);
                if (this.missedCount >= this.maxMissed) {
                    this.emit('unhealthy', {
                        missedCount: this.missedCount,
                        maxMissed: this.maxMissed,
                    });
                    this.onHealthChange(false);
                }
            });
        }, intervalMs);
        console.log(`[Heartbeat] Started (interval: ${intervalMs}ms, maxMissed: ${this.maxMissed})`);
    }
    /**
     * Stop heartbeat interval
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
        this.pendingHeartbeats.clear();
        console.log('[Heartbeat] Stopped');
    }
    /**
     * Send single heartbeat and wait for ACK
     */
    async sendHeartbeat() {
        this.sequenceNumber++;
        const hb = {
            timestamp: Date.now(),
            sequenceNumber: this.sequenceNumber,
            clientId: this.clientId,
        };
        const sentAt = Date.now();
        try {
            const ack = await Promise.race([
                this.sender(hb),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Heartbeat timeout after 5s')), 5000)),
            ]);
            const latency = Date.now() - sentAt;
            this.lastHeartbeat = Date.now();
            this.missedCount = 0;
            this.emit('heartbeat-ok', {
                sequenceNumber: this.sequenceNumber,
                latencyMs: latency,
            });
            // Reset to healthy if was unhealthy
            if (this.missedCount === 0) {
                this.onHealthChange(true);
            }
            return ack;
        }
        catch (err) {
            throw err;
        }
    }
    /**
     * Manual ACK handler (called by transport when response arrives)
     */
    handleAck(ack) {
        const pending = this.pendingHeartbeats.get(ack.sequenceNumber);
        if (pending && pending.resolve) {
            pending.resolve(ack);
            this.pendingHeartbeats.delete(ack.sequenceNumber);
        }
    }
    /**
     * Get last heartbeat timestamp
     */
    getLastHeartbeat() {
        return this.lastHeartbeat;
    }
    /**
     * Get current sequence number
     */
    getSequenceNumber() {
        return this.sequenceNumber;
    }
    /**
     * Get missed count
     */
    getMissedCount() {
        return this.missedCount;
    }
    /**
     * Is healthy?
     */
    isHealthy() {
        return this.missedCount < this.maxMissed;
    }
}
exports.HeartbeatManager = HeartbeatManager;
//# sourceMappingURL=HeartbeatManager.js.map