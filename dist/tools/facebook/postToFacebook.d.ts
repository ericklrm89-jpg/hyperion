import { z } from 'zod';
import { ActionDefinition } from '../../core/types';
import { ConnectionManager } from '../../connection';
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
/**
 * Action Definition for ActionRegistry
 */
export declare const postToFacebookAction: ActionDefinition<typeof postToFacebookSchema>;
/**
 * Helper to execute Facebook publishing steps via ConnectionManager
 */
export declare function executePostToFacebook(cxn: ConnectionManager, input: PostToFacebookInput): Promise<{
    success: boolean;
    url: string;
    publishedAt: string;
}>;
//# sourceMappingURL=postToFacebook.d.ts.map