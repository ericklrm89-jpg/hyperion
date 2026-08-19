import { postToTikTokSchema, postToTikTokAction, executePostToTikTok } from '../../src/tools/tiktok/postToTikTok';
import { ActionRegistry } from '../../src/core/ActionRegistry';

describe('TikTok Post Action - Unit Tests (Capa Manus & Anti-Self-Deception)', () => {
  it('should validate valid schema inputs for video upload', () => {
    const input = postToTikTokSchema.parse({
      filePath: 'C:\\FairDraw\\fairdraw-social\\assets\\post_final.mp4',
      caption: 'Giveaways you can trust. fairdrawapp.com #FairDraw',
      privacy: 'public',
    });
    expect(input.filePath).toBe('C:\\FairDraw\\fairdraw-social\\assets\\post_final.mp4');
    expect(input.privacy).toBe('public');
  });

  it('should register successfully in ActionRegistry', () => {
    const registry = new ActionRegistry();
    registry.register(postToTikTokAction);

    const definitions = registry.getDefinitions();
    const action = definitions.find(d => d.id === 'tiktok-post');

    expect(action).toBeDefined();
    expect(action?.name).toBe('Post to TikTok');
  });

  it('should execute with Capa Manus and return verified: true on success', async () => {
    const mockCxn = {
      call: jest.fn().mockImplementation((method: string) => {
        if (method === 'DOM.getDocument') {
          return Promise.resolve({ root: { nodeId: 1 } });
        }
        if (method === 'DOM.querySelector') {
          return Promise.resolve({ nodeId: 88 });
        }
        return Promise.resolve({});
      }),
      evaluate: jest.fn().mockImplementation((code: string) => {
        if (typeof code === 'string' && code.includes('typeof window.__hyData')) {
          return Promise.resolve({ value: true });
        }
        return Promise.resolve({ value: true });
      }),
      screenshot: jest.fn().mockResolvedValue('fake-screenshot-base64'),
    } as any;

    const result = await executePostToTikTok(
      mockCxn,
      {
        filePath: 'C:\\FairDraw\\fairdraw-social\\assets\\post_final.mp4',
        caption: 'TikTok Promo',
        privacy: 'public',
      },
      {
        screenshotFn: async () => 'fake-screenshot',
        visionAnalyzeFn: async () => ({
          matches: true,
          analysis: 'TikTok video upload confirmed with success modal / confirmation toast',
        }),
        sleepFn: async () => {},
        pollIntervalMs: 50,
        timeoutMs: 500,
      }
    );

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.verificationMethod).toBe('vision');
    expect(result.evidence?.visionAnalysis).toContain('TikTok video upload confirmed');
  });
});
