import { postToFacebookSchema, postToFacebookAction, executePostToFacebook } from '../../src/tools/facebook/postToFacebook';
import { ActionRegistry } from '../../src/core/ActionRegistry';

describe('Facebook Post Action - Unit Tests', () => {
  it('should validate valid inputs with defaults', () => {
    const parsed = postToFacebookSchema.parse({
      filePath: '/path/to/video.mp4',
    });

    expect(parsed.filePath).toBe('/path/to/video.mp4');
    expect(parsed.caption).toBe('');
    expect(parsed.isReel).toBe(false);
    expect(parsed.addAiLabel).toBe(true);
  });

  it('should validate full inputs correctly', () => {
    const input = {
      filePath: 'C:/assets/photo.jpg',
      caption: 'Awesome test giveaway! #giveaway',
      isReel: true,
      pageId: '123456789',
      addAiLabel: false,
    };

    const parsed = postToFacebookSchema.parse(input);
    expect(parsed).toEqual(input);
  });

  it('should reject missing filePath', () => {
    expect(() => {
      postToFacebookSchema.parse({});
    }).toThrow();
  });

  it('should register successfully in ActionRegistry and execute action', async () => {
    const registry = new ActionRegistry();
    registry.register(postToFacebookAction);

    const definitions = registry.getDefinitions();
    const fbAction = definitions.find(d => d.id === 'facebook-post');

    expect(fbAction).toBeDefined();
    expect(fbAction?.name).toBe('Post to Facebook');
    expect(fbAction?.category).toBe('interaction');

    // Test execution through ActionRegistry
    const execution = await registry.execute(
      'facebook-post',
      { filePath: '/dummy/path.mp4', caption: 'Test' },
      async (validated) => {
        return {
          success: true,
          verified: true,
          verificationMethod: 'vision' as const,
          filePath: validated.filePath,
          caption: validated.caption,
        };
      }
    );

    expect(execution.status).toBe('success');
    expect(execution.output.success).toBe(true);
    expect(execution.output.verified).toBe(true);
    expect(execution.output.filePath).toBe('/dummy/path.mp4');
  });

  it('should return success: false, verified: false when visual confirmation fails (Anti-Self-Deception)', async () => {
    const mockCxn = {
      call: jest.fn().mockImplementation((method) => {
        if (method === 'Page.enable') return Promise.resolve({});
        if (method === 'DOM.getDocument') return Promise.resolve({ root: { nodeId: 1 } });
        if (method === 'DOM.querySelector') return Promise.resolve({ nodeId: 2 });
        if (method === 'DOM.describeNode') return Promise.resolve({ node: { backendNodeId: 100 } });
        if (method === 'DOM.setFileInputFiles') return Promise.resolve({});
        if (method === 'Page.captureScreenshot') return Promise.resolve({ data: 'iVBORw0KGgoAAAANSUhEUg==' });
        return Promise.resolve({});
      }),
      evaluate: jest.fn().mockResolvedValue({ value: {} }),
      dispatchKeyEvent: jest.fn().mockResolvedValue({}),
    } as any;

    const result = await executePostToFacebook(
      mockCxn,
      { filePath: '/assets/sample.mp4', caption: 'Test Reel', isReel: false },
      {
        screenshotFn: async () => 'fake-screenshot-base64',
        visionAnalyzeFn: async () => ({
          matches: false,
          analysis: 'Composer modal is still open and upload is stuck',
        }),
        sleepFn: async () => {},
        pollIntervalMs: 50,
        timeoutMs: 150,
      }
    );

    expect(result.success).toBe(false);
    expect(result.verified).toBe(false);
    expect(result.verificationMethod).toBe('vision');
    expect(result.evidence).toBeDefined();
    expect(result.evidence?.visionAnalysis).toContain('stuck');
    expect(result.error).toContain('timed out');
  });

  it('should return success: true, verified: true when visual confirmation succeeds', async () => {
    const mockCxn = {
      call: jest.fn().mockImplementation((method) => {
        if (method === 'Page.enable') return Promise.resolve({});
        if (method === 'DOM.getDocument') return Promise.resolve({ root: { nodeId: 1 } });
        if (method === 'DOM.querySelector') return Promise.resolve({ nodeId: 2 });
        if (method === 'DOM.describeNode') return Promise.resolve({ node: { backendNodeId: 100 } });
        if (method === 'DOM.setFileInputFiles') return Promise.resolve({});
        if (method === 'Page.captureScreenshot') return Promise.resolve({ data: 'iVBORw0KGgoAAAANSUhEUg==' });
        return Promise.resolve({});
      }),
      evaluate: jest.fn().mockResolvedValue({ value: {} }),
      dispatchKeyEvent: jest.fn().mockResolvedValue({}),
    } as any;

    const result = await executePostToFacebook(
      mockCxn,
      { filePath: '/assets/sample.mp4', caption: 'Test Reel', isReel: false },
      {
        screenshotFn: async () => 'fake-screenshot-base64',
        visionAnalyzeFn: async () => ({
          matches: true,
          analysis: 'Composer closed, post visible at top of feed',
        }),
        sleepFn: async () => {},
        pollIntervalMs: 50,
        timeoutMs: 500,
      }
    );

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.verificationMethod).toBe('vision');
    expect(result.evidence?.visionAnalysis).toContain('visible at top of feed');
    expect(result.publishedAt).toBeDefined();
  });
});
