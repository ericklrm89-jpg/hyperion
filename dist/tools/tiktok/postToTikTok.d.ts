import { z } from 'zod';
import { ActionDefinition, VerifiedActionResult } from '../../core/types';
import { ConnectionManager } from '../../connection';
import { VerifyWithVisionParams } from '../../core/verifyWithVision';
/**
 * TikTok Video Upload Schema (Hyperion 2.1)
 */
export declare const postToTikTokSchema: z.ZodObject<{
    filePath: z.ZodString;
    caption: z.ZodOptional<z.ZodString>;
    privacy: z.ZodDefault<z.ZodEnum<["public", "friends", "private"]>>;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    privacy: "public" | "friends" | "private";
    caption?: string | undefined;
}, {
    filePath: string;
    caption?: string | undefined;
    privacy?: "public" | "friends" | "private" | undefined;
}>;
export type PostToTikTokInput = z.infer<typeof postToTikTokSchema>;
export type PostToTikTokRawInput = z.input<typeof postToTikTokSchema>;
export interface PostToTikTokOptions {
    screenshotFn?: () => Promise<Buffer | string>;
    visionAnalyzeFn?: VerifyWithVisionParams['visionAnalyzeFn'];
    pollIntervalMs?: number;
    timeoutMs?: number;
    sleepFn?: (ms: number) => Promise<void>;
}
/**
 * Action Definition for ActionRegistry
 */
export declare const postToTikTokAction: ActionDefinition<typeof postToTikTokSchema>;
/**
 * Executes TikTok video upload and publishing via ConnectionManager with reactive vision verification
 */
export declare function executePostToTikTok(cxn: ConnectionManager, rawInput: PostToTikTokRawInput, options?: PostToTikTokOptions): Promise<VerifiedActionResult>;
//# sourceMappingURL=postToTikTok.d.ts.map