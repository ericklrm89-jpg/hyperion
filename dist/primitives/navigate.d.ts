import { ConnectionManager } from '../connection';
export type WaitUntil = 'load' | 'DOMContentLoaded' | 'networkIdle' | 'networkAlmostIdle';
export interface NavigateOptions {
    url?: string;
    waitUntil?: WaitUntil;
    timeout?: number;
    referrer?: string;
    waitForStableDOM?: boolean;
}
export declare class NavigatePrimitive {
    private cxn;
    private lifecycleEmitter;
    constructor(cxn: ConnectionManager);
    private setupListeners;
    navigate(options: NavigateOptions): Promise<{
        frameId: string;
        loaderId?: string;
    }>;
    waitForNavigation(waitUntil: WaitUntil, timeout?: number): Promise<void>;
    waitForSelector(selector: string, timeout?: number): Promise<boolean>;
    waitForText(text: string, timeout?: number): Promise<boolean>;
    waitForNetworkIdle(idleMs?: number, timeout?: number): Promise<void>;
    private waitForEvent;
    private waitForLifecycleEvent;
    private waitForStableDOM;
}
//# sourceMappingURL=navigate.d.ts.map