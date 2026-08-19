import { z } from 'zod';
import { ActionDefinition, VerifiedActionResult } from '../../core/types';
import { ConnectionManager } from '../../connection';
import { VerifyWithVisionParams } from '../../core/verifyWithVision';
/**
 * Gmail Outbound Action Schema (Hyperion 2.1)
 */
export declare const sendGmailSchema: z.ZodObject<{
    recipient: z.ZodString;
    subject: z.ZodString;
    bodyHtml: z.ZodString;
    attachmentPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    recipient: string;
    subject: string;
    bodyHtml: string;
    attachmentPath?: string | undefined;
}, {
    recipient: string;
    subject: string;
    bodyHtml: string;
    attachmentPath?: string | undefined;
}>;
export type SendGmailInput = z.infer<typeof sendGmailSchema>;
export type SendGmailRawInput = z.input<typeof sendGmailSchema>;
export interface SendGmailOptions {
    screenshotFn?: () => Promise<Buffer | string>;
    visionAnalyzeFn?: VerifyWithVisionParams['visionAnalyzeFn'];
    pollIntervalMs?: number;
    timeoutMs?: number;
    sleepFn?: (ms: number) => Promise<void>;
}
/**
 * Action Definition for ActionRegistry
 */
export declare const sendGmailAction: ActionDefinition<typeof sendGmailSchema>;
/**
 * Executes the complete Gmail send workflow natively via ConnectionManager
 */
export declare function executeSendGmail(cxn: ConnectionManager, rawInput: SendGmailRawInput, options?: SendGmailOptions): Promise<VerifiedActionResult>;
//# sourceMappingURL=sendGmail.d.ts.map