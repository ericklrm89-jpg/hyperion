export type ConnectionMode = 'extension' | 'launch' | 'attach';
export interface HyperionConfig {
    mode: ConnectionMode;
    chromePath?: string;
    chromeProfile?: string;
    debugPort?: number;
    websocketUrl?: string;
    extensionId?: string;
    tabId?: string;
    mcpPort?: number;
    mcpStdio?: boolean;
    timeout: number;
    stealth: StealthConfig;
    verbose: boolean;
}
export interface StealthConfig {
    runtimeEnable: boolean;
    automationOverride: boolean;
    focusEmulation: boolean;
    zeroJSPatches: boolean;
    userAgent?: string;
}
export declare const DEFAULT_CONFIG: HyperionConfig;
export interface CDPResponse<T = any> {
    result?: T;
    error?: CDPError;
    sessionId?: string;
}
export interface CDPError {
    code: number;
    message: string;
    data?: any;
}
export declare class TimeoutError extends Error {
    constructor(method: string, ms: number);
}
export declare class TargetClosedError extends Error {
    constructor();
}
export declare class NotAttachedError extends Error {
    constructor();
}
//# sourceMappingURL=config.d.ts.map