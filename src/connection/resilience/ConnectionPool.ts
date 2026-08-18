import { Transport } from '../transport';
import { ConnectionMetrics, ConnectionState } from '../../core/types';

/**
 * Connection Pool - Manages multiple connections with metrics
 */
export class ConnectionPool {
  private connections = new Map<string, Transport>();
  private metrics = new Map<string, ConnectionMetrics>();
  private stateListeners = new Map<string, Set<(state: ConnectionState) => void>>();

  /**
   * Get or create connection
   */
  async getConnection(
    id: string,
    factory: () => Promise<Transport>
  ): Promise<Transport> {
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
  async removeConnection(id: string): Promise<void> {
    const conn = this.connections.get(id);
    if (conn) {
      await conn.disconnect().catch(() => {});
      this.connections.delete(id);
      this.metrics.delete(id);
    }
  }

  /**
   * Record outgoing message
   */
  recordMessageSent(id: string, method: string, latencyMs: number): void {
    const metrics = this.metrics.get(id);
    if (!metrics) return;

    metrics.messagesSent++;
    metrics.averageLatencyMs = (metrics.averageLatencyMs * 0.7 + latencyMs * 0.3);
  }

  /**
   * Record received message
   */
  recordMessageReceived(id: string): void {
    const metrics = this.metrics.get(id);
    if (!metrics) return;

    metrics.messagesReceived++;
  }

  /**
   * Record failed message
   */
  recordMessageFailed(id: string, error: Error): void {
    const metrics = this.metrics.get(id);
    if (!metrics) return;

    metrics.failedMessages++;
    metrics.errorCount++;
    metrics.lastErrorMessage = error.message;
    metrics.lastErrorAt = Date.now();
  }

  /**
   * Record connection state change
   */
  recordStateChange(id: string, state: ConnectionState): void {
    const metrics = this.metrics.get(id);
    if (!metrics) return;

    metrics.state = state;
    metrics.isConnected = state === ConnectionState.CONNECTED;

    if (state === ConnectionState.CONNECTED) {
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
  recordReconnectAttempt(id: string): void {
    const metrics = this.metrics.get(id);
    if (!metrics) return;

    metrics.reconnectAttempts++;
  }

  /**
   * Get metrics for connection
   */
  getMetrics(id: string): ConnectionMetrics | undefined {
    return this.metrics.get(id);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, ConnectionMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Listen for state changes
   */
  onStateChange(id: string, listener: (state: ConnectionState) => void): () => void {
    if (!this.stateListeners.has(id)) {
      this.stateListeners.set(id, new Set());
    }
    this.stateListeners.get(id)!.add(listener);

    return () => {
      this.stateListeners.get(id)?.delete(listener);
    };
  }

  /**
   * Clear pool
   */
  async clear(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(id =>
      this.removeConnection(id)
    );
    await Promise.all(promises);
  }

  // Private methods

  private initMetrics(id: string): void {
    this.metrics.set(id, {
      state: ConnectionState.CONNECTING,
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

  private setupMetricsTracking(id: string, conn: Transport): void {
    conn.on('connected', () => {
      this.recordStateChange(id, ConnectionState.CONNECTED);
    });

    conn.on('disconnected', () => {
      this.recordStateChange(id, ConnectionState.DISCONNECTED);
    });

    conn.on('error', (err: Error) => {
      this.recordMessageFailed(id, err);
    });
  }
}
