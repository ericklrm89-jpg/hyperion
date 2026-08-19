import { postToInstagramSchema, postToInstagramAction, executePostToInstagram } from '../../src/tools/instagram/postToInstagram';
import { ActionRegistry } from '../../src/core/ActionRegistry';

describe('Instagram Post Action - Unit Tests (Capa Manus & Anti-Self-Deception)', () => {
  it('should validate valid schema inputs for photo post and reel', () => {
    const photoInput = postToInstagramSchema.parse({
      filePath: 'C:\\FairDraw\\fairdraw-social\\assets\\post_final.png',
      caption: 'Giveaways you can trust. fairdrawapp.com #FairDraw',
      isReel: false,
    });
    expect(photoInput.filePath).toBe('C:\\FairDraw\\fairdraw-social\\assets\\post_final.png');
    expect(photoInput.isReel).toBe(false);

    const reelInput = postToInstagramSchema.parse({
      filePath: 'C:\\FairDraw\\fairdraw-social\\assets\\post_final.mp4',
      caption: 'Giveaways you can trust. fairdrawapp.com #FairDraw',
      isReel: true,
    });
    expect(reelInput.isReel).toBe(true);
  });

  it('should register successfully in ActionRegistry', () => {
    const registry = new ActionRegistry();
    registry.register(postToInstagramAction);

    const definitions = registry.getDefinitions();
    const action = definitions.find(d => d.id === 'instagram-post');

    expect(action).toBeDefined();
    expect(action?.name).toBe('Post to Instagram');
  });

  it('should execute with Capa Manus and return verified: true on success', async () => {
    const mockCxn = {
      call: jest.fn().mockImplementation((method: string) => {
        if (method === 'DOM.getDocument') {
          return Promise.resolve({ root: { nodeId: 1 } });
        }
        if (method === 'DOM.querySelector') {
          return Promise.resolve({ nodeId: 42 });
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

    const result = await executePostToInstagram(
      mockCxn,
      {
        filePath: 'C:\\FairDraw\\fairdraw-social\\assets\\post_final.png',
        caption: 'Test post',
        isReel: false,
      },
      {
        screenshotFn: async () => 'fake-screenshot',
        visionAnalyzeFn: async () => ({
          matches: true,
          analysis: 'Instagram upload completed and modal closed / confirmation text detected',
        }),
        sleepFn: async () => {},
        pollIntervalMs: 50,
        timeoutMs: 500,
      }
    );

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.verificationMethod).toBe('vision');
    expect(result.evidence?.visionAnalysis).toContain('Instagram upload completed');
  });
});
