import { EventEmitter } from 'events';
import { CDPError } from '../config';
export declare abstract class Transport extends EventEmitter {
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract isConnected(): boolean;
    private pending;
    private msgId;
    protected buffer: string[];
    protected getNextId(): number;
    protected registerPending(id: number, method: string): Promise<any>;
    protected resolvePending(id: number, result: any): void;
    protected rejectPending(id: number, error: CDPError): void;
    protected rejectAll(error: CDPError): void;
    call<T = any>(method: string, params?: any, retries?: number): Promise<T>;
    protected abstract sendRaw(payload: string): Promise<void>;
    protected abstract onMessage(data: string): void;
}
//# sourceMappingURL=transport.d.ts.map