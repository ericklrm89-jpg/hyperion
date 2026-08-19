import { VerifiedActionResult } from './types';
export interface VerifyWithVisionParams {
    /** Description of what should be visually true if the action succeeded */
    expectedState: string;
    /** Function to capture the current screen/viewport */
    screenshotFn: () => Promise<Buffer | string>;
    /** Perception analysis function that evaluates the screenshot against the expected state */
    visionAnalyzeFn: (screenshot: Buffer | string, expectedState: string) => Promise<{
        matches: boolean;
        analysis: string;
    }>;
    /** Interval in milliseconds between polling checks (default: 1500ms) */
    pollIntervalMs?: number;
    /** Maximum time in milliseconds to wait for visual confirmation (default: 15000ms) */
    timeoutMs?: number;
}
export interface VerificationResult {
    verified: boolean;
    evidence?: {
        screenshotBase64?: string;
        visionAnalysis: string;
        timestamp: string;
    };
    error?: string;
}
/**
 * Generic vision verification with reactive polling.
 * Prevents action self-deception by requiring actual visual proof before declaring success.
 */
export declare function verifyWithVision(params: VerifyWithVisionParams): Promise<VerificationResult>;
/**
 * Creates a standard VerifiedActionResult from a verification result
 */
export declare function createVerifiedActionResult(verification: VerificationResult, extra?: {
    url?: string;
    publishedAt?: string;
}): VerifiedActionResult;
//# sourceMappingURL=verifyWithVision.d.ts.map