"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionRegistry = exports.ValidationError = void 0;
/**
 * Validation error with schema context
 */
class ValidationError extends Error {
    constructor(message, originalError) {
        super(message);
        this.originalError = originalError;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Check if error is retryable
 */
function isRetryableError(err) {
    if (!err)
        return false;
    const message = (err.message || '').toLowerCase();
    return (message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('econnrefused') ||
        message.includes('temporary') ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ECONNRESET');
}
/**
 * Universal Action Registry
 * Type-safe action definitions with full execution tracing
 */
class ActionRegistry {
    constructor() {
        this.actions = new Map();
        this.executions = [];
        this.executionListeners = new Set();
        this.maxExecutionHistory = 1000;
    }
    /**
     * Register action definition
     */
    register(def) {
        if (this.actions.has(def.id)) {
            throw new Error(`Action ${def.id} already registered`);
        }
        this.actions.set(def.id, def);
        console.log(`[ActionRegistry] Registered: ${def.id} - ${def.name}`);
    }
    /**
     * Execute action with full tracing
     */
    async execute(actionId, rawInput, executor, options) {
        const def = this.actions.get(actionId);
        if (!def)
            throw new Error(`Action not found: ${actionId}`);
        // Validate schema
        let validated;
        try {
            validated = await def.schema.parseAsync(rawInput);
        }
        catch (err) {
            throw new ValidationError(`Schema validation failed for ${actionId}`, err);
        }
        const executionId = `${actionId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const execution = {
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
        console.log(`[Action] Starting: ${actionId} (${executionId})`);
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
            }
            catch (err) {
                console.warn('[Action] Failed to capture before screenshot:', err);
            }
        }
        // Execute with retry
        const retryPolicy = def.retry || { maxAttempts: 1, backoffMs: 1000 };
        let lastError;
        execution.status = 'executing';
        for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
            const attemptStart = Date.now();
            try {
                if (attempt > 1) {
                    execution.status = 'retrying';
                    execution.retriedCount++;
                    execution.retried = true;
                    console.log(`[Action] Retrying ${actionId} (attempt ${attempt}/${retryPolicy.maxAttempts})`);
                }
                // Timeout promise race
                const result = await Promise.race([
                    executor(validated),
                    new Promise((_, rej) => setTimeout(() => rej(new Error(`Action timeout after ${def.timeout || 30000}ms`)), def.timeout || 30000)),
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
                console.log(`[Action] Success: ${actionId} (${Date.now() - attemptStart}ms)`);
                break;
            }
            catch (err) {
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
                    const backoff = retryPolicy.backoffMs *
                        Math.pow(retryPolicy.backoffMultiplier || 1, attempt - 1);
                    const clampedBackoff = Math.min(backoff, retryPolicy.maxBackoffMs || 30000);
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
            }
            catch (err) {
                console.warn('[Action] Failed to capture after screenshot:', err);
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
            console.error(`[Action] Failed: ${actionId} - ${lastError?.message}`);
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
            }
            catch (err) {
                console.warn('[ActionRegistry] Listener error:', err);
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
    getExecutionHistory(limit = 100) {
        return this.executions.slice(-limit);
    }
    /**
     * Get execution by ID
     */
    getExecutionById(id) {
        return this.executions.find(e => e.id === id);
    }
    /**
     * Subscribe to execution events
     */
    onExecution(listener) {
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
        const avgDuration = total > 0
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
exports.ActionRegistry = ActionRegistry;
//# sourceMappingURL=ActionRegistry.js.map