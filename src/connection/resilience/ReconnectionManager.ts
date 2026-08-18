import { ConnectionState } from '../../core/types';

/**
 * Network error detection
 */
function isNetworkError(err: any): boolean {
  if (!err) return false;
  const message = (err.message || '').toLowerCase();
  const code = err.code || '';
  return (
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('ehostunreach') ||
    message.includes('disconnected') ||
    message.includes('closed') ||
    code.includes('ECONNREFUSED') ||
    code.includes('ECONNRESET')
  );
}

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
export class ReconnectionManager {
  private maxAttempts: number;
  private initialBackoffMs: number;
  private maxBackoffMs: number;
  private backoffMultiplier: number;
  private reconnectCount = 0;
  private lastReconnectAt = 0;
  private callbacks: ReconnectionOptions;

  constructor(options: ReconnectionOptions = {}) {
    this.maxAttempts = options.maxAttempts || 10;
    this.initialBackoffMs = options.initialBackoffMs || 1000;
    this.maxBackoffMs = options.maxBackoffMs || 30000;
    this.backoffMultiplier = options.backoffMultiplier || 1.5;
    this.callbacks = options;
  }

  /**
   * Execute function with automatic reconnection
   */
  async executeWithReconnect<T>(
    fn: () => Promise<T>,
    onReconnect?: () => Promise<void>
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const result = await fn();
        
        // Success
        if (attempt > 1) {
          const duration = Date.now() - startTime;
          this.callbacks.onReconnectSuccess?.(attempt - 1, duration);
          console.log(`[Reconnect] Recovered after ${attempt - 1} attempts (${duration}ms)`);
        }
        return result;
      } catch (err: any) {
        lastError = err;

        // Check if retryable
        if (!isNetworkError(err)) {
          throw err; // Not a network error, fail immediately
        }

        if (attempt === this.maxAttempts) {
          break; // Last attempt failed
        }

        // Calculate backoff
        const backoff = Math.min(
          this.initialBackoffMs * Math.pow(this.backoffMultiplier, attempt - 1),
          this.maxBackoffMs
        );

        this.reconnectCount++;
        this.lastReconnectAt = Date.now();

        console.log(
          `[Reconnect] Attempt ${attempt}/${this.maxAttempts} failed, ` +
          `retrying in ${backoff}ms (${err.message})`
        );

        this.callbacks.onReconnectAttempt?.(attempt, this.maxAttempts, backoff);

        // Wait before retry
        await new Promise(r => setTimeout(r, backoff));

        // Try to reconnect
        if (onReconnect) {
          try {
            await onReconnect();
          } catch (reconnectErr: any) {
            console.warn(`[Reconnect] Reconnection attempt failed:`, reconnectErr.message);
          }
        }
      }
    }

    // All attempts exhausted
    const duration = Date.now() - startTime;
    this.callbacks.onReconnectFailed?.(this.maxAttempts, duration, lastError);
    console.error(
      `[Reconnect] Failed after ${this.maxAttempts} attempts (${duration}ms): ${lastError.message}`
    );

    throw new Error(
      `Max reconnection attempts (${this.maxAttempts}) exceeded: ${lastError.message}`
    );
  }

  /**
   * Reset reconnection counter
   */
  reset(): void {
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
