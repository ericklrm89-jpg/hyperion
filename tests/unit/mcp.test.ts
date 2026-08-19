import { LLMServer } from '../../src/mcp/LLMServer';
import { MCPServerAdapter } from '../../src/mcp/MCPServerAdapter';

describe('MCP Server Integration - Real Action Registration Tests', () => {
  let mockHyperion: any;
  let llmServer: LLMServer;

  beforeEach(() => {
    mockHyperion = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      navigate: { to: jest.fn().mockResolvedValue(undefined) },
      click: { click: jest.fn().mockResolvedValue(undefined) },
      type: { type: jest.fn().mockResolvedValue(undefined) },
      screenshot: { capture: jest.fn().mockResolvedValue(Buffer.from('img')) },
      eval: jest.fn().mockResolvedValue({ value: 'Test Title' }),
      getPageURL: jest.fn().mockResolvedValue('https://example.com'),
      connection: {
        call: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockResolvedValue({ value: true }),
        dispatchKeyEvent: jest.fn().mockResolvedValue({}),
      },
    };

    llmServer = new LLMServer(mockHyperion);
  });

  it('should register all built-in actions in the ActionRegistry', () => {
    const definitions = llmServer.getActionDefinitions();
    const actionIds = definitions.map((d: any) => d.id);

    expect(actionIds).toContain('facebook-post');
    expect(actionIds).toContain('whatsapp-send');
    expect(actionIds).toContain('gmail-send');
    expect(actionIds).toContain('overlay-click');
    expect(actionIds).toContain('vision-start');
    expect(actionIds).toContain('screenshot');
    expect(definitions.length).toBeGreaterThanOrEqual(10);
  });

  it('should instantiate MCPServerAdapter and configure stdio server', () => {
    const adapter = new MCPServerAdapter(llmServer);
    expect(adapter).toBeDefined();
    expect(typeof (adapter as any).zodToJsonSchema).toBe('function');
  });

  it('should convert Zod schema to valid JSON schema for MCP tools', () => {
    const adapter = new MCPServerAdapter(llmServer);
    const definitions = llmServer.getActionDefinitions();
    const fbDef = definitions.find((d: any) => d.id === 'facebook-post');

    expect(fbDef).toBeDefined();
    if (!fbDef) throw new Error('facebook-post not found');

    const jsonSchema = (adapter as any).zodToJsonSchema(fbDef.schema);

    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.properties).toBeDefined();
    expect(jsonSchema.properties.filePath).toBeDefined();
    expect(jsonSchema.required).toContain('filePath');
  });
});
