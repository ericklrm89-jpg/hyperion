import { verifyWithVision, createVerifiedActionResult } from '../../src/core/verifyWithVision';

describe('verifyWithVision - Unit Tests (Anti-Self-Deception)', () => {
  it('should verify immediately when first check matches', async () => {
    const screenshotFn = jest.fn().mockResolvedValue('mock-screenshot-base64');
    const visionAnalyzeFn = jest.fn().mockResolvedValue({
      matches: true,
      analysis: 'Post successfully rendered in feed',
    });

    const result = await verifyWithVision({
      expectedState: 'Post in feed',
      screenshotFn,
      visionAnalyzeFn,
      pollIntervalMs: 50,
      timeoutMs: 1000,
    });

    expect(result.verified).toBe(true);
    expect(result.evidence?.visionAnalysis).toBe('Post successfully rendered in feed');
    expect(result.evidence?.screenshotBase64).toBe('mock-screenshot-base64');
    expect(screenshotFn).toHaveBeenCalledTimes(1);
    expect(visionAnalyzeFn).toHaveBeenCalledTimes(1);

    const actionResult = createVerifiedActionResult(result, { url: 'https://example.com' });
    expect(actionResult.success).toBe(true);
    expect(actionResult.verified).toBe(true);
    expect(actionResult.verificationMethod).toBe('vision');
  });

  it('should poll multiple times until condition matches', async () => {
    let callCount = 0;
    const screenshotFn = jest.fn().mockResolvedValue(Buffer.from('test-screenshot'));
    const visionAnalyzeFn = jest.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        return { matches: false, analysis: `Still loading (attempt ${callCount})` };
      }
      return { matches: true, analysis: 'Loaded successfully on attempt 3' };
    });

    const result = await verifyWithVision({
      expectedState: 'Success state',
      screenshotFn,
      visionAnalyzeFn,
      pollIntervalMs: 50,
      timeoutMs: 2000,
    });

    expect(result.verified).toBe(true);
    expect(callCount).toBe(3);
    expect(result.evidence?.visionAnalysis).toBe('Loaded successfully on attempt 3');
  });

  it('should fail and return evidence when timeout is reached without match', async () => {
    const screenshotFn = jest.fn().mockResolvedValue('last-screen-base64');
    const visionAnalyzeFn = jest.fn().mockResolvedValue({
      matches: false,
      analysis: 'Dialog still open, nothing published',
    });

    const result = await verifyWithVision({
      expectedState: 'Feed updated',
      screenshotFn,
      visionAnalyzeFn,
      pollIntervalMs: 40,
      timeoutMs: 150,
    });

    expect(result.verified).toBe(false);
    expect(result.error).toContain('timed out');
    expect(result.evidence?.visionAnalysis).toBe('Dialog still open, nothing published');
    expect(result.evidence?.screenshotBase64).toBe('last-screen-base64');

    const actionResult = createVerifiedActionResult(result);
    expect(actionResult.success).toBe(false);
    expect(actionResult.verified).toBe(false);
    expect(actionResult.error).toContain('timed out');
  });
});
