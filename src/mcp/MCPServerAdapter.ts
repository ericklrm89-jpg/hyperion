import { LLMServer } from './LLMServer';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Server Adapter - Connects LLMServer to MCP protocol
 */
export class MCPServerAdapter {
  private server: Server;
  private llmServer: LLMServer;

  constructor(llmServer: LLMServer) {
    this.llmServer = llmServer;
    this.server = new Server(
      {
        name: 'hyperion-browser',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const definitions = this.llmServer.getActionDefinitions();

      const tools: Tool[] = definitions.map((def: any) => {
        // Convert Zod schema to JSON schema
        const jsonSchema = this.zodToJsonSchema(def.schema);

        return {
          name: def.id,
          description: `${def.name}\n\n${def.description}\n\nPerception: ${def.perception} | Category: ${def.category} | Timeout: ${def.timeout}ms`,
          inputSchema: jsonSchema,
        };
      });

      return { tools };
    });

    // Call tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        console.log(`[MCP] Calling tool: ${name}`, args);

        const execution = await this.llmServer.executeAction(name, args || {});

        // Return execution result
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  actionId: execution.actionId,
                  status: execution.status,
                  duration: execution.duration,
                  output: execution.output,
                },
                null,
                2
              ),
            },
            // Include before screenshot if available
            ...(execution.screenshots && execution.screenshots[0]
              ? [
                  {
                    type: 'image' as const,
                    data: execution.screenshots[0].base64,
                    mimeType: 'image/png',
                  },
                ]
              : []),
          ],
        };
      } catch (err: any) {
        console.error(`[MCP] Tool error: ${name}`, err);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error: ${err.message}`,
            },
          ],
        };
      }
    });
  }

  /**
   * Convert Zod schema to JSON schema for MCP
   */
  private zodToJsonSchema(schema: any): any {
    try {
      const description = schema.describe?.();
      if (!description) return { type: 'object', properties: {} };

      // Simple conversion
      const properties: any = {};
      const required: string[] = [];

      if (description.type === 'ZodObject' && description.shape) {
        for (const [key, field] of Object.entries(description.shape)) {
          const fieldDesc = (field as any).describe?.();
          properties[key] = this.fieldToJsonSchema(fieldDesc);
          if (!fieldDesc?.optional) required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required,
      };
    } catch (err) {
      console.warn('Schema conversion error, returning default:', err);
      return { type: 'object', properties: {} };
    }
  }

  /**
   * Convert single field to JSON schema
   */
  private fieldToJsonSchema(field: any): any {
    if (!field) return {};

    const type = field.type?.toLowerCase?.() || 'string';
    const base: any = {};

    if (field.description) base.description = field.description;

    switch (type) {
      case 'zodenum':
        base.type = 'string';
        if (field.values) base.enum = field.values;
        break;
      case 'zodobject':
        base.type = 'object';
        break;
      case 'zodnumber':
        base.type = 'number';
        break;
      case 'zodboolean':
        base.type = 'boolean';
        break;
      case 'zodunion':
        base.oneOf = [];
        break;
      default:
        base.type = 'string';
    }

    if (field.default !== undefined) base.default = field.default;

    return base;
  }

  /**
   * Start MCP server on stdio
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('[MCP] Server started on stdio');
  }

  /**
   * Stop MCP server
   */
  async stop(): Promise<void> {
    await this.server.close();
    console.log('[MCP] Server stopped');
  }
}
