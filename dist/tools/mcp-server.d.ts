import { Hyperion } from '../hyperion';
export declare class MCPServer {
    private server;
    private hyperion;
    constructor(hyperion: Hyperion);
    private setupHandlers;
    start(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=mcp-server.d.ts.map