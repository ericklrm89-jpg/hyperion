import { LLMServer } from './LLMServer';
/**
 * MCP Server Adapter - Connects LLMServer to MCP protocol
 */
export declare class MCPServerAdapter {
    private server;
    private llmServer;
    constructor(llmServer: LLMServer);
    /**
     * Setup MCP request handlers
     */
    private setupHandlers;
    /**
     * Convert Zod schema to JSON schema for MCP
     */
    private zodToJsonSchema;
    /**
     * Convert single field to JSON schema
     */
    private fieldToJsonSchema;
    /**
     * Start MCP server on stdio
     */
    start(): Promise<void>;
    /**
     * Stop MCP server
     */
    stop(): Promise<void>;
}
//# sourceMappingURL=MCPServerAdapter.d.ts.map