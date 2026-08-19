import { LLMServer } from './LLMServer';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../core/logger';

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
        logger.info({ tool: name, args }, `[MCP] Calling tool: ${name}`);

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
        logger.error({ err, tool: name }, `[MCP] Tool error: ${name}`);
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
   * Convert Zod schema to JSON schema
   */
  private zodToJsonSchema(schema: any): any {
    try {
      if (!schema || !schema._def) {
        return { type: 'object', properties: {} };
      }

      const shape = schema._def.shape?.() || {};
      const properties: any = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const field = value as any;
        properties[key] = this.fieldToJsonSchema(field);

        if (!field.isOptional?.()) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required,
      };
    } catch (err) {
      logger.warn({ err }, 'Schema conversion error, returning default');
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
    logger.info('[MCP] Server started on stdio');
  }

  /**
   * Stop MCP server
   */
  async stop(): Promise<void> {
    await this.server.close();
    logger.info('[MCP] Server stopped');
  }
}
