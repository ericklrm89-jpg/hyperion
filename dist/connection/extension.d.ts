import { Transport } from './transport';
export declare class ExtensionTransport extends Transport {
    private hostPath;
    private process;
    private connected;
    constructor(hostPath: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    protected sendRaw(payload: string): Promise<void>;
    protected onMessage(data: string): void;
}
//# sourceMappingURL=extension.d.ts.map