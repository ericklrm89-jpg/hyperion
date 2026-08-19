import { promptGeminiSchema, promptGeminiAction, executePromptGemini } from '../../src/tools/gemini/promptGemini';
import { ActionRegistry } from '../../src/core/ActionRegistry';

describe('Gemini Prompt Action - Unit Tests (Capa Manus & Anti-Self-Deception)', () => {
  it('should validate valid schema inputs for text and image attachments', () => {
    const input = promptGeminiSchema.parse({
      prompt: 'Generate an engaging giveaway video script for FairDraw',
      imagePaths: ['C:\\FairDraw\\fairdraw-social\\assets\\logos\\logo_real.png'],
    });
    expect(input.prompt).toContain('FairDraw');
    expect(input.imagePaths?.length).toBe(1);
  });

  it('should register successfully in ActionRegistry', () => {
    const registry = new ActionRegistry();
    registry.register(promptGeminiAction);

    const definitions = registry.getDefinitions();
    const action = definitions.find(d => d.id === 'gemini-prompt');

    expect(action).toBeDefined();
    expect(action?.name).toBe('Prompt Gemini Web (Text & Images)');
  });

  it('should execute with Capa Manus and return verified: true on completed response', async () => {
    const mockCxn = {
      call: jest.fn().mockImplementation((method: string) => {
        if (method === 'DOM.getDocument') {
          return Promise.resolve({ root: { nodeId: 1 } });
        }
        if (method === 'DOM.querySelector') {
          return Promise.resolve({ nodeId: 99 });
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

    const result = await executePromptGemini(
      mockCxn,
      {
        prompt: 'Create image for FairDraw',
      },
      {
        screenshotFn: async () => 'fake-screenshot',
        visionAnalyzeFn: async () => ({
          matches: true,
          analysis: 'Gemini completed response generation and output is visible in chat stream',
        }),
        sleepFn: async () => {},
        pollIntervalMs: 50,
        timeoutMs: 500,
      }
    );

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.verificationMethod).toBe('vision');
    expect(result.evidence?.visionAnalysis).toContain('Gemini completed response');
  });
});
