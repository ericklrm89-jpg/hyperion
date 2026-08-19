"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServerAdapter = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const logger_1 = require("../core/logger");
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
                logger_1.logger.info({ tool: name, args }, `[MCP] Calling tool: ${name}`);
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
                logger_1.logger.error({ err, tool: name }, `[MCP] Tool error: ${name}`);
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
    zodToJsonSchema(schema) {
        try {
            if (!schema || !schema._def) {
                return { type: 'object', properties: {} };
            }
            const shape = schema._def.shape?.() || {};
            const properties = {};
            const required = [];
            for (const [key, value] of Object.entries(shape)) {
                const field = value;
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
        }
        catch (err) {
            logger_1.logger.warn({ err }, 'Schema conversion error, returning default');
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
        logger_1.logger.info('[MCP] Server started on stdio');
    }
    /**
     * Stop MCP server
     */
    async stop() {
        await this.server.close();
        logger_1.logger.info('[MCP] Server stopped');
    }
}
exports.MCPServerAdapter = MCPServerAdapter;
//# sourceMappingURL=MCPServerAdapter.js.map