import { Transport } from './transport';
export declare class LaunchTransport extends Transport {
    private ws;
    private chromeProcess;
    private chromePath;
    private userDataDir;
    private port;
    private resolvedWsUrl;
    constructor(options: {
        chromePath?: string;
        userDataDir?: string;
        port?: number;
    });
    private getDefaultChromePath;
    connect(): Promise<void>;
    private discoverWsUrl;
    private connectWebSocket;
    isConnected(): boolean;
    disconnect(): Promise<void>;
    protected sendRaw(payload: string): Promise<void>;
    protected onMessage(data: string): void;
}
//# sourceMappingURL=launch.d.ts.map