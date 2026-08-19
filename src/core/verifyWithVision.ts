import { VerifiedActionResult } from './types';
import { logger } from './logger';

export interface VerifyWithVisionParams {
  /** Description of what should be visually true if the action succeeded */
  expectedState: string;
  /** Function to capture the current screen/viewport */
  screenshotFn: () => Promise<Buffer | string>;
  /** Perception analysis function that evaluates the screenshot against the expected state */
  visionAnalyzeFn: (
    screenshot: Buffer | string,
    expectedState: string
  ) => Promise<{ matches: boolean; analysis: string }>;
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
export async function verifyWithVision(
  params: VerifyWithVisionParams
): Promise<VerificationResult> {
  const {
    expectedState,
    screenshotFn,
    visionAnalyzeFn,
    pollIntervalMs = 1500,
    timeoutMs = 15000,
  } = params;

  const startTime = Date.now();
  let attempt = 0;
  let lastEvidence: VerificationResult['evidence'] | undefined;
  let lastAnalysis = '';

  logger.info(
    { expectedState, timeoutMs, pollIntervalMs },
    '[VerifyWithVision] Starting reactive visual verification'
  );

  while (Date.now() - startTime < timeoutMs) {
    attempt++;
    const checkStart = Date.now();

    try {
      const rawScreenshot = await screenshotFn();
      const base64 = Buffer.isBuffer(rawScreenshot)
        ? rawScreenshot.toString('base64')
        : rawScreenshot;

      const analysisResult = await visionAnalyzeFn(rawScreenshot, expectedState);
      lastAnalysis = analysisResult.analysis;

      lastEvidence = {
        screenshotBase64: base64,
        visionAnalysis: analysisResult.analysis,
        timestamp: new Date().toISOString(),
      };

      if (analysisResult.matches) {
        const elapsedMs = Date.now() - startTime;
        logger.info(
          { attempt, elapsedMs, analysis: analysisResult.analysis },
          '[VerifyWithVision] ✓ Visual state verified successfully'
        );

        return {
          verified: true,
          evidence: lastEvidence,
        };
      }

      logger.debug(
        { attempt, elapsedMs: Date.now() - startTime, analysis: analysisResult.analysis },
        '[VerifyWithVision] Visual check did not match yet, polling...'
      );
    } catch (err: any) {
      logger.warn(
        { attempt, err: err.message },
        '[VerifyWithVision] Error during vision poll attempt'
      );
      lastAnalysis = `Error during check: ${err.message}`;
    }

    const elapsed = Date.now() - checkStart;
    const remainingSleep = Math.max(100, pollIntervalMs - elapsed);
    await new Promise((r) => setTimeout(r, remainingSleep));
  }

  const totalElapsedMs = Date.now() - startTime;
  const timeoutError = `Visual confirmation timed out after ${totalElapsedMs}ms. Expected: "${expectedState}". Last analysis: "${lastAnalysis}"`;

  logger.error({ totalElapsedMs, expectedState, lastAnalysis }, '[VerifyWithVision] ✗ Verification failed');

  return {
    verified: false,
    evidence: lastEvidence,
    error: timeoutError,
  };
}

/**
 * Creates a standard VerifiedActionResult from a verification result
 */
export function createVerifiedActionResult(
  verification: VerificationResult,
  extra: { url?: string; publishedAt?: string } = {}
): VerifiedActionResult {
  return {
    success: verification.verified,
    verified: verification.verified,
    verificationMethod: 'vision',
    evidence: verification.evidence,
    error: verification.error,
    url: extra.url,
    publishedAt: verification.verified ? extra.publishedAt || new Date().toISOString() : undefined,
  };
}
