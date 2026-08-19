import { z } from 'zod';
import { ActionDefinition, ActionExecution } from './types';
/**
 * Validation error with schema context
 */
export declare class ValidationError extends Error {
    originalError: any;
    constructor(message: string, originalError: any);
}
/**
 * Universal Action Registry
 * Type-safe action definitions with full execution tracing
 */
export declare class ActionRegistry {
    private actions;
    private executions;
    private executionListeners;
    private maxExecutionHistory;
    /**
     * Register action definition
     */
    register<T extends z.ZodTypeAny>(def: ActionDefinition<T>): void;
    /**
     * Execute action with full tracing
     */
    execute<T extends z.ZodTypeAny>(actionId: string, rawInput: any, executor: (input: any) => Promise<any>, options?: {
        captureScreenshots?: boolean;
        beforeScreenshot?: () => Promise<Buffer>;
        afterScreenshot?: () => Promise<Buffer>;
    }): Promise<ActionExecution>;
    /**
     * Get all action definitions
     */
    getDefinitions(): {
        id: string;
        name: string;
        description: string;
        schema: any;
        perception: "none" | "visual";
        category: "visual" | "navigation" | "interaction" | "extraction" | "utility";
        timeout: number;
        retry: import("./types").RetryPolicy | undefined;
        requiresOverlay: boolean;
        requiresVision: boolean;
    }[];
    /**
     * Get execution history
     */
    getExecutionHistory(limit?: number): ActionExecution[];
    /**
     * Get execution by ID
     */
    getExecutionById(id: string): ActionExecution | undefined;
    /**
     * Subscribe to execution events
     */
    onExecution(listener: (exec: ActionExecution) => void): () => void;
    /**
     * Get statistics
     */
    getStats(): {
        totalExecutions: number;
        successful: number;
        failed: number;
        successRate: number;
        averageDurationMs: number;
        registeredActions: number;
    };
}
//# sourceMappingURL=ActionRegistry.d.ts.map