import { z } from 'zod';
import { ActionDefinition, ActionExecution, ActionAttempt } from './types';
import { logger } from './logger';

/**
 * Validation error with schema context
 */
export class ValidationError extends Error {
  constructor(message: string, public originalError: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(err: any): boolean {
  if (!err) return false;
  const message = (err.message || '').toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('temporary') ||
    err.code === 'ETIMEDOUT' ||
    err.code === 'ECONNRESET'
  );
}

/**
 * Universal Action Registry
 * Type-safe action definitions with full execution tracing
 */
export class ActionRegistry {
  private actions = new Map<string, ActionDefinition<any>>();
  private executions: ActionExecution[] = [];
  private executionListeners: Set<(exec: ActionExecution) => void> = new Set();
  private maxExecutionHistory = 1000;

  /**
   * Register action definition
   */
  register<T extends z.ZodTypeAny>(def: ActionDefinition<T>): void {
    if (this.actions.has(def.id)) {
      throw new Error(`Action ${def.id} already registered`);
    }
    this.actions.set(def.id, def);
    logger.info({ actionId: def.id, name: def.name }, `[ActionRegistry] Registered: ${def.id} - ${def.name}`);
  }

  /**
   * Execute action with full tracing
   */
  async execute<T extends z.ZodTypeAny>(
    actionId: string,
    rawInput: any,
    executor: (input: any) => Promise<any>,
    options?: {
      captureScreenshots?: boolean;
      beforeScreenshot?: () => Promise<Buffer>;
      afterScreenshot?: () => Promise<Buffer>;
    }
  ): Promise<ActionExecution> {
    const def = this.actions.get(actionId);
    if (!def) throw new Error(`Action not found: ${actionId}`);

    // Validate schema
    let validated: any;
    try {
      validated = await def.schema.parseAsync(rawInput);
    } catch (err: any) {
      throw new ValidationError(`Schema validation failed for ${actionId}`, err);
    }

    const executionId = `${actionId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const execution: ActionExecution = {
      id: executionId,
      actionId,
      input: validated,
      startedAt: Date.now(),
      status: 'pending',
      attempts: [],
      screenshots: [],
      duration: 0,
      retried: false,
      retriedCount: 0,
    };

    logger.info({ actionId, executionId }, `[Action] Starting: ${actionId} (${executionId})`);

    // Screenshot BEFORE
    if (options?.captureScreenshots && options?.beforeScreenshot) {
      try {
        const screenshot = await options.beforeScreenshot();
        execution.screenshots?.push({
          timestamp: Date.now(),
          base64: screenshot.toString('base64'),
          phase: 'before',
          sizeBytes: screenshot.length,
        });
      } catch (err) {
        logger.warn({ err, actionId }, '[Action] Failed to capture before screenshot');
      }
    }

    // Execute with retry
    const retryPolicy = def.retry || { maxAttempts: 1, backoffMs: 1000 };
    let lastError: any;
    execution.status = 'executing';

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      const attemptStart = Date.now();

      try {
        if (attempt > 1) {
          execution.status = 'retrying';
          execution.retriedCount++;
          execution.retried = true;
          logger.info({ actionId, attempt, maxAttempts: retryPolicy.maxAttempts }, `[Action] Retrying ${actionId} (attempt ${attempt}/${retryPolicy.maxAttempts})`);
        }

        // Timeout promise race
        const result = await Promise.race([
          executor(validated),
          new Promise<never>((_, rej) =>
            setTimeout(
              () => rej(new Error(`Action timeout after ${def.timeout || 30000}ms`)),
              def.timeout || 30000
            )
          ),
        ]);

        execution.output = result;
        execution.status = 'success';
        execution.attempts.push({
          attempt,
          startedAt: attemptStart,
          completedAt: Date.now(),
          duration: Date.now() - attemptStart,
          result,
        });

        logger.info({ actionId, durationMs: Date.now() - attemptStart }, `[Action] Success: ${actionId} (${Date.now() - attemptStart}ms)`);
        break;
      } catch (err: any) {
        lastError = err;
        execution.attempts.push({
          attempt,
          startedAt: attemptStart,
          completedAt: Date.now(),
          duration: Date.now() - attemptStart,
          error: {
            code: err.code || 'UNKNOWN',
            message: err.message,
            details: err.details,
          },
        });

        if (attempt < retryPolicy.maxAttempts && isRetryableError(err)) {
          const backoff =
            retryPolicy.backoffMs *
            Math.pow(retryPolicy.backoffMultiplier || 1, attempt - 1);
          const clampedBackoff = Math.min(
            backoff,
            retryPolicy.maxBackoffMs || 30000
          );
          await new Promise(r => setTimeout(r, clampedBackoff));
          continue;
        }
        break;
      }
    }

    // Screenshot AFTER
    if (options?.captureScreenshots && options?.afterScreenshot) {
      try {
        const screenshot = await options.afterScreenshot();
        execution.screenshots?.push({
          timestamp: Date.now(),
          base64: screenshot.toString('base64'),
          phase: execution.status === 'success' ? 'after' : 'error',
          sizeBytes: screenshot.length,
        });
      } catch (err) {
        logger.warn({ err, actionId }, '[Action] Failed to capture after screenshot');
      }
    }

    // Finalize
    if (execution.status !== 'success') {
      execution.status = 'failed';
      execution.error = {
        code: lastError?.code || 'EXECUTION_FAILED',
        message: lastError?.message || 'Unknown error',
        stack: lastError?.stack,
      };
      logger.error({ actionId, err: lastError }, `[Action] Failed: ${actionId} - ${lastError?.message}`);
    }

    execution.completedAt = Date.now();
    execution.duration = execution.completedAt - execution.startedAt;

    // Store and notify
    this.executions.push(execution);
    if (this.executions.length > this.maxExecutionHistory) {
      this.executions.shift();
    }

    this.executionListeners.forEach(fn => {
      try {
        fn(execution);
      } catch (err) {
        logger.warn({ err }, '[ActionRegistry] Listener error');
      }
    });

    return execution;
  }

  /**
   * Get all action definitions
   */
  getDefinitions() {
    return Array.from(this.actions.values()).map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      schema: a.schema.describe(),
      perception: a.perception || 'none',
      category: a.category || 'utility',
      timeout: a.timeout || 30000,
      retry: a.retry,
      requiresOverlay: a.requiresOverlay || false,
      requiresVision: a.requiresVision || false,
    }));
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit = 100): ActionExecution[] {
    return this.executions.slice(-limit);
  }

  /**
   * Get execution by ID
   */
  getExecutionById(id: string): ActionExecution | undefined {
    return this.executions.find(e => e.id === id);
  }

  /**
   * Subscribe to execution events
   */
  onExecution(listener: (exec: ActionExecution) => void): () => void {
    this.executionListeners.add(listener);
    return () => this.executionListeners.delete(listener);
  }

  /**
   * Get statistics
   */
  getStats() {
    const total = this.executions.length;
    const successful = this.executions.filter(e => e.status === 'success').length;
    const failed = this.executions.filter(e => e.status === 'failed').length;
    const avgDuration =
      total > 0
        ? this.executions.reduce((sum, e) => sum + e.duration, 0) / total
        : 0;

    return {
      totalExecutions: total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageDurationMs: avgDuration,
      registeredActions: this.actions.size,
    };
  }
}
