import { sendGmailSchema, sendGmailAction, executeSendGmail } from '../../src/tools/gmail/sendGmail';
import { ActionRegistry } from '../../src/core/ActionRegistry';

describe('Gmail Send Action - Unit Tests (Capa Manus & Anti-Self-Deception)', () => {
  it('should validate valid recipient, subject and bodyHtml', () => {
    const parsed = sendGmailSchema.parse({
      recipient: 'cliente@empresa.com',
      subject: 'Propuesta B2B',
      bodyHtml: '<h1>Propuesta</h1><p>Adjunto detalles.</p>',
    });

    expect(parsed.recipient).toBe('cliente@empresa.com');
    expect(parsed.subject).toBe('Propuesta B2B');
    expect(parsed.attachmentPath).toBeUndefined();
  });

  it('should register successfully in ActionRegistry', () => {
    const registry = new ActionRegistry();
    registry.register(sendGmailAction);

    const definitions = registry.getDefinitions();
    const action = definitions.find(d => d.id === 'gmail-send');

    expect(action).toBeDefined();
    expect(action?.name).toBe('Send Gmail (HTML & Attachments)');
  });

  it('should execute with Capa Manus and return verified: true on success', async () => {
    const mockCxn = {
      call: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn().mockImplementation((code) => {
        if (typeof code === 'string' && code.includes('typeof window.__hyData')) {
          return Promise.resolve({ value: true });
        }
        return Promise.resolve({ value: true });
      }),
      dispatchKeyEvent: jest.fn().mockResolvedValue({}),
    } as any;

    const result = await executeSendGmail(
      mockCxn,
      {
        recipient: 'cliente@empresa.com',
        subject: 'Propuesta',
        bodyHtml: '<p>Hola</p>',
      },
      {
        screenshotFn: async () => 'fake-screenshot',
        visionAnalyzeFn: async () => ({
          matches: true,
          analysis: 'Gmail composer closed and "Message sent" toast notification confirmed',
        }),
        sleepFn: async () => {},
        pollIntervalMs: 50,
        timeoutMs: 500,
      }
    );

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.verificationMethod).toBe('vision');
    expect(result.evidence?.visionAnalysis).toContain('Message sent');
  });
});
