import { z } from 'zod';
import { Hyperion } from '../hyperion';
/**
 * LLM-Native Server Schema Definitions
 * All tools with Zod schemas for auto-documentation
 */
export declare const screenshotSchema: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["viewport", "fullpage", "element"]>>;
    selector: z.ZodOptional<z.ZodString>;
    quality: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    quality: number;
    mode: "viewport" | "element" | "fullpage";
    selector?: string | undefined;
}, {
    quality?: number | undefined;
    mode?: "viewport" | "element" | "fullpage" | undefined;
    selector?: string | undefined;
}>;
export declare const navigateSchema: z.ZodObject<{
    url: z.ZodString;
    waitUntil: z.ZodDefault<z.ZodEnum<["load", "networkIdle", "DOMContentLoaded"]>>;
}, "strip", z.ZodTypeAny, {
    url: string;
    waitUntil: "load" | "DOMContentLoaded" | "networkIdle";
}, {
    url: string;
    waitUntil?: "load" | "DOMContentLoaded" | "networkIdle" | undefined;
}>;
export declare const clickSchema: z.ZodObject<{
    target: z.ZodUnion<[z.ZodObject<{
        overlayId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        overlayId: number;
    }, {
        overlayId: number;
    }>, z.ZodObject<{
        selector: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        selector: string;
    }, {
        selector: string;
    }>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        y: number;
        x: number;
    }, {
        y: number;
        x: number;
    }>]>;
    button: z.ZodDefault<z.ZodEnum<["left", "right", "middle"]>>;
}, "strip", z.ZodTypeAny, {
    button: "left" | "middle" | "right";
    target: {
        overlayId: number;
    } | {
        selector: string;
    } | {
        y: number;
        x: number;
    };
}, {
    target: {
        overlayId: number;
    } | {
        selector: string;
    } | {
        y: number;
        x: number;
    };
    button?: "left" | "middle" | "right" | undefined;
}>;
export declare const typeSchema: z.ZodObject<{
    text: z.ZodString;
    target: z.ZodUnion<[z.ZodObject<{
        overlayId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        overlayId: number;
    }, {
        overlayId: number;
    }>, z.ZodObject<{
        selector: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        selector: string;
    }, {
        selector: string;
    }>]>;
    clearFirst: z.ZodDefault<z.ZodBoolean>;
    humanLike: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    humanLike: boolean;
    target: {
        overlayId: number;
    } | {
        selector: string;
    };
    text: string;
    clearFirst: boolean;
}, {
    target: {
        overlayId: number;
    } | {
        selector: string;
    };
    text: string;
    humanLike?: boolean | undefined;
    clearFirst?: boolean | undefined;
}>;
export declare const overlayInjectSchema: z.ZodObject<{
    refreshIntervalMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    refreshIntervalMs: number;
}, {
    refreshIntervalMs?: number | undefined;
}>;
export declare const overlayClickSchema: z.ZodObject<{
    overlayId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    overlayId: number;
}, {
    overlayId: number;
}>;
export declare const overlayGetSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const visionStartSchema: z.ZodObject<{
    intervalMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    intervalMs: number;
}, {
    intervalMs?: number | undefined;
}>;
export declare const visionStopSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const extractSchema: z.ZodObject<{
    selector: z.ZodString;
    format: z.ZodDefault<z.ZodEnum<["json", "csv", "markdown", "html"]>>;
}, "strip", z.ZodTypeAny, {
    format: "json" | "csv" | "markdown" | "html";
    selector: string;
}, {
    selector: string;
    format?: "json" | "csv" | "markdown" | "html" | undefined;
}>;
export declare const waitSchema: z.ZodObject<{
    selector: z.ZodString;
    timeoutMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    selector: string;
    timeoutMs: number;
}, {
    selector: string;
    timeoutMs?: number | undefined;
}>;
export declare const scrollSchema: z.ZodObject<{
    direction: z.ZodEnum<["up", "down", "left", "right"]>;
    amount: z.ZodDefault<z.ZodNumber>;
    toElement: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    direction: "left" | "right" | "up" | "down";
    amount: number;
    toElement?: string | undefined;
}, {
    direction: "left" | "right" | "up" | "down";
    amount?: number | undefined;
    toElement?: string | undefined;
}>;
export declare const evaluateSchema: z.ZodObject<{
    expression: z.ZodString;
    returnByValue: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    expression: string;
    returnByValue: boolean;
}, {
    expression: string;
    returnByValue?: boolean | undefined;
}>;
/**
 * LLMServer - Universal MCP Server with Zod schemas
 */
export declare class LLMServer {
    private registry;
    private vision;
    private overlay;
    private hyperion;
    constructor(hyperion: Hyperion);
    /**
     * Register all built-in actions
     */
    private registerBuiltinActions;
    /**
     * Execute action by ID
     */
    executeAction(actionId: string, input: any): Promise<any>;
    /**
     * Get all action definitions
     */
    getActionDefinitions(): {
        id: string;
        name: string;
        description: string;
        schema: any;
        perception: "none" | "visual";
        category: "visual" | "navigation" | "interaction" | "extraction" | "utility";
        timeout: number;
        retry: import("../core/types").RetryPolicy | undefined;
        requiresOverlay: boolean;
        requiresVision: boolean;
    }[];
    /**
     * Get execution history
     */
    getExecutionHistory(limit?: number): import("../core/types").ActionExecution[];
    /**
     * Get server stats
     */
    getStats(): {
        actions: {
            totalExecutions: number;
            successful: number;
            failed: number;
            successRate: number;
            averageDurationMs: number;
            registeredActions: number;
        };
        vision: {
            totalFrames: number;
            isStreaming: boolean;
            lastFrameAt: number;
            totalElements: number;
            lastPlatform: string;
        };
        overlay: import("../core/types").OverlayState;
    };
}
//# sourceMappingURL=LLMServer.d.ts.map