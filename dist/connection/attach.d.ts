import { Transport } from './transport';
export declare class AttachTransport extends Transport {
    private wsUrl;
    private ws;
    constructor(wsUrl: string);
    connect(): Promise<void>;
    isConnected(): boolean;
    disconnect(): Promise<void>;
    protected sendRaw(payload: string): Promise<void>;
    protected onMessage(data: string): void;
}
//# sourceMappingURL=attach.d.ts.map