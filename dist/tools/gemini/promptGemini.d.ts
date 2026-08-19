import { z } from 'zod';
import { ActionDefinition, VerifiedActionResult } from '../../core/types';
import { ConnectionManager } from '../../connection';
import { VerifyWithVisionParams } from '../../core/verifyWithVision';
/**
 * Gemini Web Prompt & Media Generation Schema
 */
export declare const promptGeminiSchema: z.ZodObject<{
    prompt: z.ZodString;
    imagePaths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    imagePaths?: string[] | undefined;
}, {
    prompt: string;
    imagePaths?: string[] | undefined;
}>;
export type PromptGeminiInput = z.infer<typeof promptGeminiSchema>;
export type PromptGeminiRawInput = z.input<typeof promptGeminiSchema>;
export interface PromptGeminiOptions {
    screenshotFn?: () => Promise<Buffer | string>;
    visionAnalyzeFn?: VerifyWithVisionParams['visionAnalyzeFn'];
    pollIntervalMs?: number;
    timeoutMs?: number;
    sleepFn?: (ms: number) => Promise<void>;
}
/**
 * Action Definition for ActionRegistry
 */
export declare const promptGeminiAction: ActionDefinition<typeof promptGeminiSchema>;
/**
 * Executes prompt and attachment submission in Gemini Web with reactive verification
 */
export declare function executePromptGemini(cxn: ConnectionManager, rawInput: PromptGeminiRawInput, options?: PromptGeminiOptions): Promise<VerifiedActionResult>;
//# sourceMappingURL=promptGemini.d.ts.map