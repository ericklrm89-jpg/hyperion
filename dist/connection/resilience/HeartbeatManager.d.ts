import { EventEmitter } from 'events';
import { Heartbeat, HeartbeatAck } from '../../core/types';
/**
 * Heartbeat Manager - Monitors connection health
 * Sends periodic pings and detects silent failures
 */
export declare class HeartbeatManager extends EventEmitter {
    private sender;
    private onHealthChange;
    private interval?;
    private lastHeartbeat;
    private sequenceNumber;
    private missedCount;
    private readonly maxMissed;
    private readonly clientId;
    private pendingHeartbeats;
    constructor(sender: (hb: Heartbeat) => Promise<HeartbeatAck>, onHealthChange: (healthy: boolean) => void, options?: {
        maxMissed?: number;
        clientId?: string;
    });
    /**
     * Start heartbeat interval
     */
    start(intervalMs?: number): void;
    /**
     * Stop heartbeat interval
     */
    stop(): void;
    /**
     * Send single heartbeat and wait for ACK
     */
    private sendHeartbeat;
    /**
     * Manual ACK handler (called by transport when response arrives)
     */
    handleAck(ack: HeartbeatAck): void;
    /**
     * Get last heartbeat timestamp
     */
    getLastHeartbeat(): number;
    /**
     * Get current sequence number
     */
    getSequenceNumber(): number;
    /**
     * Get missed count
     */
    getMissedCount(): number;
    /**
     * Is healthy?
     */
    isHealthy(): boolean;
}
//# sourceMappingURL=HeartbeatManager.d.ts.map