import { sendWhatsAppSchema, sendWhatsAppAction, executeSendWhatsApp } from '../../src/tools/whatsapp/sendWhatsApp';
import { ActionRegistry } from '../../src/core/ActionRegistry';

describe('WhatsApp Send Action - Unit Tests (Capa Manus & Anti-Self-Deception)', () => {
  it('should validate valid phone and message', () => {
    const parsed = sendWhatsAppSchema.parse({
      phone: '+593998098229',
      message: 'Hola, te presento la propuesta.',
    });

    expect(parsed.phone).toBe('+593998098229');
    expect(parsed.message).toBe('Hola, te presento la propuesta.');
    expect(parsed.mediaPath).toBeUndefined();
  });

  it('should register successfully in ActionRegistry', () => {
    const registry = new ActionRegistry();
    registry.register(sendWhatsAppAction);

    const definitions = registry.getDefinitions();
    const action = definitions.find(d => d.id === 'whatsapp-send');

    expect(action).toBeDefined();
    expect(action?.name).toBe('Send WhatsApp (Text, Media & Zero-Draft)');
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

    const result = await executeSendWhatsApp(
      mockCxn,
      { phone: '+593998098229', message: 'Test message' },
      {
        screenshotFn: async () => 'fake-screenshot',
        visionAnalyzeFn: async () => ({
          matches: true,
          analysis: 'Checkmark (✓✓) confirmed in thread',
        }),
        sleepFn: async () => {},
        pollIntervalMs: 50,
        timeoutMs: 500,
      }
    );

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.verificationMethod).toBe('vision');
    expect(result.evidence?.visionAnalysis).toContain('Checkmark');
  });
});
