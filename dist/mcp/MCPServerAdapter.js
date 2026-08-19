"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServerAdapter = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
/**
 * MCP Server Adapter - Connects LLMServer to MCP protocol
 */
class MCPServerAdapter {
    constructor(llmServer) {
        this.llmServer = llmServer;
        this.server = new index_js_1.Server({
            name: 'hyperion-browser',
            version: '2.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    /**
     * Setup MCP request handlers
     */
    setupHandlers() {
        // List tools
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            const definitions = this.llmServer.getActionDefinitions();
            const tools = definitions.map((def) => {
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
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                console.log(`[MCP] Calling tool: ${name}`, args);
                const execution = await this.llmServer.executeAction(name, args || {});
                // Return execution result
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                actionId: execution.actionId,
                                status: execution.status,
                                duration: execution.duration,
                                output: execution.output,
                            }, null, 2),
                        },
                        // Include before screenshot if available
                        ...(execution.screenshots && execution.screenshots[0]
                            ? [
                                {
                                    type: 'image',
                                    data: execution.screenshots[0].base64,
                                    mimeType: 'image/png',
                                },
                            ]
                            : []),
                    ],
                };
            }
            catch (err) {
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
    zodToJsonSchema(schema) {
        try {
            const description = schema.describe?.();
            if (!description)
                return { type: 'object', properties: {} };
            // Simple conversion
            const properties = {};
            const required = [];
            if (description.type === 'ZodObject' && description.shape) {
                for (const [key, field] of Object.entries(description.shape)) {
                    const fieldDesc = field.describe?.();
                    properties[key] = this.fieldToJsonSchema(fieldDesc);
                    if (!fieldDesc?.optional)
                        required.push(key);
                }
            }
            return {
                type: 'object',
                properties,
                required,
            };
        }
        catch (err) {
            console.warn('Schema conversion error, returning default:', err);
            return { type: 'object', properties: {} };
        }
    }
    /**
     * Convert single field to JSON schema
     */
    fieldToJsonSchema(field) {
        if (!field)
            return {};
        const type = field.type?.toLowerCase?.() || 'string';
        const base = {};
        if (field.description)
            base.description = field.description;
        switch (type) {
            case 'zodenum':
                base.type = 'string';
                if (field.values)
                    base.enum = field.values;
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
        if (field.default !== undefined)
            base.default = field.default;
        return base;
    }
    /**
     * Start MCP server on stdio
     */
    async start() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.log('[MCP] Server started on stdio');
    }
    /**
     * Stop MCP server
     */
    async stop() {
        await this.server.close();
        console.log('[MCP] Server stopped');
    }
}
exports.MCPServerAdapter = MCPServerAdapter;
//# sourceMappingURL=MCPServerAdapter.js.map