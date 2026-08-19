"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWithVision = verifyWithVision;
exports.createVerifiedActionResult = createVerifiedActionResult;
const logger_1 = require("./logger");
/**
 * Generic vision verification with reactive polling.
 * Prevents action self-deception by requiring actual visual proof before declaring success.
 */
async function verifyWithVision(params) {
    const { expectedState, screenshotFn, visionAnalyzeFn, pollIntervalMs = 1500, timeoutMs = 15000, } = params;
    const startTime = Date.now();
    let attempt = 0;
    let lastEvidence;
    let lastAnalysis = '';
    logger_1.logger.info({ expectedState, timeoutMs, pollIntervalMs }, '[VerifyWithVision] Starting reactive visual verification');
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
                logger_1.logger.info({ attempt, elapsedMs, analysis: analysisResult.analysis }, '[VerifyWithVision] ✓ Visual state verified successfully');
                return {
                    verified: true,
                    evidence: lastEvidence,
                };
            }
            logger_1.logger.debug({ attempt, elapsedMs: Date.now() - startTime, analysis: analysisResult.analysis }, '[VerifyWithVision] Visual check did not match yet, polling...');
        }
        catch (err) {
            logger_1.logger.warn({ attempt, err: err.message }, '[VerifyWithVision] Error during vision poll attempt');
            lastAnalysis = `Error during check: ${err.message}`;
        }
        const elapsed = Date.now() - checkStart;
        const remainingSleep = Math.max(100, pollIntervalMs - elapsed);
        await new Promise((r) => setTimeout(r, remainingSleep));
    }
    const totalElapsedMs = Date.now() - startTime;
    const timeoutError = `Visual confirmation timed out after ${totalElapsedMs}ms. Expected: "${expectedState}". Last analysis: "${lastAnalysis}"`;
    logger_1.logger.error({ totalElapsedMs, expectedState, lastAnalysis }, '[VerifyWithVision] ✗ Verification failed');
    return {
        verified: false,
        evidence: lastEvidence,
        error: timeoutError,
    };
}
/**
 * Creates a standard VerifiedActionResult from a verification result
 */
function createVerifiedActionResult(verification, extra = {}) {
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
//# sourceMappingURL=verifyWithVision.js.map