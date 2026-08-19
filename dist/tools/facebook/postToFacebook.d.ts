import { z } from 'zod';
import { ActionDefinition, VerifiedActionResult } from '../../core/types';
import { ConnectionManager } from '../../connection';
import { VerifyWithVisionParams } from '../../core/verifyWithVision';
/**
 * Facebook Post / Reel Input Schema
 */
export declare const postToFacebookSchema: z.ZodObject<{
    filePath: z.ZodString;
    caption: z.ZodDefault<z.ZodString>;
    isReel: z.ZodDefault<z.ZodBoolean>;
    pageId: z.ZodOptional<z.ZodString>;
    addAiLabel: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    caption: string;
    isReel: boolean;
    addAiLabel: boolean;
    pageId?: string | undefined;
}, {
    filePath: string;
    caption?: string | undefined;
    isReel?: boolean | undefined;
    pageId?: string | undefined;
    addAiLabel?: boolean | undefined;
}>;
export type PostToFacebookInput = z.infer<typeof postToFacebookSchema>;
export type PostToFacebookRawInput = z.input<typeof postToFacebookSchema>;
export interface PostToFacebookOptions {
    screenshotFn?: () => Promise<Buffer | string>;
    visionAnalyzeFn?: VerifyWithVisionParams['visionAnalyzeFn'];
    pollIntervalMs?: number;
    timeoutMs?: number;
    sleepFn?: (ms: number) => Promise<void>;
}
/**
 * Action Definition for ActionRegistry
 */
export declare const postToFacebookAction: ActionDefinition<typeof postToFacebookSchema>;
/**
 * Helper to execute Facebook publishing steps via ConnectionManager with reactive vision verification
 */
export declare function executePostToFacebook(cxn: ConnectionManager, rawInput: PostToFacebookRawInput, options?: PostToFacebookOptions): Promise<VerifiedActionResult>;
//# sourceMappingURL=postToFacebook.d.ts.map