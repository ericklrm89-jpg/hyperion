import { z } from 'zod';
import { ActionDefinition, VerifiedActionResult } from '../../core/types';
import { ConnectionManager } from '../../connection';
import { VerifyWithVisionParams } from '../../core/verifyWithVision';
/**
 * WhatsApp Outbound Action Schema (Hyperion 2.1)
 */
export declare const sendWhatsAppSchema: z.ZodObject<{
    phone: z.ZodString;
    message: z.ZodString;
    mediaPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    phone: string;
    mediaPath?: string | undefined;
}, {
    message: string;
    phone: string;
    mediaPath?: string | undefined;
}>;
export type SendWhatsAppInput = z.infer<typeof sendWhatsAppSchema>;
export type SendWhatsAppRawInput = z.input<typeof sendWhatsAppSchema>;
export interface SendWhatsAppOptions {
    screenshotFn?: () => Promise<Buffer | string>;
    visionAnalyzeFn?: VerifyWithVisionParams['visionAnalyzeFn'];
    pollIntervalMs?: number;
    timeoutMs?: number;
    sleepFn?: (ms: number) => Promise<void>;
}
/**
 * Action Definition for ActionRegistry
 */
export declare const sendWhatsAppAction: ActionDefinition<typeof sendWhatsAppSchema>;
/**
 * Executes the complete WhatsApp send workflow natively via ConnectionManager
 */
export declare function executeSendWhatsApp(cxn: ConnectionManager, rawInput: SendWhatsAppRawInput, options?: SendWhatsAppOptions): Promise<VerifiedActionResult>;
//# sourceMappingURL=sendWhatsApp.d.ts.map