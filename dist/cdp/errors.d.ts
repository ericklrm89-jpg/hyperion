export declare const CDP_ERROR_CODES: {
    readonly NOT_IMPLEMENTED: -32000;
    readonly TARGET_CLOSED: -32001;
    readonly NOT_ATTACHED: -32002;
    readonly METHOD_NOT_FOUND: -32601;
    readonly INVALID_PARAMS: -32602;
    readonly INTERNAL_ERROR: -32603;
};
export declare function isTargetClosed(err: any): boolean;
export declare function isNotAttached(err: any): boolean;
export declare function isRetryableError(err: any): boolean;
//# sourceMappingURL=errors.d.ts.map