import { Transport } from '../transport';
import { ConnectionMetrics, ConnectionState } from '../../core/types';

export interface HealthCheckOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onHealthy?: () => void;
  onUnhealthy?: (reason: string) => void;
}

/**
 * Connection Health Check - Monitors transport health
 */
export class ConnectionHealthCheck {
  private interval?: NodeJS.Timeout;
  private lastCheckAt = 0;
  private isHealthy = false;
  private consecutiveFailures = 0;
  private readonly options: Required<HealthCheckOptions>;

  constructor(
    private transport: Transport,
    options: HealthCheckOptions = {}
  ) {
    this.options = {
      intervalMs: options.intervalMs || 10000,
      timeoutMs: options.timeoutMs || 5000,
      onHealthy: options.onHealthy || (() => {}),
      onUnhealthy: options.onUnhealthy || (() => {}),
    };
  }

  /**
   * Start health checks
   */
  start(): void {
    if (this.interval) return;

    this.interval = setInterval(() => {
      this.performCheck().catch(err => {
        console.warn('[HealthCheck] Check failed:', err.message);
      });
    }, this.options.intervalMs);

    console.log(
      `[HealthCheck] Started (interval: ${this.options.intervalMs}ms, ` +
      `timeout: ${this.options.timeoutMs}ms)`
    );
  }

  /**
   * Stop health checks
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  /**
   * Perform single health check
   */
  private async performCheck(): Promise<void> {
    this.lastCheckAt = Date.now();

    try {
      // Simple check: can we call a method?
      if (!this.transport.isConnected()) {
        throw new Error('Transport not connected');
      }

      // For deeper checks, try to get version info
      const result = await Promise.race([
        this.transport.call('Browser.getVersion'),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), this.options.timeoutMs)
        ),
      ]);

      // Healthy
      if (!this.isHealthy) {
        this.isHealthy = true;
        this.consecutiveFailures = 0;
        this.options.onHealthy();
        console.log('[HealthCheck] ✓ Healthy');
      }
    } catch (err: any) {
      this.consecutiveFailures++;

      if (this.isHealthy) {
        this.isHealthy = false;
        this.options.onUnhealthy?.(err.message);
        console.warn(
          `[HealthCheck] ✗ Unhealthy (${this.consecutiveFailures} failures): ${err.message}`
        );
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
