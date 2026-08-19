import { z } from 'zod';
import { ActionDefinition, VerifiedActionResult } from '../../core/types';
import { ConnectionManager } from '../../connection';
import { VerifyWithVisionParams } from '../../core/verifyWithVision';
/**
 * Instagram Post / Reel Input Schema
 */
export declare const postToInstagramSchema: z.ZodObject<{
    filePath: z.ZodString;
    caption: z.ZodOptional<z.ZodString>;
    isReel: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    isReel: boolean;
    caption?: string | undefined;
}, {
    filePath: string;
    caption?: string | undefined;
    isReel?: boolean | undefined;
}>;
export type PostToInstagramInput = z.infer<typeof postToInstagramSchema>;
export type PostToInstagramRawInput = z.input<typeof postToInstagramSchema>;
export interface PostToInstagramOptions {
    screenshotFn?: () => Promise<Buffer | string>;
    visionAnalyzeFn?: VerifyWithVisionParams['visionAnalyzeFn'];
    pollIntervalMs?: number;
    timeoutMs?: number;
    sleepFn?: (ms: number) => Promise<void>;
}
/**
 * Action Definition for ActionRegistry
 */
export declare const postToInstagramAction: ActionDefinition<typeof postToInstagramSchema>;
/**
 * Helper to execute Instagram publishing steps via ConnectionManager with reactive vision verification
 */
export declare function executePostToInstagram(cxn: ConnectionManager, rawInput: PostToInstagramRawInput, options?: PostToInstagramOptions): Promise<VerifiedActionResult>;
//# sourceMappingURL=postToInstagram.d.ts.map