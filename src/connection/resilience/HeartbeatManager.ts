import { EventEmitter } from 'events';
import { Heartbeat, HeartbeatAck } from '../../core/types';

/**
 * Heartbeat Manager - Monitors connection health
 * Sends periodic pings and detects silent failures
 */
export class HeartbeatManager extends EventEmitter {
  private interval?: NodeJS.Timeout;
  private lastHeartbeat = 0;
  private sequenceNumber = 0;
  private missedCount = 0;
  private readonly maxMissed: number;
  private readonly clientId: string;
  private pendingHeartbeats = new Map<number, { sentAt: number; resolve?: (ack: HeartbeatAck) => void }>();

  constructor(
    private sender: (hb: Heartbeat) => Promise<HeartbeatAck>,
    private onHealthChange: (healthy: boolean) => void,
    options?: {
      maxMissed?: number;
      clientId?: string;
    }
  ) {
    super();
    this.maxMissed = options?.maxMissed || 3;
    this.clientId = options?.clientId || `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Start heartbeat interval
   */
  start(intervalMs = 5000): void {
    if (this.interval) return; // Already running

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
  stop(): void {
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
  private async sendHeartbeat(): Promise<HeartbeatAck> {
    this.sequenceNumber++;
    const hb: Heartbeat = {
      timestamp: Date.now(),
      sequenceNumber: this.sequenceNumber,
      clientId: this.clientId,
    };

    const sentAt = Date.now();

    const ack = await Promise.race([
      this.sender(hb),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Heartbeat timeout after 5s')), 5000)
      ),
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

  /**
   * Manual ACK handler (called by transport when response arrives)
   */
  handleAck(ack: HeartbeatAck): void {
    const pending = this.pendingHeartbeats.get(ack.sequenceNumber);
    if (pending && pending.resolve) {
      pending.resolve(ack);
      this.pendingHeartbeats.delete(ack.sequenceNumber);
    }
  }

  /**
   * Get last heartbeat timestamp
   */
  getLastHeartbeat(): number {
    return this.lastHeartbeat;
  }

  /**
   * Get current sequence number
   */
  getSequenceNumber(): number {
    return this.sequenceNumber;
  }

  /**
   * Get missed count
   */
  getMissedCount(): number {
    return this.missedCount;
  }

  /**
   * Is healthy?
   */
  isHealthy(): boolean {
    return this.missedCount < this.maxMissed;
  }
}
