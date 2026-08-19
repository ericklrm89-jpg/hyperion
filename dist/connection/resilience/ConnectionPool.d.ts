import { Transport } from '../transport';
import { ConnectionMetrics, ConnectionState } from '../../core/types';
/**
 * Connection Pool - Manages multiple connections with metrics
 */
export declare class ConnectionPool {
    private connections;
    private metrics;
    private stateListeners;
    /**
     * Get or create connection
     */
    getConnection(id: string, factory: () => Promise<Transport>): Promise<Transport>;
    /**
     * Remove connection from pool
     */
    removeConnection(id: string): Promise<void>;
    /**
     * Record outgoing message
     */
    recordMessageSent(id: string, method: string, latencyMs: number): void;
    /**
     * Record received message
     */
    recordMessageReceived(id: string): void;
    /**
     * Record failed message
     */
    recordMessageFailed(id: string, error: Error): void;
    /**
     * Record connection state change
     */
    recordStateChange(id: string, state: ConnectionState): void;
    /**
     * Record reconnect attempt
     */
    recordReconnectAttempt(id: string): void;
    /**
     * Get metrics for connection
     */
    getMetrics(id: string): ConnectionMetrics | undefined;
    /**
     * Get all metrics
     */
    getAllMetrics(): Map<string, ConnectionMetrics>;
    /**
     * Listen for state changes
     */
    onStateChange(id: string, listener: (state: ConnectionState) => void): () => void;
    /**
     * Clear pool
     */
    clear(): Promise<void>;
    private initMetrics;
    private setupMetricsTracking;
}
//# sourceMappingURL=ConnectionPool.d.ts.map